"""Unit tests for traffic-light classifiers."""

from __future__ import annotations

import pytest

from app.psychometrics.classifiers import classify_risk_level, classify_traffic_light
from app.schemas.common import TrafficLight


class TestClassifyTrafficLight:
    """Test generic traffic-light classification."""

    def test_green_higher_is_worse(self) -> None:
        cutoffs = {"green_max": 2.58, "red_min": 3.02}
        assert classify_traffic_light(2.0, cutoffs) == TrafficLight.GREEN

    def test_amber_higher_is_worse(self) -> None:
        cutoffs = {"green_max": 2.58, "red_min": 3.02}
        assert classify_traffic_light(2.80, cutoffs) == TrafficLight.AMBER

    def test_red_higher_is_worse(self) -> None:
        cutoffs = {"green_max": 2.58, "red_min": 3.02}
        assert classify_traffic_light(4.0, cutoffs) == TrafficLight.RED

    def test_green_higher_is_better(self) -> None:
        cutoffs = {"green_min": 60.0, "red_max": 39.99}
        assert classify_traffic_light(75.0, cutoffs) == TrafficLight.GREEN

    def test_amber_higher_is_better(self) -> None:
        cutoffs = {"green_min": 60.0, "red_max": 39.99}
        assert classify_traffic_light(50.0, cutoffs) == TrafficLight.AMBER

    def test_red_higher_is_better(self) -> None:
        cutoffs = {"green_min": 60.0, "red_max": 39.99}
        assert classify_traffic_light(30.0, cutoffs) == TrafficLight.RED

    def test_empty_cutoffs_fallback(self) -> None:
        assert classify_traffic_light(3.0, {}) == TrafficLight.AMBER

    def test_boundary_green_max(self) -> None:
        cutoffs = {"green_max": 2.58, "red_min": 3.02}
        assert classify_traffic_light(2.58, cutoffs) == TrafficLight.GREEN

    def test_boundary_red_min(self) -> None:
        cutoffs = {"green_max": 2.58, "red_min": 3.02}
        assert classify_traffic_light(3.02, cutoffs) == TrafficLight.RED


class TestClassifyRiskLevel:
    """Test risk level classification based on standard deviations."""

    def test_low_risk(self) -> None:
        assert classify_risk_level(3.0, 1.0, 3.0) == "low"

    def test_medium_risk(self) -> None:
        assert classify_risk_level(5.0, 1.0, 3.0) == "medium"

    def test_high_risk(self) -> None:
        assert classify_risk_level(6.0, 1.0, 3.0) == "high"

    def test_zero_sd(self) -> None:
        assert classify_risk_level(3.0, 0.0, 3.0) == "medium"

    def test_within_one_sd(self) -> None:
        assert classify_risk_level(3.5, 1.0, 3.0) == "low"
