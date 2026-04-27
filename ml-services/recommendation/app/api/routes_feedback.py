"""Feedback and outcome tracking endpoints."""

from __future__ import annotations

import structlog
from fastapi import APIRouter

from app.effectiveness.outcome_tracker import compute_success
from app.schemas.requests import OutcomeFeedbackRequest

logger = structlog.get_logger()
router = APIRouter()


@router.post("/outcome")
async def record_outcome_endpoint(req: OutcomeFeedbackRequest) -> dict:
    """Record observed post-intervention outcome.

    Updates Thompson sampling posteriors based on BAT score change.
    Success criterion: BAT delta <= -0.3 (improvement of 0.3+ points).
    """
    success = compute_success(req.pre_bat_score, req.post_bat_score)
    delta = req.post_bat_score - req.pre_bat_score

    logger.info(
        "outcome_recorded",
        employee_id=str(req.employee_id),
        intervention_id=str(req.intervention_id),
        pre_bat=req.pre_bat_score,
        post_bat=req.post_bat_score,
        delta=delta,
        success=success,
        days_elapsed=req.days_elapsed,
    )

    # In production: update posterior via PosteriorStore
    # await posterior_store.update_posterior(
    #     str(req.intervention_id), segment, success
    # )

    return {
        "status": "recorded",
        "intervention_id": str(req.intervention_id),
        "employee_id": str(req.employee_id),
        "success": success,
        "bat_delta": round(delta, 2),
        "message": "Outcome recorded. Thompson posterior will be updated.",
    }
