from abc import ABC, abstractmethod
from typing import List, Dict, Any
from app.ai.schemas import ServiceRequirementExtraction


class AIProvider(ABC):
    """Abstract interface for AI service request intent extraction providers."""

    @abstractmethod
    async def extract_service_requirements(
        self,
        description: str,
        canonical_catalogue: List[Dict[str, Any]],
    ) -> ServiceRequirementExtraction:
        """
        Extracts structured service requirements from a natural language request description,
        constrained strictly to the provided canonical skills catalogue.

        :param description: Raw customer problem description
        :param canonical_catalogue: List of dicts representing public.skills
        :return: ServiceRequirementExtraction instance
        """
        pass
