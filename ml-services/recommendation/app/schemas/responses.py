"""Response schemas for recommendation service."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class Recommendation(BaseModel):
    """A single intervention recommendation."""

    intervention_id: UUID
    title_tr: str
    title_en: str
    evidence_tier: Literal["A", "B", "C"]
    score: float = Field(..., ge=0.0, le=1.0)
    similarity: float = Field(..., ge=0.0, le=1.0)
    thompson_sample: float = Field(..., ge=0.0, le=1.0)
    rationale_tr: str
    expected_effect_size: float
    time_to_effect_weeks: int
    delivery_mode: str
    source_case_ids: list[str] = Field(default_factory=list)


class RecommendationResponse(BaseModel):
    """Response containing intervention recommendations."""

    recommendations: list[Recommendation]
    fallback_used: bool = False
    model_version: str = "recommender-v0.1.0"
    recommended_at: datetime = Field(default_factory=datetime.utcnow)


class TeamRecommendationResponse(BaseModel):
    """Team-level recommendation response."""

    team_id: UUID
    recommendations: list[Recommendation]
    team_size: int = 0
    fallback_used: bool = False
    recommended_at: datetime = Field(default_factory=datetime.utcnow)


class EffectivenessStats(BaseModel):
    """Effectiveness statistics for an intervention."""

    intervention_id: UUID
    alpha: float
    beta: float
    posterior_mean: float
    ci_lower: float
    ci_upper: float
    total_outcomes: int
    success_count: int


class CatalogEntry(BaseModel):
    """Full catalog entry for an intervention."""

    id: UUID
    title_tr: str
    title_en: str
    description_tr: str
    description_en: str
    evidence_tier: Literal["A", "B", "C"]
    target_drivers: list[str]
    target_burnout_band: list[str]
    delivery_mode: str
    expected_effect_size: float
    time_to_effect_weeks: int
    cost_tier: str
    citations: list[str]
    active: bool
    created_at: datetime
    updated_at: datetime


class HealthResponse(BaseModel):
    """Health check response."""

    status: Literal["healthy", "degraded", "unhealthy"]
    service: str
    version: str
    checks: dict[str, bool]
