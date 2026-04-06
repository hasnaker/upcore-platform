"""COPSOQ-III-TR request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.base import TenantScopedRequest, TenantScopedResponse
from app.schemas.common import ReliabilityInfo, ScoringMetadata, TrafficLight

COPSOQ_N_ITEMS = 40
COPSOQ_ITEM_KEYS: tuple[str, ...] = tuple(f"copsoq_{i:02d}" for i in range(1, COPSOQ_N_ITEMS + 1))


class COPSOQScoreRequest(TenantScopedRequest):
    """COPSOQ-III-TR (short 40-item) request."""

    responses: dict[str, int] = Field(
        description="Mapping from copsoq_01..copsoq_40 to Likert 1-5"
    )
    norm_version: str | None = None

    @field_validator("responses")
    @classmethod
    def _validate(cls, v: dict[str, int]) -> dict[str, int]:
        extra = set(v.keys()) - set(COPSOQ_ITEM_KEYS)
        if extra:
            raise ValueError(f"Unexpected COPSOQ item keys: {sorted(extra)}")
        for key, value in v.items():
            if not 1 <= value <= 5:
                raise ValueError(f"Item {key} must be 1..5 (got {value})")
        return v


class COPSOQSubscaleScore(BaseModel):
    """Single subscale transformed to 0-100."""

    model_config = ConfigDict(extra="forbid")

    subscale_id: str
    name_tr: str
    score_0_100: float = Field(ge=0.0, le=100.0)
    classification: TrafficLight
    dimension: str  # demands | resources | outcomes


class COPSOQScoreResponse(TenantScopedResponse):
    """Response body for /score/copsoq endpoint."""

    subscales: list[COPSOQSubscaleScore]
    demands_index: float = Field(ge=0.0, le=100.0)
    resources_index: float = Field(ge=0.0, le=100.0)
    reliability: ReliabilityInfo
    metadata: ScoringMetadata
