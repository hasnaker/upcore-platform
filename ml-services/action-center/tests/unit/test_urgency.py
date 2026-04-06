"""Tests for urgency scoring."""

from __future__ import annotations

import pytest

from app.scoring.urgency import compute_urgency


class TestComputeUrgency:
    def test_red_band_high_urgency(self) -> None:
        """RED band should have high base urgency."""
        u = compute_urgency("RED", 30, 0.0)
        assert u >= 0.85

    def test_green_band_low_urgency(self) -> None:
        """GREEN band should have low base urgency."""
        u = compute_urgency("GREEN", 90, 0.0)
        assert u <= 0.30

    def test_positive_slope_increases(self) -> None:
        """Worsening trend should increase urgency."""
        u_flat = compute_urgency("AMBER", 30, 0.0)
        u_rising = compute_urgency("AMBER", 30, 0.6)
        assert u_rising > u_flat

    def test_near_horizon_increases(self) -> None:
        """Near-term horizon should increase urgency."""
        u_far = compute_urgency("AMBER", 90, 0.0)
        u_near = compute_urgency("AMBER", 20, 0.0)
        assert u_near > u_far

    def test_bounded(self) -> None:
        """Urgency should always be in [0, 1]."""
        for band in ["RED", "AMBER", "GREEN"]:
            for days in [7, 30, 90]:
                for slope in [0.0, 0.3, 0.8]:
                    u = compute_urgency(band, days, slope)
                    assert 0.0 <= u <= 1.0
