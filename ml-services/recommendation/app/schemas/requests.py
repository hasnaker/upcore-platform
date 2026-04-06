"""Request schemas for recommendation service."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class IndividualRecommendRequest(BaseModel):
    """Request for individual intervention recommendation."""

    tenant_id: UUID
    employee_id: UUID
    burnout_prediction: dict[str, float] = Field(
        ..., description="Horizon predictions, e.g. {'30d': 0.41, '90d': 0.58}"
    )
    top_drivers: list[str] = Field(
        default_factory=list,
        description="Top burnout driver feature names",
    )
    context: EmployeeContext = Field(default_factory=lambda: EmployeeContext())
    max_recommendations: int = Field(default=5, ge=1, le=10)


class EmployeeContext(BaseModel):
    """Contextual information about the employee."""

    role: str = "employee"
    tenure_months: int = 12
    language: str = "tr-TR"
    department: str | None = None
    team_id: UUID | None = None


class TeamRecommendRequest(BaseModel):
    """Request for team-level recommendations."""

    tenant_id: UUID
    team_id: UUID
    team_burnout_summary: dict[str, float] = Field(
        default_factory=dict,
        description="Aggregated team burnout stats",
    )
    max_recommendations: int = Field(default=5, ge=1, le=10)


class OutcomeFeedbackRequest(BaseModel):
    """Request to record intervention outcome."""

    tenant_id: UUID
    employee_id: UUID
    intervention_id: UUID
    recommendation_id: UUID | None = None
    pre_bat_score: float = Field(..., ge=1.0, le=5.0)
    post_bat_score: float = Field(..., ge=1.0, le=5.0)
    days_elapsed: int = Field(..., ge=1)
    outcome_notes: str | None = None


class CatalogWriteRequest(BaseModel):
    """Request to create or update an intervention in the catalog."""

    title_tr: str = Field(..., min_length=3, max_length=200)
    title_en: str = Field(..., min_length=3, max_length=200)
    description_tr: str = Field(..., min_length=10)
    description_en: str = Field(..., min_length=10)
    evidence_tier: Literal["A", "B", "C"]
    target_drivers: list[str] = Field(default_factory=list)
    target_burnout_band: list[Literal["GREEN", "AMBER", "RED"]] = Field(default_factory=list)
    delivery_mode: Literal["sync", "async", "self_directed"] = "async"
    expected_effect_size: float = Field(default=0.3, ge=0.0, le=2.0)
    time_to_effect_weeks: int = Field(default=4, ge=1, le=52)
    cost_tier: Literal["free", "low", "medium", "high"] = "low"
    citations: list[str] = Field(default_factory=list)
    active: bool = True
