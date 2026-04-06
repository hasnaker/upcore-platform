"""Trajectory band generation for 90-day burnout risk forecast.

Generates a confidence band over the next 90 days by rolling
MC-Dropout sampling forward. For heuristic_v0.1, uses linear
interpolation with expanding uncertainty.

Model type: heuristic_v0.1 (linear interpolation + expanding CI)
"""

from __future__ import annotations

import numpy as np
import structlog

from app.schemas.responses import TrajectoryBand

logger = structlog.get_logger()


def forecast_trajectory(
    current_features: dict[str, float],
    horizon_predictions: dict[int, dict[str, float]],
    days: int = 90,
    n_samples: int = 30,
) -> TrajectoryBand:
    """Generate 90-day trajectory band.

    Heuristic v0.1: linear interpolation between known horizon predictions
    with expanding Gaussian uncertainty band.

    For LSTM: will use rolling MC-Dropout forward passes with
    autoregressive feature updates.

    Args:
        current_features: Current feature values.
        horizon_predictions: Predictions at each horizon.
        days: Number of days to forecast.
        n_samples: MC samples (for future LSTM version).

    Returns:
        TrajectoryBand with lower and upper bounds.
    """
    # Extract anchor points from horizon predictions
    anchors: list[tuple[int, float, float, float]] = []
    for horizon in sorted(horizon_predictions.keys()):
        pred = horizon_predictions[horizon]
        anchors.append((
            horizon,
            pred["probability"],
            pred["ci_lower"],
            pred["ci_upper"],
        ))

    if not anchors:
        logger.warning("no_horizon_predictions_for_trajectory")
        return TrajectoryBand(
            next_90d_band_lower=[0.0] * days,
            next_90d_band_upper=[0.5] * days,
        )

    # Build daily trajectory via linear interpolation
    day_range = np.arange(1, days + 1, dtype=np.float64)
    mean_curve = _interpolate_anchors(anchors, day_range, key_idx=1)
    lower_curve = _interpolate_anchors(anchors, day_range, key_idx=2)
    upper_curve = _interpolate_anchors(anchors, day_range, key_idx=3)

    # Apply trend from feature slopes (heuristic adjustment)
    slope = current_features.get("bat_exhaustion_slope_30d", 0.0)
    trend_adjustment = slope * 0.01 * day_range / 30.0
    mean_curve = np.clip(mean_curve + trend_adjustment, 0.0, 1.0)

    # Expand CI over time (uncertainty grows)
    expansion_factor = 1.0 + 0.5 * (day_range / days)
    ci_width = (upper_curve - lower_curve) * expansion_factor
    lower_curve = np.clip(mean_curve - ci_width / 2, 0.0, 1.0)
    upper_curve = np.clip(mean_curve + ci_width / 2, 0.0, 1.0)

    return TrajectoryBand(
        next_90d_band_lower=[round(float(v), 4) for v in lower_curve],
        next_90d_band_upper=[round(float(v), 4) for v in upper_curve],
    )


def _interpolate_anchors(
    anchors: list[tuple[int, float, float, float]],
    days: np.ndarray,
    key_idx: int,
) -> np.ndarray:
    """Linearly interpolate between anchor points.

    Args:
        anchors: List of (day, mean, lower, upper) tuples.
        days: Array of day numbers to interpolate.
        key_idx: Index into anchor tuple to interpolate (1=mean, 2=lower, 3=upper).

    Returns:
        Interpolated values for each day.
    """
    anchor_days = np.array([a[0] for a in anchors], dtype=np.float64)
    anchor_vals = np.array([a[key_idx] for a in anchors], dtype=np.float64)

    return np.interp(days, anchor_days, anchor_vals)
