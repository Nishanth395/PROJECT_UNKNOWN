import re
from typing import List, Dict, Any, Optional
from app.ai.base import AIProvider
from app.ai.schemas import ServiceRequirementExtraction, ExtractionUrgency


class FallbackProvider(AIProvider):
    """
    Deterministic keyword-based service requirements extractor.
    Operates completely offline with zero external API dependencies,
    matching natural-language request descriptions against the dynamic canonical catalogue.
    """

    # Keyword mappings to canonical categories and skills
    SKILL_KEYWORD_PATTERNS = {
        # Plumbing
        "Pipe Repair": [r"\bpipe\b", r"\bburst\b", r"\bpvc\b", r"\bcpvc\b", r"\bwaterline\b"],
        "Leak Fixing": [r"\bleak", r"\bdrip", r"\bseep", r"\bwater dripping\b"],
        "Drain Cleaning": [r"\bdrain", r"\bblock", r"\bclog", r"\bchoke", r"\bsink block"],
        "Faucet & Tap Installation": [r"\bfaucet\b", r"\btap\b", r"\bmixer\b", r"\bbibcock\b", r"\bspout\b"],

        # Electrical
        "House Wiring": [r"\bwiring\b", r"\bre-?wiring\b", r"\bpower cut\b", r"\belectrical cable\b"],
        "Short Circuit Diagnosis": [r"\bshort circuit\b", r"\bmcb\b", r"\btripp", r"\bspark\b", r"\bfuse\b", r"\bshock\b"],
        "Switchboard Repair": [r"\bswitch", r"\bsocket\b", r"\bplug point\b", r"\bregulator\b", r"\bfan\b", r"\blight\b"],

        # Carpentry
        "Furniture Assembly": [r"\bfurniture\b", r"\bassembl", r"\bwardrobe\b", r"\bcupboard\b", r"\btable\b", r"\bbed\b", r"\bchair\b", r"\bshelf\b"],
        "Door Lock & Latch Fixing": [r"\block\b", r"\blatch\b", r"\bhandle\b", r"\bhinge\b", r"\bdoor\b", r"\bwindow\b", r"\bkey\b"],

        # Appliance Repair
        "AC Repair & Gas Refill": [r"\bac\b", r"\bair condition", r"\bgas refill\b", r"\bcooling\b", r"\bcompressor\b"],
        "Washing Machine Diagnosis": [r"\bwash.*machine\b", r"\bdrum\b", r"\bspin.*cycle\b", r"\bwasher\b"],

        # Mechanic
        "Two-Wheeler Servicing": [r"\bbike\b", r"\bscooter\b", r"\bmotorcycle\b", r"\btwo-?wheeler\b", r"\boil change\b"],
        "Car Battery Jumpstart": [r"\bcar battery\b", r"\bjumpstart\b", r"\bbattery dead\b", r"\bcar won't start\b"],

        # Tutoring
        "Mathematics Tutoring": [r"\bmath", r"\btutor", r"\bcalculus\b", r"\balgebra\b", r"\bgeometry\b", r"\bteacher\b", r"\bcoaching\b"],
    }

    # Urgency keyword indicators
    URGENCY_PATTERNS = {
        ExtractionUrgency.emergency: [r"\bemergency\b", r"\bsparking\b", r"\bfire\b", r"\bburst pipe\b", r"\belectric shock\b", r"\bimmediately\b", r"\bdanger\b"],
        ExtractionUrgency.high: [r"\burgent\b", r"\bheavy leak\b", r"\basap\b", r"\bnot working at all\b", r"\btripping\b", r"\bcompletely broken\b"],
        ExtractionUrgency.low: [r"\broutine\b", r"\bmaintenance\b", r"\bwhenever\b", r"\bnext week\b", r"\bspare time\b", r"\bnon-urgent\b"],
    }

    async def extract_service_requirements(
        self,
        description: str,
        canonical_catalogue: List[Dict[str, Any]],
    ) -> ServiceRequirementExtraction:
        text = description.lower().strip()

        # 1. Build lookup of catalogue skills and categories
        catalogue_skills = {s["name"]: s.get("category") for s in canonical_catalogue}
        catalogue_categories = {s.get("category") for s in canonical_catalogue if s.get("category")}

        matched_skills: List[str] = []
        category_votes: Dict[str, int] = {}

        # 2. Match skills based on patterns
        for skill_name, patterns in self.SKILL_KEYWORD_PATTERNS.items():
            if skill_name in catalogue_skills:
                for pattern in patterns:
                    if re.search(pattern, text, re.IGNORECASE):
                        if skill_name not in matched_skills:
                            matched_skills.append(skill_name)
                        cat = catalogue_skills[skill_name]
                        category_votes[cat] = category_votes.get(cat, 0) + 1
                        break

        # 3. Direct category name matching if no skill patterns hit directly
        for cat in catalogue_categories:
            if cat.lower() in text:
                category_votes[cat] = category_votes.get(cat, 0) + 2

        # 4. Determine best category
        detected_category: Optional[str] = None
        if category_votes:
            detected_category = max(category_votes.items(), key=lambda x: x[1])[0]

        # If category is detected but no specific skill was matched, try to pick most general skill in that category
        if detected_category and not matched_skills:
            category_skills = [s["name"] for s in canonical_catalogue if s.get("category") == detected_category]
            if category_skills:
                matched_skills.append(category_skills[0])

        # 5. Detect urgency
        detected_urgency = ExtractionUrgency.normal
        for urg, patterns in self.URGENCY_PATTERNS.items():
            if any(re.search(p, text, re.IGNORECASE) for p in patterns):
                detected_urgency = urg
                break

        # 6. Calculate confidence
        if matched_skills and detected_category:
            confidence = 0.90
        elif detected_category or matched_skills:
            confidence = 0.70
        else:
            confidence = 0.20

        return ServiceRequirementExtraction(
            category=detected_category,
            skills=matched_skills,
            urgency=detected_urgency,
            confidence=confidence,
        )
