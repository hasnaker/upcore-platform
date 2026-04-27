"""Unit tests for UpCap-TR v1.0 scoring (upc-upcap-validation skill).

Covers: reverse coding, factor composition, composite, percentile lookup,
T-score transform, sector comparison, validation disclaimer.
"""

from __future__ import annotations

import pytest

from app.scoring.upcap_tr_scoring import (
    FACTOR_MAP,
    N_FACTORS,
    N_ITEMS,
    REVERSE_CODED_ITEMS,
    SCALE_MAX,
    SCALE_MIN,
    UPCAP_TR_ITEM_KEYS,
    apply_reverse_coding,
    compute_composite,
    compute_factor_scores,
    compute_t_score_from_map,
    interpret_t_score,
    linear_interpolate_percentile,
    raw_to_t_score,
    reverse_code,
    score_upcap_tr,
    validate_responses,
)


# ────────────────────────────────────────────────────────────────────────────
# Structural invariants
# ────────────────────────────────────────────────────────────────────────────
class TestScaleShape:
    def test_item_count(self) -> None:
        assert N_ITEMS == 12
        assert len(UPCAP_TR_ITEM_KEYS) == 12

    def test_factor_count(self) -> None:
        assert N_FACTORS == 3
        assert set(FACTOR_MAP.keys()) == {"hope_optimism", "resilience", "self_efficacy"}

    def test_four_items_per_factor(self) -> None:
        for factor, items in FACTOR_MAP.items():
            assert len(items) == 4, f"{factor} must have 4 items"

    def test_reverse_coded_items(self) -> None:
        # One reverse item per factor (CPC-12 convention)
        assert frozenset({"upcap_04", "upcap_08", "upcap_12"}) == REVERSE_CODED_ITEMS

    def test_items_union_covers_all(self) -> None:
        union: set[str] = set()
        for items in FACTOR_MAP.values():
            union |= set(items)
        assert union == set(UPCAP_TR_ITEM_KEYS)


# ────────────────────────────────────────────────────────────────────────────
# Reverse coding
# ────────────────────────────────────────────────────────────────────────────
class TestReverseCode:
    def test_reverse_item_1_to_6(self) -> None:
        assert reverse_code("upcap_04", 1) == 6
        assert reverse_code("upcap_04", 6) == 1
        assert reverse_code("upcap_08", 3) == 4
        assert reverse_code("upcap_12", 4) == 3

    def test_non_reverse_item_unchanged(self) -> None:
        assert reverse_code("upcap_01", 4) == 4
        assert reverse_code("upcap_05", 1) == 1
        assert reverse_code("upcap_09", 6) == 6

    def test_double_reverse_is_identity(self) -> None:
        for item in REVERSE_CODED_ITEMS:
            for v in range(SCALE_MIN, SCALE_MAX + 1):
                assert reverse_code(item, reverse_code(item, v)) == v


# ────────────────────────────────────────────────────────────────────────────
# Validation
# ────────────────────────────────────────────────────────────────────────────
class TestValidate:
    def test_accepts_complete_12(self) -> None:
        r = dict.fromkeys(UPCAP_TR_ITEM_KEYS, 4)
        validate_responses(r)  # no exception

    def test_rejects_missing(self) -> None:
        r = dict.fromkeys(UPCAP_TR_ITEM_KEYS[:11], 4)
        with pytest.raises(ValueError, match="expects exactly 12"):
            validate_responses(r)

    def test_rejects_out_of_range(self) -> None:
        r = dict.fromkeys(UPCAP_TR_ITEM_KEYS, 4)
        r["upcap_01"] = 7
        with pytest.raises(ValueError, match="outside range"):
            validate_responses(r)

    def test_rejects_unknown_key(self) -> None:
        r = dict.fromkeys(UPCAP_TR_ITEM_KEYS, 4)
        r.pop("upcap_12")
        r["bogus_01"] = 3
        with pytest.raises(ValueError):
            validate_responses(r)


# ────────────────────────────────────────────────────────────────────────────
# Factor scoring
# ────────────────────────────────────────────────────────────────────────────
class TestFactorScoring:
    def test_all_neutral_4_respects_reverse(self) -> None:
        r = dict.fromkeys(UPCAP_TR_ITEM_KEYS, 4)
        factors = compute_factor_scores(r)
        # Hope: (4 + 4 + 4 + (7-4)) / 4 = (4+4+4+3)/4 = 3.75
        assert factors["hope_optimism"] == pytest.approx(3.75, abs=1e-4)
        assert factors["resilience"] == pytest.approx(3.75, abs=1e-4)
        assert factors["self_efficacy"] == pytest.approx(3.75, abs=1e-4)

    def test_all_max_reverse_flips(self) -> None:
        r = dict.fromkeys(UPCAP_TR_ITEM_KEYS, 6)
        factors = compute_factor_scores(r)
        # Hope: (6+6+6+(7-6))/4 = 19/4 = 4.75
        assert factors["hope_optimism"] == pytest.approx(4.75, abs=1e-4)

    def test_all_min_reverse_flips(self) -> None:
        r = dict.fromkeys(UPCAP_TR_ITEM_KEYS, 1)
        factors = compute_factor_scores(r)
        # Hope: (1+1+1+(7-1))/4 = 9/4 = 2.25
        assert factors["hope_optimism"] == pytest.approx(2.25, abs=1e-4)

    def test_composite_equals_mean_of_factors(self) -> None:
        r = dict.fromkeys(UPCAP_TR_ITEM_KEYS, 5)
        factors = compute_factor_scores(r)
        composite = compute_composite(factors)
        assert composite == pytest.approx(sum(factors.values()) / 3, abs=1e-4)


