"""BAT-12-TR scoring endpoint.

POST /v1/score/bat12
Validates 12 item keys (bat_01-bat_12), values 1-5.
Handles missing-item imputation (<=2 missing -> mean substitution, >2 -> 422).
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException

from app.core.exceptions import InvalidResponseError
from app.schemas.bat import BATScoreRequest, BATScoreResponse
from app.scoring.bat_scoring import score_bat12

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/v1/score", tags=["scoring"])


@router.post(
    "/bat12",
    response_model=BATScoreResponse,
    summary="Score BAT-12-TR burnout assessment",
    description=(
        "Deterministic scoring of the 12-item Burnout Assessment Tool (Turkish adaptation). "
        "Returns subscale means, traffic-light classifications, percentile ranks, "
        "and reliability statistics."
    ),
)
async def score_bat_endpoint(req: BATScoreRequest) -> BATScoreResponse:
    """Score a single BAT-12-TR assessment."""
    logger.info(
        "bat12_score_request",
        assessment_id=str(req.assessment_id),
        n_responses=len(req.responses),
    )

    try:
        result, imputed_keys = score_bat12(
            responses=req.responses,
            norm_version=req.norm_version or "bat12-tr-provisional-v0.1",
            allow_imputation=req.allow_imputation,
        )
    except InvalidResponseError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc

    response = BATScoreResponse(
        tenant_id=req.tenant_id,
        employee_id=req.employee_id,
        assessment_id=req.assessment_id,
        subscales=result["subscales"],
        total_score=result["total_score"],
        classifications=result["classifications"],
        percentiles=result["percentiles"],
        reliability=result["reliability"],
        imputed_items=imputed_keys,
        metadata=result["metadata"],
    )

    logger.info(
        "bat12_score_complete",
        assessment_id=str(req.assessment_id),
        total_score=result["total_score"],
        classification=result["classifications"].total.value,
    )

    return response
