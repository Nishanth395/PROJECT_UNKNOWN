import json
import logging
import httpx
from typing import List, Dict, Any
from app.ai.base import AIProvider
from app.ai.schemas import ServiceRequirementExtraction, ExtractionUrgency
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")


class GeminiProvider(AIProvider):
    """
    Google Gemini AI Provider for natural-language service requirements extraction.
    Uses structured prompt instructions constrained strictly to the dynamic canonical catalogue.
    """

    def __init__(self, api_key: str = "", model: str = "gemini-1.5-flash"):
        self.api_key = api_key or settings.AI_API_KEY
        self.model = model
        self.endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

    async def extract_service_requirements(
        self,
        description: str,
        canonical_catalogue: List[Dict[str, Any]],
    ) -> ServiceRequirementExtraction:
        if not self.api_key:
            raise ValueError("Gemini API key is not configured")

        # Format catalogue for LLM prompt
        catalogue_str = "\n".join(
            [f"- Category: {s.get('category')} | Skill: {s.get('name')} | Description: {s.get('description', '')}"
             for s in canonical_catalogue]
        )

        prompt = f"""You are an AI service classifier for a local skilled services marketplace.
Analyze the following customer problem description and extract the structured service requirements.

STRICT CONSTRAINT: You MUST only choose category and skills from the provided CANONICAL CATALOGUE below.
DO NOT invent new categories or skills outside this list.

CANONICAL CATALOGUE:
{catalogue_str}

CUSTOMER PROBLEM DESCRIPTION:
"{description}"

Respond ONLY with a valid JSON object in this exact schema:
{{
  "category": "one category from the catalogue or null",
  "skills": ["one or more exact skill names from the catalogue"],
  "urgency": "low | normal | high | emergency",
  "confidence": 0.0 to 1.0
}}
"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.endpoint}?key={self.api_key}",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                data = response.json()

                candidate_text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(candidate_text)

                urgency_val = parsed.get("urgency", "normal").lower()
                if urgency_val not in ("low", "normal", "high", "emergency"):
                    urgency_val = "normal"

                conf = float(parsed.get("confidence", 0.8))
                conf = max(0.0, min(1.0, conf))

                return ServiceRequirementExtraction(
                    category=parsed.get("category"),
                    skills=parsed.get("skills", []),
                    urgency=ExtractionUrgency(urgency_val),
                    confidence=conf,
                )
        except Exception as e:
            logger.warning(f"Gemini API extraction failed ({type(e).__name__}): {str(e)[:100]}")
            raise
