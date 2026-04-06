"""Recommendation API routes: individual and team endpoints.

Orchestrates: embed query -> pgvector search -> CBR merge ->
Thompson sample -> rank -> diversity -> fallback if empty.
"""

from __future__ import annotations

from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, HTTPException, status

from app.fallbacks.rule_based import rule_based_recommend
from app.fallbacks.safe_list import get_safe_list
from app.schemas.requests import IndividualRecommendRequest, TeamRecommendRequest
from app.schemas.responses import (
    Recommendation,
    RecommendationResponse,
    TeamRecommendationResponse,
)

logger = structlog.get_logger()
router = APIRouter()


@router.post("/individual", response_model=RecommendationResponse)
async def recommend_individual_endpoint(
    req: IndividualRecommendRequest,
) -> RecommendationResponse:
    """Recommend interventions for an individual employee.

    Pipeline:
    1. Build query text from burnout prediction + drivers + context
    2. Embed query via Azure OpenAI
    3. Search similar interventions via pgvector
    4. Search similar historical cases via CBR
    5. Sample from Thompson posteriors
    6. Rank by composite score
    7. Apply MMR diversity
    8. Fall back to rule-based if no results
    9. Fall back to safe list if rule-based fails

    For V1: steps 2-5 fall through to fallback (no embeddings yet).
    """
    # Determine burnout band from predictions
    burnout_band = _determine_burnout_band(req.burnout_prediction)

    # For V1: use fallback path (embeddings/pgvector not populated yet)
    fallback_used = True

    recommendations = rule_based_recommend(
        burnout_band=burnout_band,
        drivers=req.top_drivers,
        max_results=req.max_recommendations,
    )

    # Ultimate fallback: safe list
    if not recommendations:
        recommendations = get_safe_list(max_results=req.max_recommendations)

    # Build response
    rec_models = [
        Recommendation(
            intervention_id=r["intervention_id"],
            title_tr=r["title_tr"],
            title_en=r["title_en"],
            evidence_tier=r["evidence_tier"],
            score=r["score"],
            similarity=r.get("similarity", 0.0),
            thompson_sample=r.get("thompson_sample", 0.5),
            rationale_tr=r.get("rationale_tr", ""),
            expected_effect_size=r.get("expected_effect_size", 0.0),
            time_to_effect_weeks=r.get("time_to_effect_weeks", 4),
            delivery_mode=r.get("delivery_mode", "async"),
            source_case_ids=r.get("source_case_ids", []),
        )
        for r in recommendations
    ]

    logger.info(
        "individual_recommendation_completed",
        employee_id=str(req.employee_id),
        burnout_band=burnout_band,
        result_count=len(rec_models),
        fallback_used=fallback_used,
    )

    return RecommendationResponse(
        recommendations=rec_models,
        fallback_used=fallback_used,
        model_version="recommender-v0.1.0",
        recommended_at=datetime.now(timezone.utc),
    )


@router.post("/team", response_model=TeamRecommendationResponse)
async def recommend_team_endpoint(
    req: TeamRecommendRequest,
) -> TeamRecommendationResponse:
    """Recommend team-level interventions.

    Aggregates member profiles and recommends team-wide interventions.
    For V1: returns safe list recommendations.
    """
    recommendations = get_safe_list(max_results=req.max_recommendations)

    rec_models = [
        Recommendation(
            intervention_id=r["intervention_id"],
            title_tr=r["title_tr"],
            title_en=r["title_en"],
            evidence_tier=r["evidence_tier"],
            score=r["score"],
            similarity=r.get("similarity", 0.0),
            thompson_sample=r.get("thompson_sample", 0.5),
            rationale_tr=r.get("rationale_tr", ""),
            expected_effect_size=r.get("expected_effect_size", 0.0),
            time_to_effect_weeks=r.get("time_to_effect_weeks", 4),
            delivery_mode=r.get("delivery_mode", "async"),
            source_case_ids=[],
        )
        for r in recommendations
    ]

    return TeamRecommendationResponse(
        team_id=req.team_id,
        recommendations=rec_models,
        team_size=0,
        fallback_used=True,
        recommended_at=datetime.now(timezone.utc),
    )


def _determine_burnout_band(predictions: dict[str, float]) -> str:
    """Determine burnout band from prediction scores.

    Uses the highest horizon prediction available.
    """
    max_prob = 0.0
    for key, value in predictions.items():
        if value > max_prob:
            max_prob = value

    if max_prob > 0.50:
        return "RED"
    elif max_prob > 0.25:
        return "AMBER"
    else:
        return "GREEN"
