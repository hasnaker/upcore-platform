"""Tests for priority scoring module."""

from __future__ import annotations

from uuid import uuid4

import pytest

from app.schemas.actions import ActionCandidate, ActionType, RankedAction
from app.scoring.priority import (
    break_ties,
    compute_priority,
    enforce_max_5,
    rank_actions,
)


class TestComputePriority:
    def test_all_ones(self) -> None:
        """All factors at 1.0 should produce 1.0 priority."""
        assert compute_priority(1.0, 1.0, 1.0, 1.0) == 1.0

    def test_all_zeros(self) -> None:
        """All factors at 0.0 should produce 0.0 priority."""
        assert compute_priority(0.0, 0.0, 0.0, 0.0) == 0.0

    def test_clamped_to_unit_interval(self) -> None:
        """Priority should always be in [0, 1]."""
        for _ in range(100):
            import random
            u = random.random()
            i = random.random()
            a = random.random()
            r = random.random()
            p = compute_priority(u, i, a, r)
            assert 0.0 <= p <= 1.0

    def test_zero_factor_zeros_result(self) -> None:
        """Any single zero factor should produce 0.0 priority."""
        assert compute_priority(0.0, 0.9, 0.9, 0.9) == 0.0
        assert compute_priority(0.9, 0.0, 0.9, 0.9) == 0.0
        assert compute_priority(0.9, 0.9, 0.0, 0.9) == 0.0
        assert compute_priority(0.9, 0.9, 0.9, 0.0) == 0.0

    def test_multiplicative(self) -> None:
        """Priority should be multiplicative."""
        p = compute_priority(0.5, 0.5, 0.5, 0.5)
        assert p == pytest.approx(0.0625)


def _make_ranked(score: float, band: str = "AMBER") -> RankedAction:
    candidate = ActionCandidate(
        action_type=ActionType.SCHEDULE_1ON1,
        target_id=uuid4(),
        target_name_masked="X. X.",
        title_tr="Test",
        title_en="Test",
        severity_band=band,
    )
    return RankedAction(candidate=candidate, priority_score=score)


class TestRankActions:
    def test_sorted_descending(self) -> None:
        """Actions should be sorted by priority descending."""
        actions = [_make_ranked(0.3), _make_ranked(0.9), _make_ranked(0.5)]
        ranked = rank_actions(actions)
        scores = [a.priority_score for a in ranked]
        assert scores == sorted(scores, reverse=True)


class TestEnforceMax5:
    def test_keeps_max_5(self) -> None:
        """Should return at most 5 actions."""
        actions = [_make_ranked(0.5) for _ in range(10)]
        result = enforce_max_5(actions)
        assert len(result) <= 5

    def test_fewer_than_5_unchanged(self) -> None:
        """3 actions should remain unchanged."""
        actions = [_make_ranked(0.5) for _ in range(3)]
        result = enforce_max_5(actions)
        assert len(result) == 3


class TestBreakTies:
    def test_red_before_amber_at_same_score(self) -> None:
        """RED severity should rank before AMBER at same priority."""
        red = _make_ranked(0.5, band="RED")
        amber = _make_ranked(0.5, band="AMBER")
        result = break_ties([amber, red])
        assert result[0].candidate.severity_band == "RED"

    def test_higher_score_first(self) -> None:
        """Higher priority score should come first regardless of band."""
        low = _make_ranked(0.3, band="RED")
        high = _make_ranked(0.9, band="GREEN")
        result = break_ties([low, high])
        assert result[0].priority_score > result[1].priority_score
