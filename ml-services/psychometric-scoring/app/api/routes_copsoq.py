"""COPSOQ-III-TR scoring endpoint.

POST /v1/score/copsoq
40-item COPSOQ-III-TR short form scoring on 0-100 scale.
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException

from app.core.exceptions import InvalidResponseError
from app.schemas.copsoq import COPSOQ_ITEM_KEYS, COPSOQScoreRequest, COPSOQScoreResponse
from app.scoring.copsoq_scoring import score_copsoq
from app.utils.validators import validate_item_count

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/v1/score", tags=["scoring"])


@router.post(
    "/copsoq",
    response_model=COPSOQScoreResponse,
    summary="Score COPSOQ-III-TR workplace psychosocial assessment",
    description=(
        "Deterministic scoring of the 40-item COPSOQ-III-TR short form. "
        "Returns subscale scores on 0-100 scale, demands/resources indices, "
        "and traffic-light classifications."
    ),
)
async def score_copsoq_endpoint(req: COPSOQScoreRequest) -> COPSOQScoreResponse:
    """Score a single COPSOQ-III-TR assessment."""
    logger.info(
        "copsoq_score_request",
        assessment_id=str(req.assessment_id),
        n_responses=len(req.responses),
    )

    try:
        validate_item_count(req.responses, COPSOQ_ITEM_KEYS, instrument="COPSOQ-III-TR")
    except InvalidResponseError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc

    result = score_copsoq(
        responses=req.responses,
        norm_version=req.norm_version or "copsoq-iii-tr-v1.0",
    )

    response = COPSOQScoreResponse(
        tenant_id=req.tenant_id,
        employee_id=req.employee_id,
        assessment_id=req.assessment_id,
        subscales=result["subscales"],
        demands_index=result["demands_index"],
        resources_index=result["resources_index"],
        reliability=result["reliability"],
        metadata=result["metadata"],
    )

    logger.info(
        "copsoq_score_complete",
        assessment_id=str(req.assessment_id),
        demands_index=result["demands_index"],
        resources_index=result["resources_index"],
    )

    return response
