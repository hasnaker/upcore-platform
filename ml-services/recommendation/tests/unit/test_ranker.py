"""Tests for ranking and diversity modules."""

from __future__ import annotations

from uuid import uuid4

import pytest

from app.retrieval.ranker import (
    apply_diversity_mmr,
    compute_recency_factor,
    rank,
)
from app.schemas.internal import Candidate, RankedRecommendation


def _make_candidate(**kwargs) -> Candidate:
    defaults = {
        "intervention_id": uuid4(),
        "title_tr": "Test",
        "title_en": "Test",
        "evidence_tier": "B",
        "similarity": 0.8,
        "thompson_sample": 0.7,
        "cbr_score": 0.5,
        "recency_factor": 0.9,
        "expected_effect_size": 0.3,
        "time_to_effect_weeks": 4,
        "delivery_mode": "async",
    }
    defaults.update(kwargs)
    return Candidate(**defaults)


class TestRank:
    def test_returns_sorted_descending(self) -> None:
        """Results should be sorted by final_score descending."""
        candidates = [
            _make_candidate(similarity=0.3, thompson_sample=0.3),
            _make_candidate(similarity=0.9, thompson_sample=0.9),
            _make_candidate(similarity=0.6, thompson_sample=0.6),
        ]
        ranked = rank(candidates)
        scores = [r.final_score for r in ranked]
        assert scores == sorted(scores, reverse=True)

    def test_score_bounded(self) -> None:
        """All scores should be in [0, 1]."""
        candidates = [_make_candidate() for _ in range(5)]
        ranked = rank(candidates)
        for r in ranked:
            assert 0.0 <= r.final_score <= 1.0

    def test_evidence_tier_affects_score(self) -> None:
        """Tier A should score higher than tier C, all else equal."""
        c_a = _make_candidate(evidence_tier="A")
        c_c = _make_candidate(evidence_tier="C")
        ranked = rank([c_a, c_c])
        # Tier A should have higher score
        tier_a_score = [r for r in ranked if r.candidate.evidence_tier == "A"][0].final_score
        tier_c_score = [r for r in ranked if r.candidate.evidence_tier == "C"][0].final_score
        assert tier_a_score > tier_c_score


class TestRecencyFactor:
    def test_recent_is_high(self) -> None:
        """Recent items (0 days) should have factor near 1."""
        assert compute_recency_factor(0) == pytest.approx(1.0)

    def test_old_is_low(self) -> None:
        """Old items (360 days) should have low factor."""
        assert compute_recency_factor(360) < 0.2

    def test_monotonically_decreasing(self) -> None:
        """Factor should decrease with age."""
        factors = [compute_recency_factor(d) for d in [0, 30, 90, 180, 360]]
        for i in range(1, len(factors)):
            assert factors[i] < factors[i - 1]


class TestMMRDiversity:
    def test_returns_top_k(self) -> None:
        """MMR should return exactly top_k items."""
        ranked = [
            RankedRecommendation(candidate=_make_candidate(), final_score=0.9 - i * 0.1)
            for i in range(10)
        ]
        result = apply_diversity_mmr(ranked, lambda_=0.7, top_k=5)
        assert len(result) == 5

    def test_high_lambda_preserves_relevance(self) -> None:
        """With high lambda, top item should remain first."""
        ranked = [
            RankedRecommendation(candidate=_make_candidate(), final_score=0.95),
            RankedRecommendation(candidate=_make_candidate(), final_score=0.5),
        ]
        result = apply_diversity_mmr(ranked, lambda_=1.0, top_k=2)
        assert result[0].final_score >= result[1].final_score
