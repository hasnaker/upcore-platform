"""Unit tests for COPSOQ-III-TR scoring."""

from __future__ import annotations

import pytest

from app.schemas.common import TrafficLight
from app.scoring.copsoq_scoring import score_copsoq, transform_to_100


class TestTransformTo100:
    """Test linear transform to 0-100 scale."""

    def test_min_value(self) -> None:
        assert transform_to_100(1.0, 1, 5) == pytest.approx(0.0, abs=1e-6)

    def test_max_value(self) -> None:
        assert transform_to_100(5.0, 1, 5) == pytest.approx(100.0, abs=1e-6)

    def test_mid_value(self) -> None:
        assert transform_to_100(3.0, 1, 5) == pytest.approx(50.0, abs=1e-6)

    def test_equal_min_max(self) -> None:
        assert transform_to_100(3.0, 3, 3) == pytest.approx(0.0, abs=1e-6)


class TestScoreCopsoq:
    """Integration test for COPSOQ scoring."""

    def test_all_mid_returns_subscales(self) -> None:
        responses = {f"copsoq_{i:02d}": 3 for i in range(1, 41)}
        result = score_copsoq(responses)
        assert "subscales" in result
        assert "demands_index" in result
        assert "resources_index" in result
        assert "reliability" in result
        assert "metadata" in result

    def test_all_mid_demands_index(self) -> None:
        responses = {f"copsoq_{i:02d}": 3 for i in range(1, 41)}
        result = score_copsoq(responses)
        # All items = 3 on 1-5 scale => transform = ((3-1)/(5-1))*100 = 50.0
        assert result["demands_index"] == pytest.approx(50.0, abs=1e-2)

    def test_all_min_scores(self) -> None:
        responses = {f"copsoq_{i:02d}": 1 for i in range(1, 41)}
        result = score_copsoq(responses)
        assert result["demands_index"] == pytest.approx(0.0, abs=1e-2)

    def test_all_max_scores(self) -> None:
        responses = {f"copsoq_{i:02d}": 5 for i in range(1, 41)}
        result = score_copsoq(responses)
        assert result["demands_index"] == pytest.approx(100.0, abs=1e-2)

    def test_subscale_classifications(self) -> None:
        responses = {f"copsoq_{i:02d}": 3 for i in range(1, 41)}
        result = score_copsoq(responses)
        for subscale in result["subscales"]:
            assert subscale.classification in (
                TrafficLight.GREEN,
                TrafficLight.AMBER,
                TrafficLight.RED,
            )

    def test_determinism(self) -> None:
        responses = {f"copsoq_{i:02d}": i % 5 + 1 for i in range(1, 41)}
        r1 = score_copsoq(responses)
        r2 = score_copsoq(responses)
        assert r1["demands_index"] == r2["demands_index"]
        assert r1["resources_index"] == r2["resources_index"]
