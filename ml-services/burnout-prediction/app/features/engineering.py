"""Feature engineering pipeline: raw signals to 42 engineered features.

Model type: heuristic_v0.1
All formulas are labeled as heuristic approximations. When LSTM training
data becomes available, these will be replaced by learned representations.
"""

from __future__ import annotations

import numpy as np
import structlog

from app.features.feature_spec import FEATURE_NAMES

logger = structlog.get_logger()


def engineer_features(raw_signals: dict[str, list[float] | float]) -> dict[str, float]:
    """Transform raw signal data into the canonical 42-feature vector.

    For V1 (heuristic_v0.1), this accepts a flat dict of available signals
    and computes derived features. Missing features are set to defaults.

    Args:
        raw_signals: Dict of signal name to value(s). Lists represent time series.

    Returns:
        Dict of 42 feature names to float values.
    """
    features: dict[str, float] = {}

    # BAT scores
    bat_exhaustion = _get_series(raw_signals, "bat_exhaustion")
    features["bat_exhaustion_mean"] = float(np.mean(bat_exhaustion)) if len(bat_exhaustion) > 0 else 2.5
    features["bat_exhaustion_slope_30d"] = compute_slope(bat_exhaustion, window=4) if len(bat_exhaustion) >= 2 else 0.0
    features["bat_exhaustion_volatility"] = compute_volatility(bat_exhaustion) if len(bat_exhaustion) >= 2 else 0.0
    features["bat_distance_mean"] = _get_scalar(raw_signals, "bat_distance_mean", 2.5)
    features["bat_distance_slope_30d"] = _get_scalar(raw_signals, "bat_distance_slope_30d", 0.0)
    features["bat_cognitive_mean"] = _get_scalar(raw_signals, "bat_cognitive_mean", 2.5)
    features["bat_emotional_mean"] = _get_scalar(raw_signals, "bat_emotional_mean", 2.5)

    # BAT composite: mean of subscales
    bat_subscales = [
        features["bat_exhaustion_mean"],
        features["bat_distance_mean"],
        features["bat_cognitive_mean"],
        features["bat_emotional_mean"],
    ]
    features["bat_composite"] = float(np.mean(bat_subscales))

    # COPSOQ scores
    features["copsoq_workload_mean"] = _get_scalar(raw_signals, "copsoq_workload_mean", 50.0)
    copsoq_workload_series = _get_series(raw_signals, "copsoq_workload")
    features["copsoq_workload_slope_30d"] = compute_slope(copsoq_workload_series, 4) if len(copsoq_workload_series) >= 2 else 0.0
    features["copsoq_autonomy_mean"] = _get_scalar(raw_signals, "copsoq_autonomy_mean", 50.0)
    features["copsoq_social_support"] = _get_scalar(raw_signals, "copsoq_social_support", 50.0)
    features["copsoq_recognition"] = _get_scalar(raw_signals, "copsoq_recognition", 50.0)

    # JD-R model
    jdr_demands = _get_scalar(raw_signals, "jdr_demands_total", 50.0)
    jdr_resources = _get_scalar(raw_signals, "jdr_resources_total", 50.0)
    features["jdr_balance_ratio"] = jdr_resources / max(jdr_demands, 1.0)
    features["jdr_demands_total"] = jdr_demands
    features["jdr_resources_total"] = jdr_resources

    # Engagement
    features["engagement_score"] = _get_scalar(raw_signals, "engagement_score", 0.5)
    features["engagement_trend_30d"] = _get_scalar(raw_signals, "engagement_trend_30d", 0.0)

    # HR / attendance
    features["absence_days_30d"] = _get_scalar(raw_signals, "absence_days_30d", 0.0)
    features["absence_days_90d"] = _get_scalar(raw_signals, "absence_days_90d", 0.0)
    features["overtime_hours_30d"] = _get_scalar(raw_signals, "overtime_hours_30d", 0.0)
    features["overtime_ratio"] = features["overtime_hours_30d"] / 160.0  # vs standard 160h/month

    # Behavioural signals
    features["meeting_load_hours_week"] = _get_scalar(raw_signals, "meeting_load_hours_week", 10.0)
    features["after_hours_activity"] = _get_scalar(raw_signals, "after_hours_activity", 0.0)
    features["manager_1on1_days_since"] = _get_scalar(raw_signals, "manager_1on1_days_since", 14.0)
    features["peer_interaction_count"] = _get_scalar(raw_signals, "peer_interaction_count", 20.0)
    features["recognition_events_30d"] = _get_scalar(raw_signals, "recognition_events_30d", 0.0)

    # Role / org
    features["role_change_flag"] = _get_scalar(raw_signals, "role_change_flag", 0.0)
    features["tenure_months"] = _get_scalar(raw_signals, "tenure_months", 12.0)
    features["team_size"] = _get_scalar(raw_signals, "team_size", 8.0)
    features["span_of_control"] = _get_scalar(raw_signals, "span_of_control", 0.0)

    # Survey behavior
    features["survey_response_latency"] = _get_scalar(raw_signals, "survey_response_latency", 24.0)
    features["survey_completion_rate"] = _get_scalar(raw_signals, "survey_completion_rate", 0.8)

    # PsyCap
    features["psycap_composite"] = _get_scalar(raw_signals, "psycap_composite", 0.5)
    features["psycap_efficacy"] = _get_scalar(raw_signals, "psycap_efficacy", 0.5)
    features["psycap_resilience"] = _get_scalar(raw_signals, "psycap_resilience", 0.5)
    features["psycap_hope"] = _get_scalar(raw_signals, "psycap_hope", 0.5)
    features["psycap_optimism"] = _get_scalar(raw_signals, "psycap_optimism", 0.5)

    # Leave / training / events
    features["leave_balance_ratio"] = _get_scalar(raw_signals, "leave_balance_ratio", 1.0)
    features["training_hours_30d"] = _get_scalar(raw_signals, "training_hours_30d", 0.0)
    features["negative_events_90d"] = _get_scalar(raw_signals, "negative_events_90d", 0.0)
    features["positive_events_90d"] = _get_scalar(raw_signals, "positive_events_90d", 0.0)

    # Validate feature count
    missing = set(FEATURE_NAMES) - set(features.keys())
    if missing:
        logger.warning("missing_features", missing=list(missing))
        for name in missing:
            features[name] = 0.0

    return features


