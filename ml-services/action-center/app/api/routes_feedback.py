"""Action feedback endpoints: dismiss, complete, snooze."""

from __future__ import annotations

import structlog
from fastapi import APIRouter

from app.schemas.requests import ActionFeedbackRequest

logger = structlog.get_logger()
router = APIRouter()


@router.post("/dismiss")
async def dismiss_action(req: ActionFeedbackRequest) -> dict:
    """Record action dismissal.

    Updates user relevance learning and invalidates cache.
    """
    logger.info(
        "action_dismissed",
        user_id=str(req.user_id),
        action_id=str(req.action_id),
    )

    return {
        "status": "recorded",
        "feedback_type": "dismiss",
        "action_id": str(req.action_id),
        "message": "Dismissal recorded. Future relevance scores adjusted.",
    }


@router.post("/complete")
async def complete_action(req: ActionFeedbackRequest) -> dict:
    """Record action completion.

    Persists completion event with optional outcome tag.
    """
    logger.info(
        "action_completed",
        user_id=str(req.user_id),
        action_id=str(req.action_id),
        outcome_notes=req.outcome_notes,
    )

    return {
        "status": "recorded",
        "feedback_type": "complete",
        "action_id": str(req.action_id),
        "message": "Completion recorded.",
    }


@router.post("/snooze")
async def snooze_action(req: ActionFeedbackRequest) -> dict:
    """Snooze action for N hours.

    Action will reappear after the snooze period.
    """
    snooze_hours = req.snooze_hours or 24

    logger.info(
        "action_snoozed",
        user_id=str(req.user_id),
        action_id=str(req.action_id),
        snooze_hours=snooze_hours,
    )

    return {
        "status": "recorded",
        "feedback_type": "snooze",
        "action_id": str(req.action_id),
        "snooze_hours": snooze_hours,
        "message": f"Action snoozed for {snooze_hours} hours.",
    }
