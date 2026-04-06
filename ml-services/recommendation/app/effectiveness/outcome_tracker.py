"""Outcome tracking for intervention effectiveness learning.

Processes post-intervention BAT score changes and determines
success/failure for posterior updates.

Success criterion: post-intervention BAT delta <= -0.3 (improvement)
"""

from __future__ import annotations

import structlog

logger = structlog.get_logger()

# Success threshold: BAT score must decrease by at least 0.3 points
BAT_IMPROVEMENT_THRESHOLD = -0.3


def compute_success(pre_bat: float, post_bat: float, threshold: float = BAT_IMPROVEMENT_THRESHOLD) -> bool:
    """Determine if an intervention was successful.

    Success is defined as a BAT score reduction of at least |threshold|.
    BAT scores range from 1 (no burnout) to 5 (severe burnout).

    Args:
        pre_bat: BAT score before intervention.
        post_bat: BAT score after intervention.
        threshold: Required delta for success (negative = improvement).

    Returns:
        True if intervention was successful.
    """
    delta = post_bat - pre_bat
    return delta <= threshold


def compute_effect_size(pre_bat: float, post_bat: float) -> float:
    """Compute effect size (Cohen's d approximation) for single-case.

    Simplified for single pre-post measurement.
    Positive values indicate improvement (BAT decreased).
    """
    delta = pre_bat - post_bat  # Positive = improvement
    # Use BAT scale range as denominator proxy
    bat_scale_range = 4.0  # 5 - 1
    return delta / bat_scale_range


def determine_segment(burnout_band: str, tenure_months: int) -> str:
    """Determine the cohort segment for posterior tracking.

    Segments group employees by burnout band and tenure for
    more targeted effectiveness learning.

    Args:
        burnout_band: GREEN, AMBER, or RED.
        tenure_months: Employee tenure in months.

    Returns:
        Segment string, e.g. "AMBER_mid_tenure".
    """
    if tenure_months < 12:
        tenure_label = "new"
    elif tenure_months < 48:
        tenure_label = "mid"
    else:
        tenure_label = "senior"

    return f"{burnout_band}_{tenure_label}_tenure"
