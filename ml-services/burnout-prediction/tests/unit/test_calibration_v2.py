"""Tests for the V2 calibration pipeline (app/calibration.py).

Covers the Platt / Isotonic calibrators + Brier, ECE, reliability bins, and
the full ``build_calibration_report`` roll-up. Renamed ``_v2`` to keep the
older heuristic calibration tests (``test_calibration.py``) untouched.
"""

from __future__ import annotations

import numpy as np
import pytest

from app.calibration import (
    CalibrationReport,
    IsotonicCalibrator,
    PlattScalingCalibrator,
    binary_log_loss,
    brier_score,
    build_calibration_report,
    build_reliability_bins,
    calibration_plot_payload,
    expected_calibration_error,
    maximum_calibration_error,
)


def _synthetic(n: int = 400, noise: float = 0.0, seed: int = 7) -> tuple[np.ndarray, np.ndarray]:
    """Generate scores strongly correlated with labels for calibration tests."""
    rng = np.random.default_rng(seed)
    labels = rng.integers(0, 2, size=n).astype(float)
    # scores: true label shifted by noise; ideal for isotonic/Platt to map → prob
    scores = labels * 0.6 + rng.uniform(0.0, 0.4, size=n) + rng.normal(0, noise, size=n)
    scores = np.clip(scores, 0.0, 1.0)
    return scores, labels


class TestMetrics:
    def test_brier_perfect(self) -> None:
        probs = np.array([1.0, 0.0, 1.0, 0.0])
        labels = np.array([1.0, 0.0, 1.0, 0.0])
        assert brier_score(probs, labels) == pytest.approx(0.0)

    def test_ece_bounded(self) -> None:
        probs = np.random.default_rng(0).uniform(0, 1, 500)
        labels = (probs > 0.5).astype(float)
        ece = expected_calibration_error(probs, labels)
        assert 0.0 <= ece <= 1.0

    def test_mce_respects_worst_bin(self) -> None:
        probs = np.array([0.1, 0.1, 0.1, 0.9, 0.9, 0.9])
        labels = np.array([1.0, 1.0, 1.0, 0.0, 0.0, 0.0])  # inverted — very bad
        mce = maximum_calibration_error(probs, labels, n_bins=10)
        assert mce > 0.5

    def test_log_loss_handles_extreme_probs(self) -> None:
        # Should not blow up at probs exactly 0 or 1.
        probs = np.array([0.0, 1.0])
        labels = np.array([0.0, 1.0])
        loss = binary_log_loss(probs, labels)
        assert loss >= 0 and np.isfinite(loss)


class TestPlattScaling:
    def test_fit_predict_shape(self) -> None:
        scores, labels = _synthetic(200, noise=0.05)
        c = PlattScalingCalibrator().fit(scores, labels)
        probs = c.predict_proba(scores)
        assert probs.shape == scores.shape
        assert np.all((probs >= 0) & (probs <= 1))

    def test_calibration_reduces_brier(self) -> None:
        scores, labels = _synthetic(500, noise=0.2)
        # Raw scores are intentionally mis-calibrated — shifted by +0.3
        raw = np.clip(scores + 0.15, 0, 1)
        baseline = brier_score(raw, labels)
        c = PlattScalingCalibrator().fit(raw, labels)
        calibrated_brier = brier_score(c.predict_proba(raw), labels)
        assert calibrated_brier <= baseline + 1e-6

    def test_requires_minimum_samples(self) -> None:
        with pytest.raises(ValueError):
            PlattScalingCalibrator().fit(np.array([0.1, 0.9]), np.array([0, 1]))


class TestIsotonicCalibrator:
    def test_fit_predict_shape(self) -> None:
        scores, labels = _synthetic(200, noise=0.05)
        c = IsotonicCalibrator().fit(scores, labels)
        probs = c.predict_proba(scores)
        assert probs.shape == scores.shape
        assert np.all((probs >= 0) & (probs <= 1))

    def test_monotonic_output(self) -> None:
        """Isotonic should return a monotonic map of its training scores."""
        scores, labels = _synthetic(400, noise=0.05)
        c = IsotonicCalibrator().fit(scores, labels)
        sorted_scores = np.sort(np.unique(scores))
        mapped = c.predict_proba(sorted_scores)
        diffs = np.diff(mapped)
        # allow tiny numerical noise
        assert np.all(diffs >= -1e-9)


class TestReliabilityDiagram:
    def test_bins_count_matches(self) -> None:
        probs = np.linspace(0, 1, 200)
        labels = (probs > 0.5).astype(float)
        bins = build_reliability_bins(probs, labels, n_bins=10)
        assert len(bins) == 10
        assert sum(b.count for b in bins) == 200


class TestCalibrationReport:
    def test_report_passes_gates_on_good_probs(self) -> None:
        probs, labels = _synthetic(600, noise=0.02)
        # Run probs through isotonic for honest calibration
        c = IsotonicCalibrator().fit(probs, labels)
        calibrated = c.predict_proba(probs)
        report = build_calibration_report(
            probs=calibrated,
            labels=labels,
            model_version="v2-test",
            method="isotonic",
        )
        assert isinstance(report, CalibrationReport)
        assert report.n_samples == 600
        assert report.brier_score < 0.25  # generous
        assert 0.0 <= report.ece <= 1.0
        payload = calibration_plot_payload(report)
        assert "points" in payload
        assert len(payload["points"]) == 15  # default n_bins
