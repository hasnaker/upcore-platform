"""Test-retest and split-half reliability coefficients."""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


def compute_retest_correlation(
    t1: NDArray[np.floating] | list[float],
    t2: NDArray[np.floating] | list[float],
) -> float | None:
    """Pearson correlation between two timepoints for the same respondents."""
    a = np.asarray(t1, dtype=float)
    b = np.asarray(t2, dtype=float)
    if a.shape != b.shape or a.size < 2:
        return None
    mask = ~(np.isnan(a) | np.isnan(b))
    a, b = a[mask], b[mask]
    if a.size < 2:
        return None
    std_a = a.std(ddof=1)
    std_b = b.std(ddof=1)
    if std_a == 0.0 or std_b == 0.0:
        return None
    r = float(np.corrcoef(a, b)[0, 1])
    return r


def split_half_reliability(
    items: NDArray[np.floating] | list[list[float]],
) -> float | None:
    """Spearman-Brown corrected split-half reliability.

    Splits items at odd/even indices, correlates half-sums across respondents,
    then applies Spearman-Brown: r_sb = 2r / (1 + r).
    """
    arr = np.asarray(items, dtype=float)
    if arr.ndim != 2 or arr.shape[1] < 2 or arr.shape[0] < 2:
        return None
    odd = arr[:, ::2].sum(axis=1)
    even = arr[:, 1::2].sum(axis=1)
    r = compute_retest_correlation(odd, even)
    if r is None:
        return None
    if (1.0 + r) == 0.0:
        return None
    return 2.0 * r / (1.0 + r)
