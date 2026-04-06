"""Unit tests for UpCap-TR scoring.

Tests reverse-coding correctness and reliability warning emission.
"""

from __future__ import annotations

import pytest

from app.scoring.upcap_scoring import (
    REVERSE_CODED_ITEMS,
    compute_subscale_means,
    compute_upcap_composite,
    reverse_code,
    score_upcap,
)


class TestReverseCode:
    """Test item reverse coding on 1-6 scale."""

    def test_reverse_coded_item(self) -> None:
        # upcap_05 is reverse coded: 7 - value
        assert reverse_code("upcap_05", 1) == 6
        assert reverse_code("upcap_05", 6) == 1
        assert reverse_code("upcap_05", 3) == 4
        assert reverse_code("upcap_05", 4) == 3

    def test_non_reverse_item(self) -> None:
        assert reverse_code("upcap_01", 4) == 4
        assert reverse_code("upcap_01", 1) == 1

    def test_all_reverse_items_known(self) -> None:
        assert REVERSE_CODED_ITEMS == frozenset({"upcap_05", "upcap_08", "upcap_11"})

    def test_reverse_code_symmetry(self) -> None:
        """Reverse coding twice returns original value."""
        for item in REVERSE_CODED_ITEMS:
            for val in range(1, 7):
                assert reverse_code(item, reverse_code(item, val)) == val


class TestComputeSubscaleMeans:
    """Test subscale mean calculations with reverse coding."""

    def test_all_same(self) -> None:
        responses = {f"upcap_{i:02d}": 4 for i in range(1, 13)}
        scores = compute_subscale_means(responses)
        # Non-reverse items stay 4, reverse items: 7-4=3
        # Hope: (4+4+4)/3 = 4.0
        assert scores["hope"] == pytest.approx(4.0, abs=1e-6)
        # Efficacy: (4+3+4)/3 = 3.667 (upcap_05 is reverse)
        assert scores["efficacy"] == pytest.approx(11.0 / 3, abs=1e-6)

    def test_all_max(self) -> None:
        responses = {f"upcap_{i:02d}": 6 for i in range(1, 13)}
        scores = compute_subscale_means(responses)
        # Hope: (6+6+6)/3 = 6.0
        assert scores["hope"] == pytest.approx(6.0, abs=1e-6)
        # Efficacy: (6+1+6)/3 = 4.333 (upcap_05: 7-6=1)
        assert scores["efficacy"] == pytest.approx(13.0 / 3, abs=1e-6)


class TestComputeComposite:
    """Test composite PsyCap score."""

    def test_equal_subscales(self) -> None:
        subscales = {"hope": 4.0, "efficacy": 4.0, "resilience": 4.0, "optimism": 4.0}
        assert compute_upcap_composite(subscales) == pytest.approx(4.0, abs=1e-6)

    def test_varied_subscales(self) -> None:
        subscales = {"hope": 5.0, "efficacy": 3.0, "resilience": 4.0, "optimism": 2.0}
        assert compute_upcap_composite(subscales) == pytest.approx(3.5, abs=1e-6)


class TestScoreUpcap:
    """Integration test for full UpCap scoring."""

    def test_returns_all_fields(self) -> None:
        responses = {f"upcap_{i:02d}": 4 for i in range(1, 13)}
        result = score_upcap(responses)
        assert "subscales" in result
        assert "composite_score" in result
        assert "reliability" in result
        assert "reliability_warning" in result
        assert "metadata" in result

    def test_reliability_warning_always_true_single_respondent(self) -> None:
        """Single respondent => alpha is None => warning should be True."""
        responses = {f"upcap_{i:02d}": 4 for i in range(1, 13)}
        result = score_upcap(responses)
        assert result["reliability_warning"] is True

    def test_determinism(self) -> None:
        responses = {f"upcap_{i:02d}": i % 6 + 1 for i in range(1, 13)}
        r1 = score_upcap(responses)
        r2 = score_upcap(responses)
        assert r1["composite_score"] == r2["composite_score"]
        assert r1["subscales"] == r2["subscales"]
