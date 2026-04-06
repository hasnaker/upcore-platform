"""Unit tests for percentile calculations."""

from __future__ import annotations

import numpy as np
import pytest

from app.psychometrics.percentiles import empirical_percentile, z_score_to_percentile


class TestEmpiricalPercentile:
    """Test empirical percentile rank computation."""

    def test_min_value(self) -> None:
        dist = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        assert empirical_percentile(1.0, dist) == 10  # (0 + 0.5*1)/5 * 100 = 10

    def test_max_value(self) -> None:
        dist = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        assert empirical_percentile(5.0, dist) == 90  # (4 + 0.5*1)/5 * 100 = 90

    def test_median_value(self) -> None:
        dist = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        assert empirical_percentile(3.0, dist) == 50  # (2 + 0.5*1)/5 * 100 = 50

    def test_below_min(self) -> None:
        dist = np.array([1.0, 2.0, 3.0])
        p = empirical_percentile(0.0, dist)
        assert p == 0

    def test_above_max(self) -> None:
        dist = np.array([1.0, 2.0, 3.0])
        p = empirical_percentile(10.0, dist)
        assert p == 100

    def test_empty_distribution(self) -> None:
        dist = np.array([])
        assert empirical_percentile(3.0, dist) == 50

    def test_repeated_values(self) -> None:
        dist = np.array([3.0, 3.0, 3.0, 3.0, 3.0])
        p = empirical_percentile(3.0, dist)
        assert p == 50  # (0 + 0.5*5)/5 * 100 = 50


class TestZScoreToPercentile:
    """Test z-score to percentile conversion."""

    def test_zero(self) -> None:
        assert z_score_to_percentile(0.0) == 50

    def test_positive(self) -> None:
        p = z_score_to_percentile(1.0)
        assert p == 84  # 84.13 -> 84

    def test_negative(self) -> None:
        p = z_score_to_percentile(-1.0)
        assert p == 16  # 15.87 -> 16

    def test_extreme_positive(self) -> None:
        p = z_score_to_percentile(4.0)
        assert p == 100

    def test_extreme_negative(self) -> None:
        p = z_score_to_percentile(-4.0)
        assert p == 0
