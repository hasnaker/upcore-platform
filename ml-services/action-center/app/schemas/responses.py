"""Response schemas for action center service."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class CTAHint(BaseModel):
    """Call-to-action hint for the frontend."""

    kind: Literal["DEEP_LINK", "MODAL", "EXTERNAL"] = "DEEP_LINK"
    href: str = ""


class ActionTarget(BaseModel):
    """Target of an action (PII-masked)."""

    employee_id: UUID | None = None
    team_id: UUID | None = None
    name_masked: str = ""


class Action(BaseModel):
    """A single prioritized action."""

    action_id: UUID
    type: str
    target: ActionTarget
    priority_score: float = Field(..., ge=0.0, le=1.0)
    urgency: float = Field(..., ge=0.0, le=1.0)
    impact: float = Field(..., ge=0.0, le=1.0)
    actionability: float = Field(..., ge=0.0, le=1.0)
    user_relevance: float = Field(..., ge=0.0, le=1.0)
    title_tr: str
    rationale_tr: str
    suggested_within_hours: int = 48
    supporting_signals: list[str] = Field(default_factory=list)
    cta: CTAHint = Field(default_factory=CTAHint)


class NextActionsResponse(BaseModel):
    """Response with prioritized actions."""

    actions: list[Action] = Field(default_factory=list, max_length=5)
    cached: bool = False
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    ttl_seconds: int = 1800


class ActionHistoryEntry(BaseModel):
    """Single entry in action history."""

    action_id: UUID
    type: str
    title_tr: str
    priority_score: float
    status: Literal["presented", "dismissed", "completed", "snoozed"]
    presented_at: datetime
    resolved_at: datetime | None = None


class ActionHistoryResponse(BaseModel):
    """Action history for a user."""

    user_id: UUID
    actions: list[ActionHistoryEntry] = Field(default_factory=list)
    period_days: int = 30


class HealthResponse(BaseModel):
    """Health check response."""

    status: Literal["healthy", "degraded", "unhealthy"]
    service: str
    version: str
    checks: dict[str, bool]
