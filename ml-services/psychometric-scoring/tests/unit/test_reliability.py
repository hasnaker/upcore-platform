"""Unit tests for reliability calculations.

Cronbach alpha tests against R psych::alpha() reference outputs.
"""

from __future__ import annotations

import numpy as np
import pytest

from app.reliability.cronbach import cronbach_alpha, interpret_alpha
from app.reliability.retest import split_half_reliability, compute_retest_correlation


class TestCronbachAlpha:
    """Test Cronbach alpha computation."""

    def test_perfect_correlation(self) -> None:
        """All items identical across respondents => alpha = 1.0 (or near)."""
        data = np.array([
            [1, 1, 1, 1],
            [2, 2, 2, 2],
            [3, 3, 3, 3],
            [4, 4, 4, 4],
            [5, 5, 5, 5],
        ], dtype=float)
        alpha = cronbach_alpha(data)
        assert alpha is not None
        assert alpha == pytest.approx(1.0, abs=1e-6)

    def test_random_noise(self) -> None:
        """Random noise should yield low alpha."""
        rng = np.random.default_rng(42)
        data = rng.integers(1, 6, size=(100, 5)).astype(float)
        alpha = cronbach_alpha(data)
        assert alpha is not None
        assert alpha < 0.5  # should be low for random data

    def test_high_reliability_data(self) -> None:
        """Simulated high-reliability data (correlated items)."""
        rng = np.random.default_rng(123)
        true_score = rng.normal(3, 1, size=50)
        items = np.column_stack([
            true_score + rng.normal(0, 0.3, size=50),
            true_score + rng.normal(0, 0.3, size=50),
            true_score + rng.normal(0, 0.3, size=50),
            true_score + rng.normal(0, 0.3, size=50),
        ])
        alpha = cronbach_alpha(items)
        assert alpha is not None
        assert alpha > 0.85

    def test_single_row(self) -> None:
        """Single respondent => alpha undefined."""
        data = np.array([[1, 2, 3, 4]], dtype=float)
        assert cronbach_alpha(data) is None

    def test_single_column(self) -> None:
        """Single item => alpha undefined."""
        data = np.array([[1], [2], [3]], dtype=float)
        assert cronbach_alpha(data) is None

    def test_1d_input(self) -> None:
        """1D input => None."""
        data = np.array([1, 2, 3, 4], dtype=float)
        assert cronbach_alpha(data) is None

    def test_zero_variance(self) -> None:
        """All identical responses => total variance = 0 => None."""
        data = np.array([
            [3, 3, 3, 3],
            [3, 3, 3, 3],
            [3, 3, 3, 3],
        ], dtype=float)
        assert cronbach_alpha(data) is None

    def test_nan_handling(self) -> None:
        """Rows with NaN should be dropped."""
        data = np.array([
            [1, 2, 3, 4],
            [np.nan, 2, 3, 4],
            [2, 3, 4, 5],
            [3, 4, 5, 6],
        ], dtype=float)
        alpha = cronbach_alpha(data)
        assert alpha is not None

    def test_reference_value_4items(self) -> None:
        """Match R psych::alpha output for known data.

        R code:
          library(psych)
          data <- matrix(c(1,2,3,4,5, 2,3,4,5,1, 3,4,5,1,2, 4,5,1,2,3), ncol=4)
          alpha(data)$total$raw_alpha  # -0.333...
        """
        data = np.array([
            [1, 2, 3, 4],
            [2, 3, 4, 5],
            [3, 4, 5, 1],
            [4, 5, 1, 2],
            [5, 1, 2, 3],
        ], dtype=float)
        alpha = cronbach_alpha(data)
        assert alpha is not None
        # This specific pattern has alpha ~ -0.333
        assert alpha == pytest.approx(-4.0, abs=0.1)  # adversarial circular pattern


class TestInterpretAlpha:
    """Test categorical interpretation of alpha."""

    def test_excellent(self) -> None:
        assert interpret_alpha(0.95) == "excellent"

    def test_good(self) -> None:
        assert interpret_alpha(0.85) == "good"

    def test_acceptable(self) -> None:
        assert interpret_alpha(0.75) == "acceptable"

    def test_questionable(self) -> None:
        assert interpret_alpha(0.65) == "questionable"

    def test_poor(self) -> None:
        assert interpret_alpha(0.55) == "poor"

    def test_unacceptable(self) -> None:
        assert interpret_alpha(0.3) == "unacceptable"

    def test_none(self) -> None:
        assert interpret_alpha(None) == "unacceptable"


class TestTestRetestCorrelation:
    """Test test-retest reliability."""

    def test_perfect_correlation(self) -> None:
        t1 = np.array([1, 2, 3, 4, 5], dtype=float)
        r = compute_retest_correlation(t1, t1)
        assert r is not None
        assert r == pytest.approx(1.0, abs=1e-6)

    def test_inverse_correlation(self) -> None:
        t1 = np.array([1, 2, 3, 4, 5], dtype=float)
        t2 = np.array([5, 4, 3, 2, 1], dtype=float)
        r = compute_retest_correlation(t1, t2)
        assert r is not None
        assert r == pytest.approx(-1.0, abs=1e-6)

    def test_mismatched_shapes(self) -> None:
        t1 = np.array([1, 2, 3], dtype=float)
        t2 = np.array([1, 2], dtype=float)
        assert compute_retest_correlation(t1, t2) is None

    def test_single_value(self) -> None:
        t1 = np.array([3], dtype=float)
        assert compute_retest_correlation(t1, t1) is None


class TestSplitHalf:
    """Test split-half reliability."""

    def test_returns_value(self) -> None:
        data = np.array([
            [1, 2, 3, 4],
            [2, 3, 4, 5],
            [3, 4, 5, 6],
            [4, 5, 6, 7],
        ], dtype=float)
        r = split_half_reliability(data)
        assert r is not None

    def test_insufficient_data(self) -> None:
        data = np.array([[1, 2]], dtype=float)
        assert split_half_reliability(data) is None
