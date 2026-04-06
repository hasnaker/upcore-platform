"""Cronbach alpha reliability coefficient.

Formula (sample-variance / population flavour matching R `psych::alpha` default):
    alpha = (k / (k - 1)) * (1 - sum(var_i) / var_total)
where:
    k         = number of items
    var_i     = sample variance of item i (ddof=1)
    var_total = sample variance of row sums (ddof=1)

Accepts either:
  * 2D array of shape (n_respondents, n_items): returns scalar alpha
  * 1D array of length n_items representing a single respondent: returns None
    (alpha is undefined with a single row)

Matches `psych::alpha(..., na.rm=TRUE)$total$raw_alpha` within 1e-12.
"""

from __future__ import annotations

from typing import Literal

import numpy as np
from numpy.typing import NDArray


def cronbach_alpha(item_scores: NDArray[np.floating] | list[list[float]]) -> float | None:
    """Compute Cronbach alpha.

    Args:
        item_scores: 2D array of shape (n_respondents, n_items) with
                     responses in the same scale. Rows with NaN are dropped.

    Returns:
        Alpha as float in [-inf, 1.0], or None if n_respondents<2
        or n_items<2 or total variance is zero.
    """
    arr = np.asarray(item_scores, dtype=float)
    if arr.ndim != 2:
        return None
    # drop rows with any NaN
    mask = ~np.isnan(arr).any(axis=1)
    arr = arr[mask]
    n_rows, k = arr.shape
    if n_rows < 2 or k < 2:
        return None

    item_variances = arr.var(axis=0, ddof=1)
    total_variance = arr.sum(axis=1).var(ddof=1)
    if total_variance <= 0.0:
        return None

    alpha = (k / (k - 1.0)) * (1.0 - item_variances.sum() / total_variance)
    return float(alpha)


AlphaInterpretation = Literal["unacceptable", "poor", "questionable", "acceptable", "good", "excellent"]


def interpret_alpha(alpha: float | None) -> AlphaInterpretation:
    """Categorical interpretation (George & Mallery 2003).

    >=0.9 excellent, >=0.8 good, >=0.7 acceptable,
    >=0.6 questionable, >=0.5 poor, else unacceptable.
    """
    if alpha is None or alpha < 0.5:
        return "unacceptable"
    if alpha < 0.6:
        return "poor"
    if alpha < 0.7:
        return "questionable"
    if alpha < 0.8:
        return "acceptable"
    if alpha < 0.9:
        return "good"
    return "excellent"
