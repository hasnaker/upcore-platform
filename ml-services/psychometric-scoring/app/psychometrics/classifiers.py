"""Traffic-light and risk-level classifiers.

All cut-offs are externalized to norm tables — no hardcoded thresholds
in the scoring code. This module provides generic classification functions
that accept cut-off dicts loaded from data/.
"""

from __future__ import annotations

from app.schemas.common import TrafficLight


def classify_traffic_light(
    score: float,
    cutoffs: dict[str, float],
) -> TrafficLight:
    """Classify a score into GREEN/AMBER/RED using cutoff thresholds.

    Expected cutoff dict keys:
      - green_max: scores at or below this are GREEN
      - amber_max: scores above green_max and at or below this are AMBER
      - red_min:   scores at or above this are RED

    For resource/outcome subscales (higher=better), the dict may use:
      - green_min: scores at or above this are GREEN
      - amber_min: scores at or above this are AMBER
      - red_max:   scores at or below this are RED

    Falls back to AMBER when cutoffs are missing or ambiguous.
    """
    # "Higher is worse" pattern (demands, burnout)
    green_max = cutoffs.get("green_max")
    red_min = cutoffs.get("red_min")

    if green_max is not None and red_min is not None:
        if score <= green_max:
            return TrafficLight.GREEN
        if score >= red_min:
            return TrafficLight.RED
        return TrafficLight.AMBER

    # "Higher is better" pattern (resources, outcomes)
    green_min = cutoffs.get("green_min")
    red_max = cutoffs.get("red_max")

    if green_min is not None and red_max is not None:
        if score >= green_min:
            return TrafficLight.GREEN
        if score <= red_max:
            return TrafficLight.RED
        return TrafficLight.AMBER

    # Fallback when cutoffs not configured
    return TrafficLight.AMBER


def classify_risk_level(
    score: float,
    sd: float,
    population_mean: float,
) -> str:
    """Classify risk based on standard deviations from mean.

    Returns:
        "low"    : within 1 SD of mean (favorable direction)
        "medium" : 1-2 SD from mean
        "high"   : > 2 SD from mean (unfavorable direction)
    """
    if sd <= 0.0:
        return "medium"

    z = (score - population_mean) / sd

    if abs(z) <= 1.0:
        return "low"
    if abs(z) <= 2.0:
        return "medium"
    return "high"
