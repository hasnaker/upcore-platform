"""24-item strengths inventory scorer.

Upcore custom instrument (NOT VIA-IS, NOT Gallup).
8 strength domains, 3 items each, Likert 1-5.
Returns top-5 ranked strengths with percentile ranks.
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
from app.schemas.strengths import (
    STRENGTH_DOMAINS,
    STRENGTH_NAMES_TR,
    STRENGTHS_ITEM_KEYS,
    StrengthRank,
)


def compute_domain_scores(responses: dict[str, int]) -> dict[str, float]:
    """Compute mean score per strength domain."""
    scores: dict[str, float] = {}
    for domain_id, items in STRENGTH_DOMAINS.items():
        values = [float(responses[k]) for k in items if k in responses]
        if values:
            scores[domain_id] = round(mean(values), 4)
    return scores


def rank_strengths(subscale_scores: dict[str, float]) -> list[StrengthRank]:
    """Rank all domains by score (descending) and return top-5."""
    sorted_domains = sorted(
        subscale_scores.items(), key=lambda x: x[1], reverse=True
    )

    ranked: list[StrengthRank] = []
    for rank_idx, (domain_id, score) in enumerate(sorted_domains[:5], start=1):
        ranked.append(
            StrengthRank(
                rank=rank_idx,
                domain_id=domain_id,
                name_tr=STRENGTH_NAMES_TR.get(domain_id, domain_id),
                score=score,
                percentile=50,  # default until norms collected
            )
        )
    return ranked


def score_strengths(
    responses: dict[str, int],
    norm_version: str = "strengths-tr-v0.1",
) -> dict[str, object]:
    """Score 24-item strengths inventory.

    Returns dict with all fields for StrengthsScoreResponse construction.
    """
    domain_scores = compute_domain_scores(responses)
    top_5 = rank_strengths(domain_scores)

    # Reliability
    item_values = [float(responses.get(k, 0)) for k in STRENGTHS_ITEM_KEYS]
    alpha = cronbach_alpha(np.array([item_values]))

    reliability = ReliabilityInfo(
        cronbach_alpha=alpha,
        n_items=len([k for k in STRENGTHS_ITEM_KEYS if k in responses]),
        interpretation=interpret_alpha(alpha),
        warning=alpha is not None and alpha < 0.70,
    )

    metadata = ScoringMetadata(
        service_version=__version__,
        scored_at=datetime.now(UTC),
        scorer="strengths-tr",
        norm_version=norm_version,
        confidence=ConfidenceLevel.PROVISIONAL,
        calibration_status=CalibrationStatus.PROVISIONAL,
        notes="Upcore custom 24-item strengths inventory. Norms pending N>=500.",
    )

    return {
        "top_5": top_5,
        "all_scores": domain_scores,
        "reliability": reliability,
        "metadata": metadata,
    }
