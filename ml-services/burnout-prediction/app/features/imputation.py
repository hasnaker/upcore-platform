"""Missing value imputation strategies for burnout features.

Strategy (heuristic v0.1):
1. Forward-fill within employee (max 3 consecutive gaps)
2. Tenant median for remaining gaps
3. Global median as final fallback
"""

from __future__ import annotations

import numpy as np
import structlog

from app.features.feature_spec import FEATURE_SPEC

logger = structlog.get_logger()

# Maximum consecutive forward-fill gaps
MAX_FORWARD_FILL_GAPS = 3


def impute_missing(
    data: dict[str, list[float | None]],
    tenant_medians: dict[str, float] | None = None,
    global_medians: dict[str, float] | None = None,
) -> dict[str, list[float]]:
    """Apply tiered imputation strategy.

    Args:
        data: Feature name to time series with possible None values.
        tenant_medians: Pre-computed tenant-level medians per feature.
        global_medians: Pre-computed global medians per feature.

    Returns:
        Fully imputed feature dict with no None values.
    """
    if tenant_medians is None:
        tenant_medians = {}
    if global_medians is None:
        global_medians = _default_global_medians()

    result: dict[str, list[float]] = {}
    imputation_counts: dict[str, int] = {}

    spec_map = {f.name: f for f in FEATURE_SPEC}

    for feature_name, series in data.items():
        spec = spec_map.get(feature_name)
        strategy = spec.imputation_strategy if spec else "global_median"
        tenant_med = tenant_medians.get(feature_name)
        global_med = global_medians.get(feature_name, 0.0)

        imputed_series, count = _impute_series(
            series=series,
            strategy=strategy,
            tenant_median=tenant_med,
            global_median=global_med,
        )
        result[feature_name] = imputed_series
        if count > 0:
            imputation_counts[feature_name] = count

    if imputation_counts:
        logger.info(
            "imputation_applied",
            features_imputed=len(imputation_counts),
            total_values_imputed=sum(imputation_counts.values()),
        )

    return result


def _impute_series(
    series: list[float | None],
    strategy: str,
    tenant_median: float | None,
    global_median: float,
) -> tuple[list[float], int]:
    """Impute a single feature series."""
    result: list[float] = []
    imputed_count = 0
    consecutive_gaps = 0

    for i, val in enumerate(series):
        if val is not None:
            result.append(float(val))
            consecutive_gaps = 0
        else:
            imputed_count += 1
            # Strategy 1: Forward-fill (within gap limit)
            if strategy == "forward_fill" and consecutive_gaps < MAX_FORWARD_FILL_GAPS and i > 0:
                result.append(result[-1])
                consecutive_gaps += 1
            # Strategy 2: Tenant median
            elif tenant_median is not None:
                result.append(tenant_median)
                consecutive_gaps += 1
            # Strategy 3: Global median
            else:
                result.append(global_median)
                consecutive_gaps += 1

    return result, imputed_count


def compute_missingness_mask(data: dict[str, list[float | None]]) -> dict[str, list[bool]]:
    """Compute a boolean mask indicating missing values.

    Returns:
        Dict of feature name to list of booleans (True = missing).
    """
    return {
        name: [v is None for v in series]
        for name, series in data.items()
    }


def emit_imputation_metrics(
    data: dict[str, list[float | None]],
    tenant_id: str,
) -> dict[str, float]:
    """Compute and log imputation rate per feature.

    Returns:
        Dict of feature name to imputation rate (0.0 - 1.0).
    """
    metrics: dict[str, float] = {}
    for name, series in data.items():
        total = len(series)
        if total == 0:
            metrics[name] = 0.0
            continue
        missing = sum(1 for v in series if v is None)
        rate = missing / total
        metrics[name] = rate

    high_missing = {k: v for k, v in metrics.items() if v > 0.3}
    if high_missing:
        logger.warning(
            "high_missingness_rate",
            tenant_id=tenant_id,
            features=high_missing,
        )

    return metrics


def _default_global_medians() -> dict[str, float]:
    """Return default global medians based on feature spec midpoints."""
    medians: dict[str, float] = {}
    for spec in FEATURE_SPEC:
        medians[spec.name] = (spec.min_value + spec.max_value) / 2.0
    return medians
