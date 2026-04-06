"""Final ranking and diversity enforcement for recommendations.

Computes composite score from multiple signals and applies
Maximal Marginal Relevance (MMR) for diversity.

score = 0.4 * similarity + 0.3 * thompson_sample + 0.2 * evidence_tier + 0.1 * recency

Model type: heuristic_v0.1 (fixed weights, no learned ranker)
"""

from __future__ import annotations

import math

import numpy as np
import structlog

from app.config import settings
from app.schemas.internal import Candidate, RankedRecommendation

logger = structlog.get_logger()

# Evidence tier weights
EVIDENCE_TIER_WEIGHT: dict[str, float] = {
    "A": 1.0,
    "B": 0.7,
    "C": 0.4,
}


def rank(candidates: list[Candidate]) -> list[RankedRecommendation]:
    """Rank candidates by composite score.

    score = w_sim * similarity + w_ts * thompson + w_ev * evidence + w_rec * recency

    Args:
        candidates: List of intervention candidates.

    Returns:
        Ranked list of recommendations (descending score).
    """
    ranked: list[RankedRecommendation] = []

    for candidate in candidates:
        evidence_weight = EVIDENCE_TIER_WEIGHT.get(candidate.evidence_tier, 0.4)

        score = (
            settings.WEIGHT_SIMILARITY * candidate.similarity
            + settings.WEIGHT_THOMPSON * candidate.thompson_sample
            + settings.WEIGHT_EVIDENCE * evidence_weight
            + settings.WEIGHT_RECENCY * candidate.recency_factor
        )

        score = max(0.0, min(1.0, score))

        ranked.append(RankedRecommendation(
            candidate=candidate,
            final_score=round(score, 4),
        ))

    ranked.sort(key=lambda x: x.final_score, reverse=True)

    logger.info(
        "ranking_completed",
        total_candidates=len(candidates),
        top_score=ranked[0].final_score if ranked else 0.0,
    )

    return ranked


def compute_recency_factor(days_since_last_update: int) -> float:
    """Compute recency factor using exponential decay.

    recency = exp(-days / 180)

    Recent interventions score higher.

    Args:
        days_since_last_update: Days since the intervention was last updated.

    Returns:
        Recency factor in (0, 1].
    """
    return math.exp(-days_since_last_update / 180.0)


def apply_diversity_mmr(
    ranked: list[RankedRecommendation],
    lambda_: float = 0.7,
    top_k: int = 5,
) -> list[RankedRecommendation]:
    """Apply Maximal Marginal Relevance for diversity in top-K.

    MMR = lambda * Sim(d, q) - (1 - lambda) * max(Sim(d, d_j))

    Uses intervention evidence_tier and delivery_mode as diversity signals.
    Lower lambda = more diversity, higher lambda = more relevance.

    Carbonell & Goldstein (1998): "The Use of MMR, Diversity-Based Reranking"

    Args:
        ranked: Ranked recommendations.
        lambda_: Trade-off parameter (0 = max diversity, 1 = max relevance).
        top_k: Number of results to return.

    Returns:
        MMR-reranked top-K recommendations.
    """
    if len(ranked) <= top_k:
        return ranked

    selected: list[RankedRecommendation] = []
    remaining = list(ranked)

    for _ in range(top_k):
        if not remaining:
            break

        best_mmr = -float("inf")
        best_idx = 0

        for i, candidate in enumerate(remaining):
            relevance = candidate.final_score

            # Compute max similarity to already selected items
            max_sim_to_selected = 0.0
            for sel in selected:
                sim = _compute_diversity_similarity(candidate, sel)
                max_sim_to_selected = max(max_sim_to_selected, sim)

            mmr_score = lambda_ * relevance - (1 - lambda_) * max_sim_to_selected

            if mmr_score > best_mmr:
                best_mmr = mmr_score
                best_idx = i

        selected.append(remaining.pop(best_idx))

    return selected


def _compute_diversity_similarity(
    a: RankedRecommendation,
    b: RankedRecommendation,
) -> float:
    """Compute similarity between two recommendations for diversity.

    Uses evidence tier and delivery mode matching as proxy.
    Full cosine similarity over embeddings in production.
    """
    sim = 0.0

    # Same evidence tier = less diverse
    if a.candidate.evidence_tier == b.candidate.evidence_tier:
        sim += 0.4

    # Same delivery mode = less diverse
    if a.candidate.delivery_mode == b.candidate.delivery_mode:
        sim += 0.3

    # Similar scores = less diverse
    score_diff = abs(a.final_score - b.final_score)
    sim += 0.3 * max(0.0, 1.0 - score_diff * 5)

    return min(sim, 1.0)
