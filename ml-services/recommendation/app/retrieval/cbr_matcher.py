"""Case-Based Reasoning (CBR) matcher for intervention recommendation.

Retrieves similar historical cases, weights by outcome quality,
and extracts successful interventions for recommendation candidates.

Aamodt & Plaza (1994): "Case-Based Reasoning: Foundational Issues"
"""

from __future__ import annotations

from collections import defaultdict
from uuid import UUID

import structlog

from app.schemas.internal import CaseHit, HistoricalCase, WeightedCase

logger = structlog.get_logger()


def weight_by_outcome(cases: list[CaseHit]) -> list[WeightedCase]:
    """Weight cases by their outcome quality.

    Successful outcomes get full weight; null outcomes get 0.5 weight;
    failed outcomes get 0.1 weight (still informative).

    Args:
        cases: Raw case hits from similarity search.

    Returns:
        Cases with computed weights.
    """
    weighted: list[WeightedCase] = []

    for case in cases:
        if case.outcome_success is True:
            weight = 1.0
        elif case.outcome_success is None:
            weight = 0.5
        else:
            weight = 0.1

        # Scale by similarity
        weight *= case.employee_embedding_similarity

        historical = HistoricalCase(
            case_id=case.case_id,
            tenant_id=UUID(int=0),  # Not available from CaseHit
            employee_id=UUID(int=0),
            intervention_id=case.intervention_id,
            burnout_band="",
            top_drivers=[],
            outcome_success=case.outcome_success,
            bat_delta=case.post_bat - case.pre_bat,
            similarity=case.employee_embedding_similarity,
        )

        weighted.append(WeightedCase(case=historical, weight=weight))

    return weighted


def extract_successful_interventions(
    cases: list[WeightedCase],
) -> dict[str, float]:
    """Extract intervention success rates from weighted cases.

    Computes weighted success rate per intervention.

    Args:
        cases: Outcome-weighted cases.

    Returns:
        Dict of intervention_id -> weighted success rate.
    """
    intervention_scores: dict[str, float] = defaultdict(float)
    intervention_weights: dict[str, float] = defaultdict(float)

    for wc in cases:
        iid = str(wc.case.intervention_id)
        intervention_weights[iid] += wc.weight
        if wc.case.outcome_success is True:
            intervention_scores[iid] += wc.weight

    result: dict[str, float] = {}
    for iid in intervention_weights:
        total_weight = intervention_weights[iid]
        if total_weight > 0:
            result[iid] = intervention_scores[iid] / total_weight
        else:
            result[iid] = 0.0

    return result


def blend_cbr_with_catalog(
    cbr_results: dict[str, float],
    catalog_results: list[dict],
    cbr_weight: float = 0.6,
) -> list[dict]:
    """Blend CBR success rates with catalog similarity scores.

    Final score = cbr_weight * cbr_score + (1 - cbr_weight) * catalog_sim

    Args:
        cbr_results: Dict of intervention_id -> CBR success rate.
        catalog_results: List of catalog search hits with similarity.
        cbr_weight: Weight for CBR vs catalog (default 0.6).

    Returns:
        Blended candidates sorted by score.
    """
    blended: list[dict] = []

    # Build lookup for catalog results
    catalog_by_id = {str(c["intervention_id"]): c for c in catalog_results}

    # Merge CBR and catalog results
    all_ids = set(cbr_results.keys()) | set(catalog_by_id.keys())

    for iid in all_ids:
        cbr_score = cbr_results.get(iid, 0.0)
        catalog_entry = catalog_by_id.get(iid, {})
        catalog_sim = catalog_entry.get("similarity", 0.0)

        final_score = cbr_weight * cbr_score + (1 - cbr_weight) * catalog_sim

        blended.append({
            "intervention_id": iid,
            "cbr_score": cbr_score,
            "catalog_similarity": catalog_sim,
            "blended_score": final_score,
            **{k: v for k, v in catalog_entry.items() if k != "intervention_id"},
        })

    blended.sort(key=lambda x: x["blended_score"], reverse=True)
    return blended
