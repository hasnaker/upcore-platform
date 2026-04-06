"""Request schemas for action center service."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class Scope(BaseModel):
    """Action scope: which employees/teams the user manages."""

    team_id: UUID | None = None
    department_id: UUID | None = None
    employee_ids: list[UUID] | None = None


class NextActionsRequest(BaseModel):
    """Request for next actions for a user."""

    tenant_id: UUID
    user_id: UUID
    role: Literal["hr_director", "people_partner", "line_manager", "employee", "executive"]
    scope: Scope = Field(default_factory=Scope)
    language: str = "tr-TR"


class ActionFeedbackRequest(BaseModel):
    """Request to record action feedback (dismiss/complete/snooze)."""

    tenant_id: UUID
    user_id: UUID
    action_id: UUID
    feedback_type: Literal["dismiss", "complete", "snooze"]
    snooze_hours: int | None = Field(default=None, ge=1, le=168)
    outcome_notes: str | None = None


class ActionInvalidateRequest(BaseModel):
    """Request to force cache invalidation."""

    tenant_id: UUID
    user_id: UUID | None = None
    reason: str = "manual"
