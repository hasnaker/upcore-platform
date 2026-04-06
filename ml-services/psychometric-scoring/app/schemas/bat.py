"""BAT-12-TR request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.base import TenantScopedRequest, TenantScopedResponse
from app.schemas.common import (
    ReliabilityInfo,
    ScoringMetadata,
    TrafficLight,
)

BAT_ITEM_KEYS: tuple[str, ...] = tuple(f"bat_{i:02d}" for i in range(1, 13))


class BATScoreRequest(TenantScopedRequest):
    """Request body for /score/bat endpoint."""

    responses: dict[str, int] = Field(
        description="Mapping from bat_01..bat_12 to Likert 1-5 values"
    )
    norm_version: str | None = Field(default=None)
    allow_imputation: bool = Field(
        default=True,
        description="If true, up to 2 missing items are imputed with subscale mean",
    )

    @field_validator("responses")
    @classmethod
    def _validate_keys(cls, v: dict[str, int]) -> dict[str, int]:
        extra = set(v.keys()) - set(BAT_ITEM_KEYS)
        if extra:
            raise ValueError(f"Unexpected BAT item keys: {sorted(extra)}")
        for key, value in v.items():
            if not 1 <= value <= 5:
                raise ValueError(f"Item {key} must be 1..5 (got {value})")
        return v


class BATSubscaleScores(BaseModel):
    """Four BAT-12-TR subscale means."""

    model_config = ConfigDict(extra="forbid")

    exhaustion: float = Field(ge=1.0, le=5.0)
    mental_distance: float = Field(ge=1.0, le=5.0)
    cognitive_impairment: float = Field(ge=1.0, le=5.0)
    emotional_impairment: float = Field(ge=1.0, le=5.0)


class BATClassifications(BaseModel):
    """Traffic-light classifications per subscale + total."""

    model_config = ConfigDict(extra="forbid")

    exhaustion: TrafficLight
    mental_distance: TrafficLight
    cognitive_impairment: TrafficLight
    emotional_impairment: TrafficLight
    total: TrafficLight


class BATPercentiles(BaseModel):
    """Empirical percentile ranks (0-100)."""

    model_config = ConfigDict(extra="forbid")

    exhaustion: int = Field(ge=0, le=100)
    mental_distance: int = Field(ge=0, le=100)
    cognitive_impairment: int = Field(ge=0, le=100)
    emotional_impairment: int = Field(ge=0, le=100)
    total: int = Field(ge=0, le=100)


class BATScoreResponse(TenantScopedResponse):
    """Response body for /score/bat endpoint."""

    subscales: BATSubscaleScores
    total_score: float = Field(ge=1.0, le=5.0)
    classifications: BATClassifications
    percentiles: BATPercentiles
    reliability: ReliabilityInfo
    imputed_items: list[str] = Field(default_factory=list)
    metadata: ScoringMetadata
