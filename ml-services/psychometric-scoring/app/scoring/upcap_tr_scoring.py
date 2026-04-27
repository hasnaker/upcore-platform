"""UpCap-TR v1.0 scoring module (validation pipeline edition).

This module implements the canonical UpCap-TR v1.0 scoring spec used by the
academic validation pilot (upc-upcap-validation skill).

Scale structure (per migration 056):
    - 3 factors × 4 items = 12 items total
    - 6-point Likert (1-6)
    - Reverse-scored items: upcap_04 (hope_optimism), upcap_08 (resilience),
                            upcap_12 (self_efficacy)

Factors:
    - hope_optimism:  upcap_01, upcap_02, upcap_03, upcap_04(R)
    - resilience:     upcap_05, upcap_06, upcap_07, upcap_08(R)
    - self_efficacy:  upcap_09, upcap_10, upcap_11, upcap_12(R)

Percentile & T-score lookup:
    - Raw score -> percentile rank via linear interpolation on the norm table.
    - T-score: M=50, SD=10 (classical psychometric convention).

Disclaimer:
    Returns `validated=False` until DB record `psychometric_scales.validated`
    is flipped to TRUE after peer-review + Cronbach alpha >= 0.85.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from statistics import mean
from typing import Literal

UPCAP_TR_V1_SCALE_CODE = "upcap_tr"
UPCAP_TR_V1_VERSION = "1.0"
UPCAP_TR_V1_LOCALE = "tr-TR"

# Scale parameters
SCALE_MIN: int = 1
SCALE_MAX: int = 6
N_ITEMS: int = 12
N_FACTORS: int = 3
ITEMS_PER_FACTOR: int = 4

# Item keys (fixed order — must match migration 056 seed)
UPCAP_TR_ITEM_KEYS: tuple[str, ...] = tuple(f"upcap_{i:02d}" for i in range(1, N_ITEMS + 1))

# Reverse-scored items (one per factor, CPC-12 convention)
REVERSE_CODED_ITEMS: frozenset[str] = frozenset({"upcap_04", "upcap_08", "upcap_12"})

# Factor membership
Factor = Literal["hope_optimism", "resilience", "self_efficacy"]

FACTOR_MAP: dict[Factor, tuple[str, ...]] = {
    "hope_optimism": ("upcap_01", "upcap_02", "upcap_03", "upcap_04"),
    "resilience":    ("upcap_05", "upcap_06", "upcap_07", "upcap_08"),
    "self_efficacy": ("upcap_09", "upcap_10", "upcap_11", "upcap_12"),
}


# ────────────────────────────────────────────────────────────────────────────
# Core scoring
# ────────────────────────────────────────────────────────────────────────────
def reverse_code(item_id: str, value: int) -> int:
    """Reverse-code an item on a 1-6 scale: new = 7 - old."""
    if item_id in REVERSE_CODED_ITEMS:
        return (SCALE_MAX + SCALE_MIN) - value
    return value


def apply_reverse_coding(responses: dict[str, int]) -> dict[str, int]:
    """Return a new dict with reverse coding applied to flagged items."""
    return {k: reverse_code(k, v) for k, v in responses.items()}


def validate_responses(responses: dict[str, int]) -> None:
    """Validate shape, keys, and value range."""
    if len(responses) != N_ITEMS:
        raise ValueError(f"UpCap-TR v1.0 expects exactly {N_ITEMS} items, got {len(responses)}")
    expected = set(UPCAP_TR_ITEM_KEYS)
    missing = expected - set(responses.keys())
    if missing:
        raise ValueError(f"Missing UpCap-TR items: {sorted(missing)}")
    extra = set(responses.keys()) - expected
    if extra:
        raise ValueError(f"Unexpected UpCap-TR items: {sorted(extra)}")
    for key, val in responses.items():
        if not isinstance(val, int):
            raise ValueError(f"Item {key} must be integer, got {type(val).__name__}")
        if not SCALE_MIN <= val <= SCALE_MAX:
            raise ValueError(f"Item {key}={val} outside range [{SCALE_MIN},{SCALE_MAX}]")


def compute_factor_scores(responses: dict[str, int]) -> dict[str, float]:
    """Compute arithmetic mean for each of the 3 factors (reverse-coded)."""
    coded = apply_reverse_coding(responses)
    return {
        factor: round(mean(float(coded[k]) for k in items), 4)
        for factor, items in FACTOR_MAP.items()
    }


def compute_composite(factor_scores: dict[str, float]) -> float:
    """Composite = mean of 3 factor means."""
    return round(mean(factor_scores.values()), 4)


# ────────────────────────────────────────────────────────────────────────────
# Percentile + T-score transforms
# ────────────────────────────────────────────────────────────────────────────
def linear_interpolate_percentile(raw: float, raw_to_pctl: dict[str, float]) -> float:
    """Linear interpolation of raw score -> percentile from a sparse table.

    raw_to_pctl keys are raw-score strings (e.g. "3.5"), values are percentile.
    If raw is outside the table, clamp to edge values (3 / 99).
    """
    if not raw_to_pctl:
        return 50.0

    points = sorted((float(k), float(v)) for k, v in raw_to_pctl.items())
    if raw <= points[0][0]:
        return points[0][1]
    if raw >= points[-1][0]:
        return points[-1][1]

    for i in range(len(points) - 1):
        x0, y0 = points[i]
        x1, y1 = points[i + 1]
        if x0 <= raw <= x1:
            if x1 == x0:
                return y0
            return y0 + (y1 - y0) * (raw - x0) / (x1 - x0)
    return 50.0


def raw_to_t_score(raw: float, mean_score: float, sd_score: float) -> float:
    """T-score: M=50, SD=10 (classical psychometric convention).

    T = 50 + 10 * ((raw - mean) / sd)
    """
    if sd_score <= 0:
        return 50.0
    return round(50.0 + 10.0 * (raw - mean_score) / sd_score, 2)


def compute_t_score_from_map(raw: float, t_score_map: dict[str, float]) -> float:
    """Lookup T-score via linear interpolation when a map is supplied."""
    if not t_score_map:
        return 50.0
    points = sorted((float(k), float(v)) for k, v in t_score_map.items())
    if raw <= points[0][0]:
        return round(points[0][1], 2)
    if raw >= points[-1][0]:
        return round(points[-1][1], 2)
    for i in range(len(points) - 1):
        x0, y0 = points[i]
        x1, y1 = points[i + 1]
        if x0 <= raw <= x1 and x1 != x0:
            return round(y0 + (y1 - y0) * (raw - x0) / (x1 - x0), 2)
    return 50.0


# ────────────────────────────────────────────────────────────────────────────
# Full score record
# ────────────────────────────────────────────────────────────────────────────
@dataclass
class UpCapTRFactorBreakdown:
    factor: str
    raw_mean: float
    items_sum: float
    items_count: int


@dataclass
class UpCapTRScoreResult:
    """Result of scoring a single UpCap-TR v1.0 response set."""

    composite_score: float
    factors: dict[str, float]
    factor_breakdown: list[UpCapTRFactorBreakdown]
    percentile: float
    t_score: float
    sector_comparison: dict[str, float] | None = None
    interpretation: str = ""
    validated: bool = False
    scale_version: str = UPCAP_TR_V1_VERSION
    scored_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    disclaimer: str = (
        "Bu ölçek bilimsel doğrulama sürecindedir (CPC-12 temelli Türkçe uyarlama). "
        "Sonuçlar gelişim amaçlı yönlendiricidir; performans kararlarında belirleyici değildir."
    )


def interpret_t_score(t_score: float) -> str:
    """Narrative interpretation band for T-score (M=50, SD=10)."""
    if t_score >= 65:
        return "Çok yüksek · psikolojik sermayen güçlü"
    if t_score >= 55:
        return "Yüksek · ortalamanın üzerinde"
    if t_score >= 45:
        return "Ortalama · referans grupla tutarlı"
    if t_score >= 35:
        return "Düşük · gelişim alanı"
    return "Çok düşük · öncelikli gelişim gerekli"


def score_upcap_tr(
    responses: dict[str, int],
    overall_norm: dict[str, object] | None = None,
    sector_norm: dict[str, object] | None = None,
    validated: bool = False,
) -> UpCapTRScoreResult:
    """End-to-end scoring for UpCap-TR v1.0.

    Args:
        responses: 12 integer responses keyed upcap_01..upcap_12 (1-6 Likert).
        overall_norm: Overall norm record with optional keys
                      mean_score, sd_score, percentile_map, t_score_map.
        sector_norm: Sector-specific norm record (same shape) for comparison.
        validated: True if DB-tracked scale version is peer-reviewed.

    Returns:
        UpCapTRScoreResult with composite, factors, percentile, T-score,
        sector comparison, and interpretation band.
    """
    validate_responses(responses)
    factors = compute_factor_scores(responses)
    composite = compute_composite(factors)

    coded = apply_reverse_coding(responses)
    breakdown = [
        UpCapTRFactorBreakdown(
            factor=factor,
            raw_mean=factors[factor],
            items_sum=sum(coded[k] for k in items),
            items_count=len(items),
        )
        for factor, items in FACTOR_MAP.items()
    ]

    # Percentile
    percentile = 50.0
    t_score = 50.0
    if overall_norm is not None:
        pctl_map = overall_norm.get("percentile_map", {}) or {}
        t_map = overall_norm.get("t_score_map", {}) or {}
        if isinstance(pctl_map, dict):
            raw_to_pctl = pctl_map.get("raw_to_pctl", pctl_map)
            if isinstance(raw_to_pctl, dict):
                percentile = round(linear_interpolate_percentile(composite, raw_to_pctl), 1)
        if isinstance(t_map, dict):
            raw_to_t = t_map.get("raw_to_t", t_map)
            if isinstance(raw_to_t, dict) and raw_to_t:
                t_score = compute_t_score_from_map(composite, raw_to_t)
            else:
                m = float(overall_norm.get("mean_score", 4.2))  # type: ignore[arg-type]
                s = float(overall_norm.get("sd_score", 0.85))  # type: ignore[arg-type]
                t_score = raw_to_t_score(composite, m, s)

    # Sector comparison
    sector_compare: dict[str, float] | None = None
    if sector_norm is not None:
        s_pctl = 50.0
        s_mean = float(sector_norm.get("mean_score", 0.0) or 0.0)  # type: ignore[arg-type]
        s_sd = float(sector_norm.get("sd_score", 1.0) or 1.0)  # type: ignore[arg-type]
        s_pctl_map = sector_norm.get("percentile_map", {}) or {}
        if isinstance(s_pctl_map, dict):
            raw_to_pctl = s_pctl_map.get("raw_to_pctl", s_pctl_map)
            if isinstance(raw_to_pctl, dict):
                s_pctl = round(linear_interpolate_percentile(composite, raw_to_pctl), 1)
        sector_compare = {
            "sector_mean": round(s_mean, 3),
            "sector_sd": round(s_sd, 3),
            "sector_percentile": s_pctl,
            "delta_from_sector_mean": round(composite - s_mean, 3),
        }

    return UpCapTRScoreResult(
        composite_score=composite,
        factors=factors,
        factor_breakdown=breakdown,
        percentile=percentile,
        t_score=t_score,
        sector_comparison=sector_compare,
        interpretation=interpret_t_score(t_score),
        validated=validated,
    )
