"""Additional reliability coefficients beyond Cronbach alpha.

Cronbach alpha and split-half live in app.reliability (legacy location).
This module adds composite reliability (McDonald's omega approximation).
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


def composite_reliability(
    loadings: NDArray[np.floating],
    errors: NDArray[np.floating],
) -> float | None:
    """Composite reliability (CR) from factor loadings and error variances.

    CR = (sum(loadings))^2 / ((sum(loadings))^2 + sum(errors))

    This approximates McDonald's omega for a single-factor model.

    Args:
        loadings: 1D array of standardized factor loadings.
        errors: 1D array of error variances (1 - loading^2 for standardized).

    Returns:
        CR value in [0, 1], or None if inputs are invalid.
    """
    loads = np.asarray(loadings, dtype=float).ravel()
    errs = np.asarray(errors, dtype=float).ravel()

    if loads.size < 2 or loads.size != errs.size:
        return None

    sum_loads = float(loads.sum())
    sum_errs = float(errs.sum())

    denominator = sum_loads**2 + sum_errs
    if denominator <= 0.0:
        return None

    cr = sum_loads**2 / denominator
    return float(cr)
