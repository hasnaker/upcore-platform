"""Tests for feature engineering pipeline."""

from __future__ import annotations

import numpy as np
import pytest

from app.features.engineering import (
    compute_ema,
    compute_slope,
    compute_volatility,
    engineer_features,
)
from app.features.feature_spec import FEATURE_COUNT, FEATURE_NAMES


class TestEngineerFeatures:
    """Tests for the engineer_features function."""

    def test_returns_all_42_features(self) -> None:
        """Feature vector must contain exactly 42 features."""
        result = engineer_features({})
        assert len(result) == FEATURE_COUNT
        for name in FEATURE_NAMES:
            assert name in result, f"Missing feature: {name}"

    def test_default_values_when_empty_signals(self) -> None:
        """All features should have valid defaults when no signals provided."""
        result = engineer_features({})
        for name, value in result.items():
            assert isinstance(value, (int, float)), f"Feature {name} is not numeric"
            assert not np.isnan(value), f"Feature {name} is NaN"

    def test_bat_composite_is_mean_of_subscales(self) -> None:
        """BAT composite should be mean of 4 subscales."""
        signals = {
            "bat_exhaustion": [3.0],
            "bat_distance_mean": 2.0,
            "bat_cognitive_mean": 4.0,
            "bat_emotional_mean": 1.0,
        }
        result = engineer_features(signals)
        expected = (3.0 + 2.0 + 4.0 + 1.0) / 4.0
        assert abs(result["bat_composite"] - expected) < 0.01

    def test_jdr_balance_ratio_computed(self) -> None:
        """JD-R balance ratio = resources / demands."""
        signals = {
            "jdr_resources_total": 60.0,
            "jdr_demands_total": 40.0,
        }
        result = engineer_features(signals)
        assert abs(result["jdr_balance_ratio"] - 1.5) < 0.01

    def test_overtime_ratio_computed(self) -> None:
        """Overtime ratio = overtime_hours / 160."""
        signals = {"overtime_hours_30d": 32.0}
        result = engineer_features(signals)
        assert abs(result["overtime_ratio"] - 0.2) < 0.01

    def test_series_features_use_last_value(self) -> None:
        """Scalar extraction from series should use last value."""
        signals = {"bat_exhaustion": [1.0, 2.0, 3.0, 4.0]}
        result = engineer_features(signals)
        assert result["bat_exhaustion_mean"] == pytest.approx(2.5, abs=0.01)


class TestComputeSlope:
    """Tests for linear slope computation."""

    def test_positive_slope(self) -> None:
        """Increasing series should have positive slope."""
        slope = compute_slope([1.0, 2.0, 3.0, 4.0], window=4)
        assert slope > 0

    def test_negative_slope(self) -> None:
        """Decreasing series should have negative slope."""
        slope = compute_slope([4.0, 3.0, 2.0, 1.0], window=4)
        assert slope < 0

    def test_flat_series_zero_slope(self) -> None:
        """Constant series should have zero slope."""
        slope = compute_slope([3.0, 3.0, 3.0, 3.0], window=4)
        assert abs(slope) < 0.001

    def test_single_point_returns_zero(self) -> None:
        """Single point should return zero slope."""
        slope = compute_slope([5.0], window=4)
        assert slope == 0.0

    def test_empty_series_returns_zero(self) -> None:
        """Empty series should return zero slope."""
        slope = compute_slope([], window=4)
        assert slope == 0.0


class TestComputeVolatility:
    """Tests for volatility computation."""

    def test_constant_series_zero_volatility(self) -> None:
        """Constant series should have zero volatility."""
        vol = compute_volatility([3.0, 3.0, 3.0])
        assert vol == 0.0

    def test_volatile_series_positive(self) -> None:
        """Volatile series should have positive volatility."""
        vol = compute_volatility([1.0, 5.0, 1.0, 5.0])
        assert vol > 0

    def test_single_point_zero(self) -> None:
        """Single point should have zero volatility."""
        vol = compute_volatility([5.0])
        assert vol == 0.0


class TestComputeEma:
    """Tests for EMA computation."""

    def test_single_value(self) -> None:
        """Single value EMA should return that value."""
        ema = compute_ema([5.0], halflife=3)
        assert ema == 5.0

    def test_recent_values_weighted_more(self) -> None:
        """EMA with recent high value should be higher than simple mean."""
        series = [1.0, 1.0, 1.0, 10.0]
        ema = compute_ema(series, halflife=2)
        simple_mean = np.mean(series)
        assert ema > simple_mean

    def test_empty_returns_zero(self) -> None:
        """Empty series should return 0."""
        ema = compute_ema([], halflife=3)
        assert ema == 0.0
