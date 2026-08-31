import logging
from typing import Optional, List, Dict
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ai.base import AIProvider
from app.ai.providers.fallback_provider import FallbackProvider
from app.ai.providers.gemini_provider import GeminiProvider
from app.ai.schemas import ServiceRequirementExtraction, ExtractionResponse
from app.core.config import settings
from app.db.models import ServiceRequest, Skill

logger = logging.getLogger("uvicorn.error")


class AIExtractionService:
    """
    Orchestration service for AI service request intent extraction.
    Ensures that all AI outputs are strictly constrained, validated, and normalized
    against the canonical public.skills database before updating service request records.
    """

    @staticmethod
    def get_provider(provider_override: Optional[str] = None) -> AIProvider:
        """Returns the configured AIProvider instance."""
        provider_name = provider_override or getattr(settings, "AI_PROVIDER", "fallback")

        if provider_name == "gemini" and settings.AI_API_KEY:
            return GeminiProvider(api_key=settings.AI_API_KEY)

        return FallbackProvider()

    @staticmethod
    async def extract_and_update_request(
        db: Session,
        request_id: UUID | str,
        customer_id: UUID | str,
        provider: Optional[AIProvider] = None,
    ) -> ExtractionResponse:
        """
        Extracts structured requirements from the service request description,
        validates against public.skills, updates the database record, and returns the response.

        :raises HTTPException: 404 if request not found or does not belong to customer
        """
        if isinstance(request_id, str):
            try:
                request_id = UUID(request_id)
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"error_code": "REQUEST_NOT_FOUND", "message": "Service request not found"},
                )

        if isinstance(customer_id, str):
            customer_id = UUID(customer_id)

        # 1. Retrieve the service request ensuring ownership
        sr = (
            db.query(ServiceRequest)
            .filter(
                ServiceRequest.id == request_id,
                ServiceRequest.customer_id == customer_id,
            )
            .first()
        )

        if not sr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "REQUEST_NOT_FOUND", "message": "Service request not found"},
            )

        # 2. Retrieve dynamic canonical skills catalogue from database
        canonical_skills = db.query(Skill).order_by(Skill.category, Skill.name).all()
        catalogue: List[Dict[str, str]] = [
            {
                "id": str(s.id),
                "name": s.name,
                "category": s.category,
                "description": s.description or "",
            }
            for s in canonical_skills
        ]

        valid_categories = {s.category for s in canonical_skills}
        valid_skills = {s.name: s.category for s in canonical_skills}

        # 3. Execute extraction with active provider
        active_provider = provider or AIExtractionService.get_provider()
        try:
            extraction = await active_provider.extract_service_requirements(
                description=sr.raw_description,
                canonical_catalogue=catalogue,
            )
        except Exception as e:
            logger.warning(
                f"Active AI provider failed ({type(e).__name__}); falling back to deterministic extractor"
            )
            fallback = FallbackProvider()
            extraction = await fallback.extract_service_requirements(
                description=sr.raw_description,
                canonical_catalogue=catalogue,
            )

        # 4. Strict Validation & Canonical Normalization
        # Category validation
        validated_category: Optional[str] = extraction.category
        if validated_category and validated_category not in valid_categories:
            logger.info(f"AI returned non-canonical category '{validated_category}' - ignoring")
            validated_category = None

        # Skills validation
        validated_skills: List[str] = []
        for skill_name in extraction.skills:
            if skill_name in valid_skills:
                if skill_name not in validated_skills:  # Idempotent / no duplicates
                    validated_skills.append(skill_name)
            else:
                logger.info(f"AI returned non-canonical skill '{skill_name}' - safely filtered out")

        # Category inference fallback if category was missing but skills matched
        if not validated_category and validated_skills:
            validated_category = valid_skills[validated_skills[0]]

        # 5. Persist extracted structured fields (Idempotent update)
        sr.extracted_category = validated_category
        sr.extracted_skills = validated_skills
        db.commit()
        db.refresh(sr)

        # 6. Build response (preserves customer's explicit request urgency)
        return ExtractionResponse(
            request_id=sr.id,
            category=sr.extracted_category,
            skills=sr.extracted_skills or [],
            urgency=sr.urgency,
            confidence=round(extraction.confidence, 2),
        )
