"""Unit tests for strengths inventory scoring."""

from __future__ import annotations

import pytest

from app.scoring.strengths_scoring import compute_domain_scores, rank_strengths, score_strengths


class TestComputeDomainScores:
    """Test domain score computation."""

    def test_all_same(self) -> None:
        responses = {f"str_{i:02d}": 3 for i in range(1, 25)}
        scores = compute_domain_scores(responses)
        assert len(scores) == 8
        for score in scores.values():
            assert score == pytest.approx(3.0, abs=1e-6)

    def test_varied_scores(self) -> None:
        responses = {f"str_{i:02d}": 5 for i in range(1, 4)}  # analytical = 5
        responses.update({f"str_{i:02d}": 1 for i in range(4, 7)})  # communication = 1
        responses.update({f"str_{i:02d}": 3 for i in range(7, 25)})  # rest = 3
        scores = compute_domain_scores(responses)
        assert scores["analytical_thinking"] == pytest.approx(5.0, abs=1e-6)
        assert scores["communication"] == pytest.approx(1.0, abs=1e-6)


class TestRankStrengths:
    """Test strength ranking."""

    def test_top_5_ordering(self) -> None:
        scores = {
            "analytical_thinking": 4.5,
            "communication": 3.0,
            "leadership": 4.0,
            "creativity": 5.0,
            "empathy": 2.5,
            "resilience": 3.5,
            "strategic_vision": 4.2,
            "collaboration": 3.8,
        }
        ranked = rank_strengths(scores)
        assert len(ranked) == 5
        assert ranked[0].domain_id == "creativity"
        assert ranked[0].rank == 1
        assert ranked[1].domain_id == "analytical_thinking"
        assert ranked[1].rank == 2

    def test_returns_at_most_5(self) -> None:
        scores = {f"domain_{i}": float(i) for i in range(8)}
        ranked = rank_strengths(scores)
        assert len(ranked) <= 5


class TestScoreStrengths:
    """Integration test for full strengths scoring."""

    def test_returns_all_fields(self) -> None:
        responses = {f"str_{i:02d}": 3 for i in range(1, 25)}
        result = score_strengths(responses)
        assert "top_5" in result
        assert "all_scores" in result
        assert "reliability" in result
        assert "metadata" in result

    def test_top_5_present(self) -> None:
        responses = {f"str_{i:02d}": 3 for i in range(1, 25)}
        result = score_strengths(responses)
        assert len(result["top_5"]) == 5

    def test_determinism(self) -> None:
        responses = {f"str_{i:02d}": i % 5 + 1 for i in range(1, 25)}
        r1 = score_strengths(responses)
        r2 = score_strengths(responses)
        assert r1["all_scores"] == r2["all_scores"]
        assert r1["top_5"][0].domain_id == r2["top_5"][0].domain_id
