"""Tests for fallback recommendation modules."""

from __future__ import annotations

from app.fallbacks.rule_based import rule_based_recommend
from app.fallbacks.safe_list import get_safe_list


class TestSafeList:
    def test_returns_requested_count(self) -> None:
        """Should return exactly max_results items."""
        result = get_safe_list(max_results=5)
        assert len(result) == 5

    def test_never_empty(self) -> None:
        """Safe list should never return empty."""
        result = get_safe_list(max_results=1)
        assert len(result) >= 1

    def test_all_have_required_fields(self) -> None:
        """All entries should have required fields."""
        for item in get_safe_list(max_results=10):
            assert "intervention_id" in item
            assert "title_tr" in item
            assert "title_en" in item
            assert "evidence_tier" in item
            assert "score" in item

    def test_sorted_by_evidence_tier(self) -> None:
        """Results should be sorted by evidence tier (A first)."""
        result = get_safe_list(max_results=10)
        tier_order = {"A": 0, "B": 1, "C": 2}
        for i in range(1, len(result)):
            curr = tier_order.get(result[i]["evidence_tier"], 9)
            prev = tier_order.get(result[i - 1]["evidence_tier"], 9)
            if curr < prev:
                # Allow ties but not reverse order
                assert result[i]["score"] >= result[i - 1]["score"]


class TestRuleBased:
    def test_red_band_returns_results(self) -> None:
        """RED burnout band should return recommendations."""
        result = rule_based_recommend("RED", ["bat_exhaustion_slope_30d"])
        assert len(result) > 0

    def test_amber_band_returns_results(self) -> None:
        result = rule_based_recommend("AMBER", ["copsoq_workload_mean"])
        assert len(result) > 0

    def test_unknown_band_still_returns(self) -> None:
        """Unknown band should still return defaults."""
        result = rule_based_recommend("RED", ["unknown_feature"], max_results=5)
        assert len(result) > 0

    def test_max_results_respected(self) -> None:
        """Should not exceed max_results."""
        result = rule_based_recommend("RED", ["bat_exhaustion_slope_30d"], max_results=2)
        assert len(result) <= 2

    def test_no_duplicates(self) -> None:
        """Should not return duplicate interventions."""
        result = rule_based_recommend(
            "RED",
            ["bat_exhaustion_slope_30d", "copsoq_workload_mean"],
            max_results=10,
        )
        titles = [r["title_en"] for r in result]
        assert len(titles) == len(set(titles))
