"""UpCap-TR PsyCap scoring endpoint.

POST /v1/score/upcap
12-item PsyCap scoring with reliability warning emission.
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException

from app.core.exceptions import InvalidResponseError
from app.schemas.upcap import UPCAP_ITEM_KEYS, UpCapScoreRequest, UpCapScoreResponse
from app.scoring.upcap_scoring import score_upcap
from app.utils.validators import validate_item_count

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1/score", tags=["scoring"])


@router.post(
    "/upcap",
    response_model=UpCapScoreResponse,
    summary="Score UpCap-TR PsyCap assessment",
    description=(
        "Deterministic scoring of the 12-item UpCap-TR PsyCap instrument. "
        "Returns 4 PsyCap dimensions (Hope, Efficacy, Resilience, Optimism), "
        "composite score, and reliability warning flag."
    ),
)
async def score_upcap_endpoint(req: UpCapScoreRequest) -> UpCapScoreResponse:
    """Score a single UpCap-TR assessment."""
    logger.info(
        "upcap_score_request",
        assessment_id=str(req.assessment_id),
        n_responses=len(req.responses),
    )

    try:
        validate_item_count(req.responses, UPCAP_ITEM_KEYS, instrument="UpCap-TR")
    except InvalidResponseError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc

    result = score_upcap(
        responses=req.responses,
        norm_version=req.norm_version or "upcap-tr-v0.1",
    )

    response = UpCapScoreResponse(
        tenant_id=req.tenant_id,
        employee_id=req.employee_id,
        assessment_id=req.assessment_id,
        subscales=result["subscales"],
        composite_score=result["composite_score"],
        reliability=result["reliability"],
        reliability_warning=result["reliability_warning"],
        metadata=result["metadata"],
    )

    logger.info(
        "upcap_score_complete",
        assessment_id=str(req.assessment_id),
        composite=result["composite_score"],
        reliability_warning=result["reliability_warning"],
    )

    return response
