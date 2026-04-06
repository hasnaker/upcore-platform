"""Text utility functions for query building and Turkish normalization."""

from __future__ import annotations


def build_query_text(
    burnout_prediction: dict[str, float],
    top_drivers: list[str],
    context: dict | None = None,
) -> str:
    """Build a composite query text for embedding search.

    Combines burnout predictions, driver features, and context
    into a single text string for embedding.

    Args:
        burnout_prediction: Horizon -> probability mapping.
        top_drivers: Top burnout driver feature names.
        context: Optional employee context dict.

    Returns:
        Query text string.
    """
    parts: list[str] = []

    # Burnout level description
    max_prob = max(burnout_prediction.values()) if burnout_prediction else 0.0
    if max_prob > 0.5:
        parts.append("high burnout risk yuksek tukenmislik riski")
    elif max_prob > 0.25:
        parts.append("moderate burnout risk orta tukenmislik riski")
    else:
        parts.append("low burnout risk dusuk tukenmislik riski")

    # Driver features
    driver_descriptions = {
        "bat_exhaustion_slope_30d": "increasing exhaustion artan tukenmislik",
        "copsoq_workload_mean": "high workload yuksek is yuku",
        "jdr_balance_ratio": "low resources dusuk kaynaklar",
        "engagement_score": "low engagement dusuk baglilik",
        "overtime_hours_30d": "excessive overtime fazla mesai",
        "absence_days_30d": "frequent absence sik devamsizlik",
        "manager_1on1_days_since": "lack of support destek eksikligi",
        "after_hours_activity": "boundary erosion sinir erozyonu",
    }

    for driver in top_drivers[:3]:
        desc = driver_descriptions.get(driver, driver.replace("_", " "))
        parts.append(desc)

    # Context
    if context:
        role = context.get("role", "")
        if role:
            parts.append(f"role: {role}")

    return " | ".join(parts)


def normalize_turkish(text: str) -> str:
    """Normalize Turkish text for search.

    Lowercases and optionally strips special characters
    while preserving Turkish characters.
    """
    # Turkish-specific lowercase mapping
    mapping = str.maketrans("IİÇŞĞÖÜ", "ıiçşğöü")
    return text.translate(mapping).lower()