def compute_slope(series: list[float] | np.ndarray, window: int = 4) -> float:
    """Compute linear slope over the last `window` points.

    Heuristic v0.1: simple OLS slope normalized by value range.
    """
    arr = np.array(series[-window:], dtype=np.float64)
    if len(arr) < 2:
        return 0.0
    x = np.arange(len(arr), dtype=np.float64)
    # OLS slope: cov(x,y) / var(x)
    x_mean = x.mean()
    y_mean = arr.mean()
    numerator = np.sum((x - x_mean) * (arr - y_mean))
    denominator = np.sum((x - x_mean) ** 2)
    if denominator == 0:
        return 0.0
    return float(numerator / denominator)


def compute_volatility(series: list[float] | np.ndarray) -> float:
    """Compute volatility (standard deviation of differences).

    Heuristic v0.1: std of first differences.
    """
    arr = np.array(series, dtype=np.float64)
    if len(arr) < 2:
        return 0.0
    diffs = np.diff(arr)
    return float(np.std(diffs))


def compute_ema(series: list[float] | np.ndarray, halflife: int = 3) -> float:
    """Compute exponential moving average with given halflife.

    Heuristic v0.1: simple EMA approximation.
    """
    arr = np.array(series, dtype=np.float64)
    if len(arr) == 0:
        return 0.0
    alpha = 1 - np.exp(-np.log(2) / max(halflife, 1))
    ema = arr[0]
    for val in arr[1:]:
        ema = alpha * val + (1 - alpha) * ema
    return float(ema)


def _get_scalar(signals: dict[str, list[float] | float], key: str, default: float) -> float:
    """Extract a scalar value from signals dict."""
    val = signals.get(key)
    if val is None:
        return default
    if isinstance(val, list):
        return float(val[-1]) if val else default
    return float(val)


def _get_series(signals: dict[str, list[float] | float], key: str) -> list[float]:
    """Extract a time series from signals dict."""
    val = signals.get(key)
    if val is None:
        return []
    if isinstance(val, list):
        return [float(v) for v in val]
    return [float(val)]
