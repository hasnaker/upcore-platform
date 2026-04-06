"""Unit tests for JD-R balance scoring.

Tests Crawford (2010) meta-analytic coefficients yield documented values
on canonical synthetic cases.
"""

from __future__ import annotations

import pytest

from app.scoring.jdr_scoring import (
    BETA_DEMANDS,
    BETA_INTERACTION,
    BETA_RESOURCES,
    W_DEMANDS_STRAIN,
    W_PERSONAL_RESOURCES_ENGAGEMENT,
    W_RESOURCES_ENGAGEMENT,
    W_RESOURCES_STRAIN,
    compute_balance_ratio,
    compute_burnout_probability,
    compute_engagement,
    compute_interaction,
    compute_strain,
    score_jdr,
)


class TestComputeEngagement:
    """Test engagement score computation."""

    def test_zero_inputs(self) -> None:
        assert compute_engagement(0.0, 0.0) == pytest.approx(0.0, abs=1e-6)

    def test_positive_resources(self) -> None:
        # 0.48 * 1.0 + 0.39 * 0.0 = 0.48
        assert compute_engagement(1.0, 0.0) == pytest.approx(0.48, abs=1e-6)

    def test_with_personal_resources(self) -> None:
        # 0.48 * 1.0 + 0.39 * 1.0 = 0.87
        assert compute_engagement(1.0, 1.0) == pytest.approx(0.87, abs=1e-6)

    def test_none_personal_resources(self) -> None:
        # 0.48 * 1.0 + 0.39 * 0.0 = 0.48
        assert compute_engagement(1.0, None) == pytest.approx(0.48, abs=1e-6)


class TestComputeStrain:
    """Test strain score computation."""

    def test_zero_inputs(self) -> None:
        assert compute_strain(0.0, 0.0) == pytest.approx(0.0, abs=1e-6)

    def test_high_demands(self) -> None:
        # 0.51 * 2.0 + (-0.32) * 0.0 = 1.02
        assert compute_strain(2.0, 0.0) == pytest.approx(1.02, abs=1e-6)

    def test_balanced(self) -> None:
        # 0.51 * 1.0 + (-0.32) * 1.0 = 0.19
        assert compute_strain(1.0, 1.0) == pytest.approx(0.19, abs=1e-6)


class TestComputeInteraction:
    """Test demand x resource interaction."""

    def test_zero(self) -> None:
        assert compute_interaction(0.0, 0.0) == pytest.approx(0.0, abs=1e-6)

    def test_positive_both(self) -> None:
        # -0.05 * 1.0 * 1.0 = -0.05
        assert compute_interaction(1.0, 1.0) == pytest.approx(-0.05, abs=1e-6)

    def test_negative_demands(self) -> None:
        # -0.05 * (-1.0) * 1.0 = 0.05
        assert compute_interaction(-1.0, 1.0) == pytest.approx(0.05, abs=1e-6)


class TestComputeBalanceRatio:
    """Test balance index computation."""

    def test_balanced(self) -> None:
        assert compute_balance_ratio(1.0, 1.0) == pytest.approx(0.0, abs=1e-6)

    def test_favorable(self) -> None:
        assert compute_balance_ratio(0.5, 1.5) == pytest.approx(1.0, abs=1e-6)

    def test_unfavorable(self) -> None:
        assert compute_balance_ratio(2.0, 0.5) == pytest.approx(-1.5, abs=1e-6)


class TestComputeBurnoutProbability:
    """Test heuristic burnout probability."""

    def test_neutral(self) -> None:
        p = compute_burnout_probability(0.0, 0.0)
        assert p == pytest.approx(0.5, abs=1e-6)

    def test_high_demands_increases_prob(self) -> None:
        p = compute_burnout_probability(2.0, 0.0)
        assert p > 0.5

    def test_high_resources_decreases_prob(self) -> None:
        p = compute_burnout_probability(0.0, 2.0)
        assert p < 0.5

    def test_bounded_zero_one(self) -> None:
        p1 = compute_burnout_probability(5.0, -5.0)
        p2 = compute_burnout_probability(-5.0, 5.0)
        assert 0.0 <= p1 <= 1.0
        assert 0.0 <= p2 <= 1.0


class TestScoreJDR:
    """Integration test for full JD-R scoring."""

    def test_returns_all_fields(self) -> None:
        result = score_jdr(1.0, 1.0, 0.5)
        assert "burnout_probability" in result
        assert "balance_index" in result
        assert "engagement_score" in result
        assert "strain_score" in result
        assert "interaction_effect" in result
        assert "coefficients" in result
        assert "metadata" in result

    def test_determinism(self) -> None:
        r1 = score_jdr(1.5, -0.3, 0.8)
        r2 = score_jdr(1.5, -0.3, 0.8)
        assert r1["burnout_probability"] == r2["burnout_probability"]
        assert r1["engagement_score"] == r2["engagement_score"]

    def test_metadata_flags_heuristic(self) -> None:
        result = score_jdr(1.0, 1.0)
        assert result["metadata"].confidence.value == "heuristic"
        assert "v0.1" in result["metadata"].scorer
