"""Safe list of universally applicable interventions.

Hardcoded list of 10 low-risk, broad-applicability interventions
used as ultimate fallback when all other recommendation paths fail.

These interventions are evidence-based and safe for any employee
regardless of burnout band or driver profile.
"""

from __future__ import annotations

from uuid import uuid5, NAMESPACE_DNS

import structlog

logger = structlog.get_logger()

SAFE_INTERVENTIONS: list[dict] = [
    {
        "title_tr": "Haftalik 1:1 yonetici gorusmesi",
        "title_en": "Weekly 1:1 manager check-in",
        "evidence_tier": "A",
        "effect_size": 0.30,
        "time_to_effect_weeks": 2,
        "delivery_mode": "sync",
    },
    {
        "title_tr": "Mindfulness ve stres yonetimi egitimi",
        "title_en": "Mindfulness and stress management training",
        "evidence_tier": "A",
        "effect_size": 0.28,
        "time_to_effect_weeks": 4,
        "delivery_mode": "async",
    },
    {
        "title_tr": "Fiziksel aktivite tesvik programi",
        "title_en": "Physical activity encouragement program",
        "evidence_tier": "B",
        "effect_size": 0.22,
        "time_to_effect_weeks": 6,
        "delivery_mode": "self_directed",
    },
    {
        "title_tr": "Is-yasam dengesi degerlendirmesi",
        "title_en": "Work-life balance assessment",
        "evidence_tier": "B",
        "effect_size": 0.25,
        "time_to_effect_weeks": 3,
        "delivery_mode": "async",
    },
    {
        "title_tr": "Akran destek grubu",
        "title_en": "Peer support group",
        "evidence_tier": "B",
        "effect_size": 0.20,
        "time_to_effect_weeks": 4,
        "delivery_mode": "sync",
    },
    {
        "title_tr": "Profesyonel gelisim plani olusturma",
        "title_en": "Professional development plan creation",
        "evidence_tier": "B",
        "effect_size": 0.22,
        "time_to_effect_weeks": 4,
        "delivery_mode": "async",
    },
    {
        "title_tr": "Uyku hijyeni egitimi",
        "title_en": "Sleep hygiene education",
        "evidence_tier": "B",
        "effect_size": 0.18,
        "time_to_effect_weeks": 3,
        "delivery_mode": "self_directed",
    },
    {
        "title_tr": "Takim icin pozitif iletisim atolyesi",
        "title_en": "Positive communication workshop for team",
        "evidence_tier": "B",
        "effect_size": 0.20,
        "time_to_effect_weeks": 3,
        "delivery_mode": "sync",
    },
    {
        "title_tr": "Bireysel guclu yonler odakli koculuk",
        "title_en": "Strengths-based individual coaching",
        "evidence_tier": "A",
        "effect_size": 0.35,
        "time_to_effect_weeks": 6,
        "delivery_mode": "sync",
    },
    {
        "title_tr": "Dijital detoks ve sinir belirleme rehberi",
        "title_en": "Digital detox and boundary setting guide",
        "evidence_tier": "C",
        "effect_size": 0.15,
        "time_to_effect_weeks": 2,
        "delivery_mode": "self_directed",
    },
]


def get_safe_list(max_results: int = 5) -> list[dict]:
    """Return safe list interventions.

    These are always available as the ultimate fallback.
    Sorted by evidence tier (A first) then effect size (descending).

    Args:
        max_results: Maximum interventions to return.

    Returns:
        List of safe intervention recommendation dicts.
    """
    sorted_interventions = sorted(
        SAFE_INTERVENTIONS,
        key=lambda x: (-{"A": 3, "B": 2, "C": 1}[x["evidence_tier"]], -x["effect_size"]),
    )

    results: list[dict] = []
    for item in sorted_interventions[:max_results]:
        iid = uuid5(NAMESPACE_DNS, f"upcore.safe.{item['title_en']}")
        results.append({
            "intervention_id": iid,
            "title_tr": item["title_tr"],
            "title_en": item["title_en"],
            "evidence_tier": item["evidence_tier"],
            "score": item["effect_size"],
            "similarity": 0.0,
            "thompson_sample": 0.5,
            "rationale_tr": "Genel gecerlilige sahip, dusuk riskli onerilen mudahale.",
            "expected_effect_size": item["effect_size"],
            "time_to_effect_weeks": item["time_to_effect_weeks"],
            "delivery_mode": item["delivery_mode"],
            "source_case_ids": [],
        })

    logger.info("safe_list_fallback_used", result_count=len(results))
    return results
