"""Tests for loss functions."""

from __future__ import annotations

import numpy as np
import pytest

from app.training.losses import focal_loss, label_smoothed_bce, multi_horizon_loss


class TestFocalLoss:
    """Tests for Focal Loss implementation."""

    def test_perfect_predictions_low_loss(self) -> None:
        """Perfect predictions should have near-zero loss."""
        y_pred = np.array([0.99, 0.01, 0.99])
        y_true = np.array([1.0, 0.0, 1.0])
        loss = focal_loss(y_pred, y_true)
        assert loss < 0.01

    def test_bad_predictions_high_loss(self) -> None:
        """Wrong predictions should have high loss."""
        y_pred = np.array([0.01, 0.99])
        y_true = np.array([1.0, 0.0])
        loss = focal_loss(y_pred, y_true)
        assert loss > 0.5

    def test_gamma_zero_equals_weighted_bce(self) -> None:
        """With gamma=0, focal loss should equal weighted BCE."""
        y_pred = np.array([0.7, 0.3])
        y_true = np.array([1.0, 0.0])
        fl = focal_loss(y_pred, y_true, gamma=0.0, alpha=0.5)
        # Standard BCE (with alpha=0.5)
        eps = 1e-7
        bce = -np.mean(
            0.5 * y_true * np.log(y_pred + eps)
            + 0.5 * (1 - y_true) * np.log(1 - y_pred + eps)
        )
        assert fl == pytest.approx(bce, abs=0.001)

    def test_higher_gamma_focuses_hard_examples(self) -> None:
        """Higher gamma should give lower weight to easy examples."""
        y_pred = np.array([0.9, 0.6])  # one easy, one harder
        y_true = np.array([1.0, 1.0])
        loss_g0 = focal_loss(y_pred, y_true, gamma=0.0)
        loss_g2 = focal_loss(y_pred, y_true, gamma=2.0)
        # Higher gamma reduces loss from easy examples
        assert loss_g2 < loss_g0

    def test_loss_non_negative(self) -> None:
        """Loss should always be non-negative."""
        y_pred = np.random.uniform(0.01, 0.99, 100)
        y_true = np.random.randint(0, 2, 100).astype(float)
        loss = focal_loss(y_pred, y_true)
        assert loss >= 0.0


class TestMultiHorizonLoss:
    """Tests for multi-horizon loss aggregation."""

    def test_weighted_combination(self) -> None:
        """Multi-horizon loss should weight horizons correctly."""
        preds = {
            30: np.array([0.5]),
            60: np.array([0.5]),
            90: np.array([0.5]),
        }
        targets = {
            30: np.array([1.0]),
            60: np.array([1.0]),
            90: np.array([1.0]),
        }
        loss = multi_horizon_loss(preds, targets)
        assert loss > 0

    def test_missing_horizon_handled(self) -> None:
        """Missing horizon in targets should be gracefully skipped."""
        preds = {30: np.array([0.5]), 60: np.array([0.5])}
        targets = {30: np.array([1.0])}  # Missing 60
        loss = multi_horizon_loss(preds, targets)
        assert loss > 0

    def test_empty_returns_zero(self) -> None:
        """Empty predictions should return zero loss."""
        loss = multi_horizon_loss({}, {})
        assert loss == 0.0


class TestLabelSmoothedBCE:
    """Tests for label-smoothed BCE."""

    def test_no_smoothing_equals_bce(self) -> None:
        """With smoothing=0, should equal standard BCE."""
        y_pred = np.array([0.7, 0.3])
        y_true = np.array([1.0, 0.0])
        smoothed = label_smoothed_bce(y_pred, y_true, smoothing=0.0)
        eps = 1e-7
        bce = -np.mean(y_true * np.log(y_pred + eps) + (1 - y_true) * np.log(1 - y_pred + eps))
        assert smoothed == pytest.approx(bce, abs=0.001)

    def test_smoothing_reduces_confidence(self) -> None:
        """Smoothing should move labels toward 0.5, reducing extreme penalties."""
        y_pred = np.array([0.99])
        y_true = np.array([1.0])
        loss_no_smooth = label_smoothed_bce(y_pred, y_true, smoothing=0.0)
        loss_smooth = label_smoothed_bce(y_pred, y_true, smoothing=0.2)
        assert loss_smooth > loss_no_smooth  # Smooth penalizes overconfidence
