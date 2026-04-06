"""UpCap-TR 12-item PsyCap scorer.

Turkish adaptation of CPC-12 (Lorenz et al. 2016, CC-BY 4.0).

Dimensions (3 items each):
  - Hope:       upcap_01, upcap_02, upcap_03
  - Efficacy:   upcap_04, upcap_05(R), upcap_06
  - Resilience: upcap_07, upcap_08(R), upcap_09
  - Optimism:   upcap_10, upcap_11(R), upcap_12

R = reverse-coded items (1->6, 2->5, 3->4, 4->3, 5->2, 6->1).

Response scale: 1-6 Likert agreement.
Composite = mean of 4 dimension means.
Reliability warning: emitted when Cronbach alpha < 0.70.
"""

from __future__ import annotations

from datetime import UTC, datetime
from statistics import mean

import numpy as np

from app import __version__
from app.reliability.cronbach import cronbach_alpha, interpret_alpha
from app.schemas.common import (
    CalibrationStatus,
    ConfidenceLevel,
    ReliabilityInfo,
    ScoringMetadata,
)
from app.schemas.upcap import UPCAP_ITEM_KEYS, UpCapSubscaleScores

_SUBSCALE_MAP: dict[str, list[str]] = {
    "hope": ["upcap_01", "upcap_02", "upcap_03"],
    "efficacy": ["upcap_04", "upcap_05", "upcap_06"],
    "resilience": ["upcap_07", "upcap_08", "upcap_09"],
    "optimism": ["upcap_10", "upcap_11", "upcap_12"],
}

# Items that require reverse coding (6-point Likert: new = 7 - old)
REVERSE_CODED_ITEMS: frozenset[str] = frozenset({"upcap_05", "upcap_08", "upcap_11"})

# Scale parameters
SCALE_MIN: int = 1
SCALE_MAX: int = 6

# Reliability threshold for warning
ALPHA_THRESHOLD: float = 0.70


def reverse_code(item_id: str, value: int) -> int:
    """Reverse-code an item on a 1-6 scale: new = 7 - old."""
    if item_id in REVERSE_CODED_ITEMS:
        return (SCALE_MAX + SCALE_MIN) - value
    return value


def _apply_reverse_coding(responses: dict[str, int]) -> dict[str, int]:
    """Apply reverse coding to all items that need it."""
    return {k: reverse_code(k, v) for k, v in responses.items()}


def compute_subscale_means(responses: dict[str, int]) -> dict[str, float]:
    """Compute arithmetic mean for each PsyCap dimension."""
    coded = _apply_reverse_coding(responses)
    scores: dict[str, float] = {}
    for subscale, items in _SUBSCALE_MAP.items():
        values = [float(coded[k]) for k in items]
        scores[subscale] = mean(values)
    return scores


def compute_upcap_composite(subscale_scores: dict[str, float]) -> float:
    """Composite PsyCap = mean of 4 dimension means."""
    return mean(subscale_scores.values())


def score_upcap(
    responses: dict[str, int],
    norm_version: str = "upcap-tr-v0.1",
) -> dict[str, object]:
    """Score UpCap-TR responses.

    Returns dict with all fields needed for UpCapScoreResponse construction.
    """
    # Compute subscale means (reverse coding handled internally)
    subscale_scores = compute_subscale_means(responses)
    composite = compute_upcap_composite(subscale_scores)

    # Compute reliability on reverse-coded values
    coded = _apply_reverse_coding(responses)
    item_values = [float(coded[k]) for k in UPCAP_ITEM_KEYS]
    # Single respondent => alpha is None (need 2+ respondents)
    alpha = cronbach_alpha(np.array([item_values]))

    reliability_warning = True  # always warn until Turkish validation completes
    if alpha is not None:
        reliability_warning = alpha < ALPHA_THRESHOLD

    reliability = ReliabilityInfo(
        cronbach_alpha=alpha,
        n_items=12,
        interpretation=interpret_alpha(alpha),
        warning=reliability_warning,
    )

    metadata = ScoringMetadata(
        service_version=__version__,
        scored_at=datetime.now(UTC),
        scorer="upcap-tr",
        norm_version=norm_version,
        confidence=ConfidenceLevel.PROVISIONAL,
        calibration_status=CalibrationStatus.PROVISIONAL,
        notes=(
            "Turkish adaptation of CPC-12 (CC-BY 4.0). "
            "Validation ongoing — reliability warning active until N>=1000."
        ),
    )

    return {
        "subscales": UpCapSubscaleScores(**subscale_scores),
        "composite_score": round(composite, 4),
        "reliability": reliability,
        "reliability_warning": reliability_warning,
        "metadata": metadata,
    }
