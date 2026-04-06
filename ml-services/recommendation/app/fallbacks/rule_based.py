"""Rule-based fallback recommendation engine.

Used when embeddings/CBR are unavailable. Provides deterministic
recommendations based on burnout band and top driver features.
"""

from __future__ import annotations

from uuid import UUID, uuid5, NAMESPACE_DNS

import structlog

logger = structlog.get_logger()

# Rule-based mapping: {burnout_band, top_driver} -> intervention IDs
# Uses deterministic UUIDs for V1 seed data consistency
RULE_TABLE: dict[tuple[str, str], list[dict]] = {
    ("RED", "bat_exhaustion_slope_30d"): [
        {"title_tr": "Acil stres yonetimi atolyesi", "title_en": "Emergency stress management workshop", "evidence_tier": "A", "effect_size": 0.45},
        {"title_tr": "Yonetici kocluk oturumu", "title_en": "Manager coaching session", "evidence_tier": "A", "effect_size": 0.42},
        {"title_tr": "Is yuku gozden gecirme toplantisi", "title_en": "Workload review meeting", "evidence_tier": "B", "effect_size": 0.35},
    ],
    ("RED", "copsoq_workload_mean"): [
        {"title_tr": "Is yuku yeniden dagitimi", "title_en": "Workload redistribution", "evidence_tier": "A", "effect_size": 0.50},
        {"title_tr": "Oncelik belirleme atolyesi", "title_en": "Priority setting workshop", "evidence_tier": "B", "effect_size": 0.30},
    ],
    ("AMBER", "bat_exhaustion_slope_30d"): [
        {"title_tr": "Bireysel kocluk programi", "title_en": "Individual coaching program", "evidence_tier": "A", "effect_size": 0.38},
        {"title_tr": "Mindfulness egitimi", "title_en": "Mindfulness training", "evidence_tier": "B", "effect_size": 0.28},
    ],
    ("AMBER", "copsoq_workload_mean"): [
        {"title_tr": "Zaman yonetimi egitimi", "title_en": "Time management training", "evidence_tier": "B", "effect_size": 0.25},
        {"title_tr": "Esnek calisma duzenleme", "title_en": "Flexible work arrangement", "evidence_tier": "B", "effect_size": 0.30},
    ],
    ("GREEN", "engagement_score"): [
        {"title_tr": "Kariyer gelisim gorusmesi", "title_en": "Career development meeting", "evidence_tier": "B", "effect_size": 0.20},
        {"title_tr": "Takim aktivitesi", "title_en": "Team building activity", "evidence_tier": "C", "effect_size": 0.15},
    ],
}

# Default rules when no specific match
DEFAULT_RULES: dict[str, list[dict]] = {
    "RED": [
        {"title_tr": "Acil HR gorusmesi", "title_en": "Emergency HR consultation", "evidence_tier": "A", "effect_size": 0.40},
        {"title_tr": "Profesyonel destek yonlendirme", "title_en": "Professional support referral", "evidence_tier": "A", "effect_size": 0.45},
    ],
    "AMBER": [
        {"title_tr": "1:1 yonetici gorusmesi", "title_en": "1:1 manager check-in", "evidence_tier": "B", "effect_size": 0.30},
        {"title_tr": "Kaynak degerlendirme", "title_en": "Resource assessment", "evidence_tier": "B", "effect_size": 0.25},
    ],
    "GREEN": [
        {"title_tr": "Duzensiz kontrol gorusmesi", "title_en": "Regular check-in meeting", "evidence_tier": "C", "effect_size": 0.15},
    ],
}


def rule_based_recommend(
    burnout_band: str,
    drivers: list[str],
    max_results: int = 5,
) -> list[dict]:
    """Generate rule-based recommendations.

    Looks up interventions by (burnout_band, top_driver) pairs,
    then fills remaining slots from default rules.

    Args:
        burnout_band: GREEN, AMBER, or RED.
        drivers: Top burnout driver feature names.
        max_results: Maximum recommendations to return.

    Returns:
        List of recommendation dicts with titles and metadata.
    """
    results: list[dict] = []
    seen_titles: set[str] = set()

    # Try specific rules first
    for driver in drivers:
        key = (burnout_band, driver)
        if key in RULE_TABLE:
            for item in RULE_TABLE[key]:
                if item["title_en"] not in seen_titles and len(results) < max_results:
                    results.append(_build_recommendation(item, burnout_band, driver))
                    seen_titles.add(item["title_en"])

    # Fill with default rules
    for item in DEFAULT_RULES.get(burnout_band, []):
        if item["title_en"] not in seen_titles and len(results) < max_results:
            results.append(_build_recommendation(item, burnout_band, "default"))
            seen_titles.add(item["title_en"])

    logger.info(
        "rule_based_recommendations",
        burnout_band=burnout_band,
        drivers=drivers,
        result_count=len(results),
    )

    return results


def _build_recommendation(item: dict, band: str, driver: str) -> dict:
    """Build a recommendation dict from a rule table entry."""
    # Deterministic UUID from title for consistency
    iid = uuid5(NAMESPACE_DNS, f"upcore.intervention.{item['title_en']}")

    return {
        "intervention_id": iid,
        "title_tr": item["title_tr"],
        "title_en": item["title_en"],
        "evidence_tier": item["evidence_tier"],
        "score": item["effect_size"],
        "similarity": 0.0,
        "thompson_sample": 0.5,
        "rationale_tr": f"{band} risk grubundaki calisanlar icin onerilen mudahale.",
        "expected_effect_size": item["effect_size"],
        "time_to_effect_weeks": 4,
        "delivery_mode": "async",
        "source_case_ids": [],
    }
