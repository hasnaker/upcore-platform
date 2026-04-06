"""UpCap-TR (PsyCap adaptation) request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.base import TenantScopedRequest, TenantScopedResponse
from app.schemas.common import ReliabilityInfo, ScoringMetadata

UPCAP_N_ITEMS = 12
UPCAP_ITEM_KEYS: tuple[str, ...] = tuple(f"upcap_{i:02d}" for i in range(1, UPCAP_N_ITEMS + 1))


class UpCapScoreRequest(TenantScopedRequest):
    """UpCap-TR 12-item PsyCap request."""

    responses: dict[str, int] = Field(
        description="Mapping from upcap_01..upcap_12 to Likert 1-6"
    )
    norm_version: str | None = None

    @field_validator("responses")
    @classmethod
    def _validate(cls, v: dict[str, int]) -> dict[str, int]:
        extra = set(v.keys()) - set(UPCAP_ITEM_KEYS)
        if extra:
            raise ValueError(f"Unexpected UpCap item keys: {sorted(extra)}")
        for key, value in v.items():
            if not 1 <= value <= 6:
                raise ValueError(f"Item {key} must be 1..6 (got {value})")
        return v


class UpCapSubscaleScores(BaseModel):
    """Four PsyCap dimensions on 1-6 scale."""

    model_config = ConfigDict(extra="forbid")

    hope: float = Field(ge=1.0, le=6.0)
    efficacy: float = Field(ge=1.0, le=6.0)
    resilience: float = Field(ge=1.0, le=6.0)
    optimism: float = Field(ge=1.0, le=6.0)


class UpCapScoreResponse(TenantScopedResponse):
    """Response body for /score/upcap endpoint."""

    subscales: UpCapSubscaleScores
    composite_score: float = Field(ge=1.0, le=6.0)
    reliability: ReliabilityInfo
    reliability_warning: bool = Field(
        description="True when Cronbach alpha < 0.70 or Turkish norms pending"
    )
    metadata: ScoringMetadata
