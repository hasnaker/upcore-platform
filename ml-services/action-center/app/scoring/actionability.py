"""Actionability scoring: ease of execution.

Captures how easy it is for the user to actually execute this action.
Higher score = easier to do.

Factors:
- Time required (less time = more actionable)
- Authority level (self < team_lead < hr)
- Budget tier (free > low > medium > high)

Model type: heuristic_v0.1
"""

from __future__ import annotations

# Time required to actionability mapping (hours)
TIME_SCORES: list[tuple[float, float]] = [
    (0.5, 0.95),   # 30 min
    (1.0, 0.90),   # 1 hour
    (2.0, 0.80),   # 2 hours
    (4.0, 0.65),   # half day
    (8.0, 0.50),   # full day
    (16.0, 0.35),  # 2 days
    (40.0, 0.20),  # 1 week
]

AUTHORITY_SCORES: dict[str, float] = {
    "self": 1.0,
    "team_lead": 0.8,
    "hr": 0.5,
    "executive": 0.3,
}

BUDGET_SCORES: dict[str, float] = {
    "free": 1.0,
    "low": 0.85,
    "medium": 0.6,
    "high": 0.3,
}


def compute_actionability(
    time_required_hours: float,
    authority_level: str,
    budget_tier: str,
) -> float:
    """Compute actionability score.

    Combined score: 0.5 * time_score + 0.3 * authority_score + 0.2 * budget_score

    Args:
        time_required_hours: Estimated time to execute.
        authority_level: Who needs to approve (self, team_lead, hr, executive).
        budget_tier: Cost level (free, low, medium, high).

    Returns:
        Actionability score in [0, 1].
    """
    time_score = _time_to_score(time_required_hours)
    authority_score = AUTHORITY_SCORES.get(authority_level, 0.5)
    budget_score = BUDGET_SCORES.get(budget_tier, 0.5)

    combined = 0.5 * time_score + 0.3 * authority_score + 0.2 * budget_score
    return max(0.0, min(1.0, combined))


def _time_to_score(hours: float) -> float:
    """Convert time required to actionability score.

    Uses linear interpolation between breakpoints.
    """
    if hours <= 0:
        return 1.0

    for i, (threshold, score) in enumerate(TIME_SCORES):
        if hours <= threshold:
            if i == 0:
                return score
            prev_threshold, prev_score = TIME_SCORES[i - 1]
            # Linear interpolation
            fraction = (hours - prev_threshold) / (threshold - prev_threshold)
            return prev_score + fraction * (score - prev_score)

    return 0.15  # Very long tasks
