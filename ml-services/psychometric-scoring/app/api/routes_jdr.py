"""JD-R balance scoring endpoint.

POST /v1/score/jdr
Computes engagement, strain, balance ratio, burnout probability
using Crawford 2010 meta-analytic weights.
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter

from app.schemas.jdr import JDRScoreRequest, JDRScoreResponse
from app.scoring.jdr_scoring import score_jdr

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1/score", tags=["scoring"])


@router.post(
    "/jdr",
    response_model=JDRScoreResponse,
    summary="Score JD-R balance (v0.1 heuristic)",
    description=(
        "Compute JD-R burnout risk from demands/resources z-scores. "
        "Uses Crawford (2010) meta-analytic beta weights. "
        "Flagged as v0.1 heuristic — NOT calibrated on Turkish population."
    ),
)
async def score_jdr_endpoint(req: JDRScoreRequest) -> JDRScoreResponse:
    """Score JD-R balance."""
    logger.info(
        "jdr_score_request",
        assessment_id=str(req.assessment_id),
        demands_z=req.demands_z,
        resources_z=req.resources_z,
    )

    result = score_jdr(
        demands_z=req.demands_z,
        resources_z=req.resources_z,
        personal_resources_z=req.personal_resources_z,
    )

    response = JDRScoreResponse(
        tenant_id=req.tenant_id,
        employee_id=req.employee_id,
        assessment_id=req.assessment_id,
        burnout_probability=result["burnout_probability"],
        balance_index=result["balance_index"],
        engagement_score=result["engagement_score"],
        strain_score=result["strain_score"],
        interaction_effect=result["interaction_effect"],
        calibration_status=result["calibration_status"],
        coefficients=result["coefficients"],
        metadata=result["metadata"],
    )

    logger.info(
        "jdr_score_complete",
        assessment_id=str(req.assessment_id),
        burnout_probability=result["burnout_probability"],
    )

    return response
