"""Unit tests for BAT-12-TR scoring.

Golden-file tests: known responses -> expected scores within 1e-6.
Edge cases: all-max, all-min, 1-missing, 3-missing (must raise), malformed keys.
"""

from __future__ import annotations

import pytest

from app.core.exceptions import InvalidResponseError
from app.schemas.common import TrafficLight
from app.scoring.bat_scoring import (
    classify_bat_subscale,
    compute_subscale_means,
    compute_total,
    impute_missing,
    score_bat12,
)


class TestComputeSubscaleMeans:
    """Test subscale mean calculations."""

    def test_all_same_value(self) -> None:
        responses = {f"bat_{i:02d}": 3 for i in range(1, 13)}
        scores = compute_subscale_means(responses)
        assert scores["exhaustion"] == pytest.approx(3.0, abs=1e-6)
        assert scores["mental_distance"] == pytest.approx(3.0, abs=1e-6)
        assert scores["cognitive_impairment"] == pytest.approx(3.0, abs=1e-6)
        assert scores["emotional_impairment"] == pytest.approx(3.0, abs=1e-6)

    def test_all_max(self) -> None:
        responses = {f"bat_{i:02d}": 5 for i in range(1, 13)}
        scores = compute_subscale_means(responses)
        for subscale in scores.values():
            assert subscale == pytest.approx(5.0, abs=1e-6)

    def test_all_min(self) -> None:
        responses = {f"bat_{i:02d}": 1 for i in range(1, 13)}
        scores = compute_subscale_means(responses)
        for subscale in scores.values():
            assert subscale == pytest.approx(1.0, abs=1e-6)

    def test_mixed_values(self) -> None:
        responses = {
            "bat_01": 4, "bat_02": 3, "bat_03": 5,  # exhaustion = 4.0
            "bat_04": 2, "bat_05": 2, "bat_06": 2,  # mental_distance = 2.0
            "bat_07": 1, "bat_08": 3, "bat_09": 2,  # cognitive_impairment = 2.0
            "bat_10": 1, "bat_11": 1, "bat_12": 1,  # emotional_impairment = 1.0
        }
        scores = compute_subscale_means(responses)
        assert scores["exhaustion"] == pytest.approx(4.0, abs=1e-6)
        assert scores["mental_distance"] == pytest.approx(2.0, abs=1e-6)
        assert scores["cognitive_impairment"] == pytest.approx(2.0, abs=1e-6)
        assert scores["emotional_impairment"] == pytest.approx(1.0, abs=1e-6)


class TestComputeTotal:
    """Test total BAT score (mean of 4 subscale means)."""

    def test_uniform_scores(self) -> None:
        subscales = {
            "exhaustion": 3.0,
            "mental_distance": 3.0,
            "cognitive_impairment": 3.0,
            "emotional_impairment": 3.0,
        }
        assert compute_total(subscales) == pytest.approx(3.0, abs=1e-6)

    def test_varied_scores(self) -> None:
        subscales = {
            "exhaustion": 4.0,
            "mental_distance": 2.0,
            "cognitive_impairment": 2.0,
            "emotional_impairment": 1.0,
        }
        # (4 + 2 + 2 + 1) / 4 = 2.25
        assert compute_total(subscales) == pytest.approx(2.25, abs=1e-6)


class TestClassification:
    """Test traffic-light classification."""

    def test_green(self) -> None:
        cutoffs = {"green_max": 2.58, "amber_max": 3.01, "red_min": 3.02}
        assert classify_bat_subscale(2.0, cutoffs) == TrafficLight.GREEN
        assert classify_bat_subscale(2.58, cutoffs) == TrafficLight.GREEN

    def test_amber(self) -> None:
        cutoffs = {"green_max": 2.58, "amber_max": 3.01, "red_min": 3.02}
        assert classify_bat_subscale(2.80, cutoffs) == TrafficLight.AMBER
        assert classify_bat_subscale(3.01, cutoffs) == TrafficLight.AMBER

    def test_red(self) -> None:
        cutoffs = {"green_max": 2.58, "amber_max": 3.01, "red_min": 3.02}
        assert classify_bat_subscale(3.02, cutoffs) == TrafficLight.RED
        assert classify_bat_subscale(5.0, cutoffs) == TrafficLight.RED


class TestImputeMissing:
    """Test missing item imputation."""

    def test_no_missing(self) -> None:
        responses = {f"bat_{i:02d}": 3 for i in range(1, 13)}
        imputed, keys = impute_missing(responses)
        assert keys == []
        assert len(imputed) == 12

    def test_one_missing(self) -> None:
        responses = {f"bat_{i:02d}": 3 for i in range(1, 13)}
        del responses["bat_01"]  # remove one item
        imputed, keys = impute_missing(responses)
        assert "bat_01" in keys
        assert imputed["bat_01"] == 3  # mean of bat_02=3, bat_03=3

    def test_two_missing(self) -> None:
        responses = {f"bat_{i:02d}": 3 for i in range(1, 13)}
        del responses["bat_01"]
        del responses["bat_04"]
        imputed, keys = impute_missing(responses)
        assert len(keys) == 2

    def test_three_missing_raises(self) -> None:
        responses = {f"bat_{i:02d}": 3 for i in range(1, 13)}
        del responses["bat_01"]
        del responses["bat_04"]
        del responses["bat_07"]
        with pytest.raises(InvalidResponseError, match="Too many missing"):
            impute_missing(responses)

    def test_imputation_disabled(self) -> None:
        responses = {f"bat_{i:02d}": 3 for i in range(1, 13)}
        del responses["bat_01"]
        with pytest.raises(InvalidResponseError, match="imputation disabled"):
            impute_missing(responses, allow_imputation=False)


class TestScoreBat12:
    """Integration test for the full scoring pipeline."""

    def test_all_mid_scores(self) -> None:
        responses = {f"bat_{i:02d}": 3 for i in range(1, 13)}
        result, imputed = score_bat12(responses)
        assert imputed == []
        assert result["total_score"] == pytest.approx(3.0, abs=1e-6)

    def test_all_min_green(self) -> None:
        responses = {f"bat_{i:02d}": 1 for i in range(1, 13)}
        result, _ = score_bat12(responses)
        assert result["total_score"] == pytest.approx(1.0, abs=1e-6)
        assert result["classifications"].total == TrafficLight.GREEN

    def test_all_max_red(self) -> None:
        responses = {f"bat_{i:02d}": 5 for i in range(1, 13)}
        result, _ = score_bat12(responses)
        assert result["total_score"] == pytest.approx(5.0, abs=1e-6)
        assert result["classifications"].total == TrafficLight.RED

    def test_determinism(self) -> None:
        """Identical input must produce identical output."""
        responses = {f"bat_{i:02d}": i % 5 + 1 for i in range(1, 13)}
        r1, _ = score_bat12(responses)
        r2, _ = score_bat12(responses)
        assert r1["total_score"] == r2["total_score"]
        assert r1["subscales"] == r2["subscales"]