# ────────────────────────────────────────────────────────────────────────────
# Percentile + T-score transforms
# ────────────────────────────────────────────────────────────────────────────
class TestPercentileLookup:
    def test_exact_match(self) -> None:
        table = {"3.0": 20, "4.0": 55, "5.0": 88}
        assert linear_interpolate_percentile(4.0, table) == 55.0

    def test_linear_interp_midpoint(self) -> None:
        table = {"3.0": 20, "4.0": 60}
        assert linear_interpolate_percentile(3.5, table) == pytest.approx(40.0, abs=1e-6)

    def test_clamp_below(self) -> None:
        table = {"3.0": 20, "5.0": 90}
        assert linear_interpolate_percentile(1.0, table) == 20.0

    def test_clamp_above(self) -> None:
        table = {"3.0": 20, "5.0": 90}
        assert linear_interpolate_percentile(6.0, table) == 90.0

    def test_empty_table_returns_50(self) -> None:
        assert linear_interpolate_percentile(4.0, {}) == 50.0


class TestTScore:
    def test_at_mean_is_50(self) -> None:
        assert raw_to_t_score(4.0, mean_score=4.0, sd_score=1.0) == 50.0

    def test_one_sd_above_is_60(self) -> None:
        assert raw_to_t_score(5.0, mean_score=4.0, sd_score=1.0) == 60.0

    def test_one_sd_below_is_40(self) -> None:
        assert raw_to_t_score(3.0, mean_score=4.0, sd_score=1.0) == 40.0

    def test_zero_sd_defaults_to_50(self) -> None:
        assert raw_to_t_score(5.0, mean_score=4.0, sd_score=0.0) == 50.0

    def test_map_interpolation(self) -> None:
        m = {"3.0": 35.0, "4.0": 50.0, "5.0": 65.0}
        assert compute_t_score_from_map(4.5, m) == pytest.approx(57.5, abs=1e-2)


class TestInterpret:
    def test_bands(self) -> None:
        assert "Çok yüksek" in interpret_t_score(70)
        assert "Yüksek" in interpret_t_score(58)
        assert "Ortalama" in interpret_t_score(50)
        assert "Düşük" in interpret_t_score(40)
        assert "Çok düşük" in interpret_t_score(25)


# ────────────────────────────────────────────────────────────────────────────
# Full-score integration
# ────────────────────────────────────────────────────────────────────────────
class TestScoreUpcapTR:
    def _mk_norm(self) -> dict[str, object]:
        return {
            "mean_score": 4.2,
            "sd_score": 0.8,
            "percentile_map": {
                "raw_to_pctl": {"2.0": 5, "3.0": 20, "4.0": 55, "5.0": 88, "6.0": 99}
            },
            "t_score_map": {
                "raw_to_t": {"2.0": 22.5, "3.0": 35.0, "4.0": 47.5, "5.0": 60.0, "6.0": 72.5}
            },
        }

    def test_full_score_returns_all_fields(self) -> None:
        r = dict.fromkeys(UPCAP_TR_ITEM_KEYS, 4)
        out = score_upcap_tr(r, overall_norm=self._mk_norm())
        assert 1.0 <= out.composite_score <= 6.0
        assert set(out.factors.keys()) == {"hope_optimism", "resilience", "self_efficacy"}
        assert 0.0 <= out.percentile <= 100.0
        assert 0.0 <= out.t_score <= 120.0
        assert out.validated is False  # default
        assert "doğrulama" in out.disclaimer

    def test_sector_comparison_included(self) -> None:
        r = dict.fromkeys(UPCAP_TR_ITEM_KEYS, 5)
        sector = {
            "mean_score": 4.1,
            "sd_score": 0.9,
            "percentile_map": {"raw_to_pctl": {"3.0": 20, "4.0": 55, "5.0": 88}},
        }
        out = score_upcap_tr(r, overall_norm=self._mk_norm(), sector_norm=sector)
        assert out.sector_comparison is not None
        assert out.sector_comparison["sector_mean"] == pytest.approx(4.1, abs=1e-4)
        assert "delta_from_sector_mean" in out.sector_comparison

    def test_determinism(self) -> None:
        r = {k: (i % 5) + 1 for i, k in enumerate(UPCAP_TR_ITEM_KEYS)}
        a = score_upcap_tr(r, overall_norm=self._mk_norm())
        b = score_upcap_tr(r, overall_norm=self._mk_norm())
        assert a.composite_score == b.composite_score
        assert a.factors == b.factors
        assert a.percentile == b.percentile
        assert a.t_score == b.t_score

    def test_validated_true_flag_propagates(self) -> None:
        r = dict.fromkeys(UPCAP_TR_ITEM_KEYS, 4)
        out = score_upcap_tr(r, overall_norm=self._mk_norm(), validated=True)
        assert out.validated is True


# ────────────────────────────────────────────────────────────────────────────
# Reverse-coding sanity — apply & map are consistent
# ────────────────────────────────────────────────────────────────────────────
class TestApplyReverseCoding:
    def test_only_flagged_change(self) -> None:
        r = dict.fromkeys(UPCAP_TR_ITEM_KEYS, 4)
        coded = apply_reverse_coding(r)
        for k, v in coded.items():
            if k in REVERSE_CODED_ITEMS:
                assert v == 3
            else:
                assert v == 4
