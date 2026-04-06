"""Action history endpoints."""

from __future__ import annotations

from uuid import UUID

import structlog
from fastapi import APIRouter

from app.schemas.responses import ActionHistoryResponse

logger = structlog.get_logger()
router = APIRouter()


@router.get("/history/{user_id}", response_model=ActionHistoryResponse)
async def get_action_history(user_id: UUID) -> ActionHistoryResponse:
    """Get last 30 days of actions for a user.

    Returns presented, dismissed, completed, and snoozed actions.
    For V1: returns empty history (no persistence yet).
    """
    return ActionHistoryResponse(
        user_id=user_id,
        actions=[],
        period_days=30,
    )
