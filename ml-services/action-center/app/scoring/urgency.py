"""Urgency scoring: time-decay + severity band.

Urgency captures how time-sensitive an action is.

Base urgency from severity band:
- RED: 0.9
- AMBER: 0.6
- GREEN: 0.2

Adjustments:
- Positive trend slope (> 0.5): +0.1
- Near-term horizon (< 30d): +0.15

Model type: heuristic_v0.1
"""

from __future__ import annotations

SEVERITY_BASE: dict[str, float] = {
    "RED": 0.90,
    "AMBER": 0.60,
    "GREEN": 0.20,
}


def compute_urgency(
    severity_band: str,
    days_until_horizon: int,
    trend_slope: float,
) -> float:
    """Compute urgency factor.

    Args:
        severity_band: GREEN, AMBER, or RED.
        days_until_horizon: Days until predicted horizon event.
        trend_slope: Rate of change in burnout signal (positive = worsening).

    Returns:
        Urgency score in [0, 1].
    """
    base = SEVERITY_BASE.get(severity_band, 0.3)

    adjustment = 0.0

    # Worsening trend adds urgency
    if trend_slope > 0.5:
        adjustment += 0.10
    elif trend_slope > 0.2:
        adjustment += 0.05

    # Near-term horizon adds urgency
    if days_until_horizon < 30:
        adjustment += 0.15
    elif days_until_horizon < 60:
        adjustment += 0.05

    urgency = base + adjustment
    return max(0.0, min(1.0, urgency))
