"""JD-R balance request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.base import TenantScopedRequest, TenantScopedResponse
from app.schemas.common import CalibrationStatus, ScoringMetadata


class JDRScoreRequest(TenantScopedRequest):
    """JD-R balance input. All values are z-scored relative to Turkish norms."""

    model_config = ConfigDict(extra="forbid")

    demands_z: float = Field(
        ge=-5.0, le=5.0, description="z-scored demands (e.g. workload, time pressure)"
    )
    resources_z: float = Field(
        ge=-5.0, le=5.0, description="z-scored resources (e.g. autonomy, support)"
    )
    personal_resources_z: float | None = Field(
        default=None,
        ge=-5.0,
        le=5.0,
        description="Optional personal-resources z (self-efficacy, optimism)",
    )


class JDRScoreResponse(TenantScopedResponse):
    """JD-R burnout-risk output."""

    burnout_probability: float = Field(ge=0.0, le=1.0)
    balance_index: float = Field(
        description="resources_z - demands_z; positive = favorable"
    )
    engagement_score: float
    strain_score: float
    interaction_effect: float
    calibration_status: CalibrationStatus
    coefficients: dict[str, float]
    metadata: ScoringMetadata
