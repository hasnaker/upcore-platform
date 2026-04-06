"""Percentile rank calculation from empirical distributions."""

from __future__ import annotations

import math

import numpy as np
from numpy.typing import NDArray
from scipy import stats


def empirical_percentile(x: float, distribution: NDArray[np.floating]) -> int:
    """Compute empirical percentile rank of x within distribution.

    Uses the "percentage of scores at or below" method:
        percentile = (count_below + 0.5 * count_equal) / N * 100

    Args:
        x: The score to rank.
        distribution: Sorted or unsorted array of norm distribution values.

    Returns:
        Integer percentile rank 0-100.
    """
    dist = np.asarray(distribution, dtype=float)
    dist = dist[~np.isnan(dist)]
    n = len(dist)
    if n == 0:
        return 50

    count_below = int(np.sum(dist < x))
    count_equal = int(np.sum(dist == x))

    percentile = (count_below + 0.5 * count_equal) / n * 100.0
    return max(0, min(100, round(percentile)))


def z_score_to_percentile(z: float) -> int:
    """Convert a z-score to a percentile rank using the standard normal CDF.

    Args:
        z: Standard score (z-score).

    Returns:
        Integer percentile rank 0-100.
    """
    p = stats.norm.cdf(z) * 100.0
    return max(0, min(100, round(p)))
