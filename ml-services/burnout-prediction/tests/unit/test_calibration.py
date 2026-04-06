"""Tests for calibration utilities."""

from __future__ import annotations

import numpy as np
import pytest

from app.inference.calibration import (
    apply_temperature,
    compute_brier,
    compute_ece,
    fit_temperature,
    reliability_diagram,
)


class TestComputeECE:
    """Tests for Expected Calibration Error."""

    def test_perfect_calibration(self) -> None:
        """Perfectly calibrated predictions should have ECE near 0."""
        np.random.seed(42)
        n = 1000
        probs = np.random.uniform(0, 1, n)
        labels = (np.random.uniform(0, 1, n) < probs).astype(float)
        ece = compute_ece(probs, labels)
        assert ece < 0.1  # Allow some sampling noise

    def test_all_same_prediction(self) -> None:
        """All same prediction with mixed labels should have positive ECE."""
        probs = np.full(100, 0.5)
        labels = np.concatenate([np.ones(70), np.zeros(30)])
        ece = compute_ece(probs, labels)
        assert ece > 0

    def test_empty_returns_zero(self) -> None:
        """Empty arrays should return 0 ECE."""
        ece = compute_ece(np.array([]), np.array([]))
        assert ece == 0.0

    def test_ece_bounded(self) -> None:
        """ECE should be in [0, 1]."""
        probs = np.random.uniform(0, 1, 200)
        labels = np.random.randint(0, 2, 200).astype(float)
        ece = compute_ece(probs, labels)
        assert 0.0 <= ece <= 1.0


class TestComputeBrier:
    """Tests for Brier score."""

    def test_perfect_predictions(self) -> None:
        """Perfect predictions should have Brier score near 0."""
        probs = np.array([1.0, 0.0, 1.0, 0.0])
        labels = np.array([1.0, 0.0, 1.0, 0.0])
        brier = compute_brier(probs, labels)
        assert brier == pytest.approx(0.0)

    def test_worst_predictions(self) -> None:
        """Perfectly wrong predictions should have Brier score of 1."""
        probs = np.array([0.0, 1.0])
        labels = np.array([1.0, 0.0])
        brier = compute_brier(probs, labels)
        assert brier == pytest.approx(1.0)


class TestFitTemperature:
    """Tests for temperature scaling."""

    def test_returns_positive_temperature(self) -> None:
        """Fitted temperature should be positive."""
        logits = np.random.randn(200)
        labels = (logits > 0).astype(float)
        temp = fit_temperature(logits, labels)
        assert temp > 0

    def test_empty_logits_returns_one(self) -> None:
        """Empty input should return default temperature of 1.0."""
        temp = fit_temperature(np.array([]), np.array([]))
        assert temp == 1.0


class TestApplyTemperature:
    """Tests for temperature application."""

    def test_temperature_one_is_identity(self) -> None:
        """Temperature=1 should be close to standard sigmoid."""
        logits = np.array([0.0, 1.0, -1.0])
        probs = apply_temperature(logits, 1.0)
        assert probs[0] == pytest.approx(0.5, abs=0.01)

    def test_high_temperature_smooths(self) -> None:
        """High temperature should produce probabilities closer to 0.5."""
        logits = np.array([3.0, -3.0])
        probs_t1 = apply_temperature(logits, 1.0)
        probs_t5 = apply_temperature(logits, 5.0)
        # Higher temp → closer to 0.5
        assert abs(probs_t5[0] - 0.5) < abs(probs_t1[0] - 0.5)

    def test_invalid_temperature_raises(self) -> None:
        """Zero or negative temperature should raise ValueError."""
        with pytest.raises(ValueError):
            apply_temperature(np.array([1.0]), 0.0)


class TestReliabilityDiagram:
    """Tests for reliability diagram generation."""

    def test_returns_correct_bin_count(self) -> None:
        """Should return exactly n_bins entries."""
        probs = np.random.uniform(0, 1, 100)
        labels = np.random.randint(0, 2, 100).astype(float)
        bins = reliability_diagram(probs, labels, n_bins=10)
        assert len(bins) == 10

    def test_bin_centers_ordered(self) -> None:
        """Bin centers should be monotonically increasing."""
        probs = np.random.uniform(0, 1, 100)
        labels = np.random.randint(0, 2, 100).astype(float)
        bins = reliability_diagram(probs, labels, n_bins=15)
        centers = [b["bin_center"] for b in bins]
        assert centers == sorted(centers)
