"""Tests for MC-Dropout inference utilities."""

from __future__ import annotations

import numpy as np
import pytest

from app.models.mc_dropout import (
    MCDropoutResult,
    compute_prediction_statistics,
    mc_forward_n_times,
    validate_mc_results,
)


class TestMCForwardNTimes:
    """Tests for the MC forward pass simulator."""

    def test_returns_correct_shape(self) -> None:
        """Output should have n_samples entries."""
        inputs = np.array([[0.5, 0.3, 0.7]], dtype=np.float32)
        def predict_fn(x: np.ndarray) -> np.ndarray:
            return np.sum(x, axis=-1)

        result = mc_forward_n_times(predict_fn, inputs, n_samples=20)
        assert result.shape[0] == 20

    def test_dropout_creates_variation(self) -> None:
        """MC samples should not be identical (dropout adds noise)."""
        inputs = np.ones((1, 10), dtype=np.float32) * 0.5
        def predict_fn(x: np.ndarray) -> np.ndarray:
            return np.sum(x, axis=-1)

        result = mc_forward_n_times(predict_fn, inputs, n_samples=30, dropout_rate=0.2)
        assert np.std(result) > 0, "MC samples should have variation"

    def test_zero_dropout_rate(self) -> None:
        """With zero dropout, all samples should be identical."""
        inputs = np.ones((1, 5), dtype=np.float32) * 2.0
        def predict_fn(x: np.ndarray) -> np.ndarray:
            return np.sum(x, axis=-1)

        result = mc_forward_n_times(predict_fn, inputs, n_samples=10, dropout_rate=0.0)
        assert np.std(result) == pytest.approx(0.0, abs=1e-6)


class TestComputePredictionStatistics:
    """Tests for prediction statistics computation."""

    def test_mean_in_ci(self) -> None:
        """Mean should fall within the confidence interval."""
        samples = np.random.normal(0.5, 0.1, size=100)
        result = compute_prediction_statistics(samples)
        assert result.ci_lower <= result.mean <= result.ci_upper

    def test_ci_width_positive(self) -> None:
        """CI width should be positive for non-degenerate samples."""
        samples = np.random.normal(0.5, 0.1, size=100)
        result = compute_prediction_statistics(samples)
        assert result.ci_upper > result.ci_lower

    def test_std_positive(self) -> None:
        """Standard deviation should be positive for non-degenerate samples."""
        samples = np.random.normal(0.5, 0.1, size=100)
        result = compute_prediction_statistics(samples)
        assert result.std > 0

    def test_95_ci_covers_approximately_95_percent(self) -> None:
        """95% CI should cover approximately 95% of samples."""
        np.random.seed(42)
        samples = np.random.normal(0.5, 0.1, size=10000)
        result = compute_prediction_statistics(samples, confidence_level=0.95)
        coverage = np.mean((samples >= result.ci_lower) & (samples <= result.ci_upper))
        assert abs(coverage - 0.95) < 0.02

    def test_samples_stored(self) -> None:
        """All samples should be stored in result."""
        samples = np.array([0.1, 0.2, 0.3, 0.4, 0.5])
        result = compute_prediction_statistics(samples)
        assert len(result.samples) == 5


class TestValidateMCResults:
    """Tests for MC result validation."""

    def test_valid_result_no_warnings(self) -> None:
        """Valid result should produce no warnings."""
        result = MCDropoutResult(
            mean=0.5, ci_lower=0.4, ci_upper=0.6, std=0.05, samples=[0.4, 0.5, 0.6]
        )
        warnings = validate_mc_results(result)
        # Should have no warning about CI or mean (may warn about sample count)
        ci_warnings = [w for w in warnings if "CI" in w or "confidence" in w.lower()]
        assert len(ci_warnings) == 0

    def test_zero_std_warns(self) -> None:
        """Zero standard deviation should produce a warning."""
        result = MCDropoutResult(
            mean=0.5, ci_lower=0.5, ci_upper=0.5, std=0.0, samples=[0.5] * 30
        )
        warnings = validate_mc_results(result)
        assert any("standard deviation" in w.lower() for w in warnings)

    def test_wide_ci_warns(self) -> None:
        """Very wide CI should produce a warning."""
        result = MCDropoutResult(
            mean=0.5, ci_lower=0.05, ci_upper=0.95, std=0.3, samples=list(np.linspace(0, 1, 30))
        )
        warnings = validate_mc_results(result)
        assert any("wide" in w.lower() for w in warnings)
