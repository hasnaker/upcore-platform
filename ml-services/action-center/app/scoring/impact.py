"""Impact scoring: effect size x affected persons.

Impact captures the expected positive outcome if the action is taken.

Formula (heuristic_v0.1):
raw_impact = effect_size * log2(n_affected + 1)
impact = normalize(raw_impact) -> [0, 1]

Model type: heuristic_v0.1
"""

from __future__ import annotations

import math


def compute_impact(
    effect_size: float,
    n_affected: int,
) -> float:
    """Compute impact score.

    Args:
        effect_size: Expected Cohen's d or similar effect size (0-2).
        n_affected: Number of people affected by the action.

    Returns:
        Impact score in [0, 1].
    """
    if effect_size <= 0 or n_affected <= 0:
        return 0.0

    raw = effect_size * math.log2(n_affected + 1)
    return normalize_impact(raw)


def normalize_impact(raw: float) -> float:
    """Normalize raw impact score to [0, 1] using sigmoid-like function.

    Maps raw impact to [0, 1] with saturation around raw=5.

    Args:
        raw: Raw impact score (unbounded positive).

    Returns:
        Normalized impact in [0, 1].
    """
    if raw <= 0:
        return 0.0

    # Sigmoid with scale factor for reasonable range
    # raw=0.3 -> ~0.35, raw=1.0 -> ~0.65, raw=3.0 -> ~0.90
    normalized = 1.0 - math.exp(-raw * 0.7)
    return max(0.0, min(1.0, normalized))
