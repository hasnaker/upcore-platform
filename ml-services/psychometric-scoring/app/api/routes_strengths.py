"""Strengths inventory scoring endpoint.

POST /v1/score/strengths
24-item custom Turkish strengths inventory, returns top-5 ranked.
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException

from app.core.exceptions import InvalidResponseError
from app.schemas.strengths import STRENGTHS_ITEM_KEYS, StrengthsScoreRequest, StrengthsScoreResponse
from app.scoring.strengths_scoring import score_strengths
from app.utils.validators import validate_item_count

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/v1/score", tags=["scoring"])


@router.post(
    "/strengths",
    response_model=StrengthsScoreResponse,
    summary="Score 24-item strengths inventory",
    description=(
        "Score the Upcore custom 24-item Turkish strengths inventory. "
        "Returns top-5 ranked strengths with domain scores."
    ),
)
async def score_strengths_endpoint(req: StrengthsScoreRequest) -> StrengthsScoreResponse:
    """Score a single strengths assessment."""
    logger.info(
        "strengths_score_request",
        assessment_id=str(req.assessment_id),
        n_responses=len(req.responses),
    )

    try:
        validate_item_count(req.responses, STRENGTHS_ITEM_KEYS, instrument="Strengths-TR")
    except InvalidResponseError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc

    result = score_strengths(
        responses=req.responses,
        norm_version=req.norm_version or "strengths-tr-v0.1",
    )

    response = StrengthsScoreResponse(
        tenant_id=req.tenant_id,
        employee_id=req.employee_id,
        assessment_id=req.assessment_id,
        top_5=result["top_5"],
        all_scores=result["all_scores"],
        reliability=result["reliability"],
        metadata=result["metadata"],
    )

    logger.info(
        "strengths_score_complete",
        assessment_id=str(req.assessment_id),
        top_strength=result["top_5"][0].domain_id if result["top_5"] else "none",
    )

    return response
