"""Strengths inventory request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.base import TenantScopedRequest, TenantScopedResponse
from app.schemas.common import ReliabilityInfo, ScoringMetadata

STRENGTHS_N_ITEMS = 24
STRENGTHS_ITEM_KEYS: tuple[str, ...] = tuple(
    f"str_{i:02d}" for i in range(1, STRENGTHS_N_ITEMS + 1)
)

# 8 strength domains, 3 items each
STRENGTH_DOMAINS: dict[str, list[str]] = {
    "analytical_thinking": ["str_01", "str_02", "str_03"],
    "communication": ["str_04", "str_05", "str_06"],
    "leadership": ["str_07", "str_08", "str_09"],
    "creativity": ["str_10", "str_11", "str_12"],
    "empathy": ["str_13", "str_14", "str_15"],
    "resilience": ["str_16", "str_17", "str_18"],
    "strategic_vision": ["str_19", "str_20", "str_21"],
    "collaboration": ["str_22", "str_23", "str_24"],
}

STRENGTH_NAMES_TR: dict[str, str] = {
    "analytical_thinking": "Analitik Dusunme",
    "communication": "Iletisim",
    "leadership": "Liderlik",
    "creativity": "Yaraticilik",
    "empathy": "Empati",
    "resilience": "Dayaniklilik",
    "strategic_vision": "Stratejik Vizyon",
    "collaboration": "Is Birligi",
}


class StrengthsScoreRequest(TenantScopedRequest):
    """24-item strengths inventory request."""

    responses: dict[str, int] = Field(
        description="Mapping from str_01..str_24 to Likert 1-5"
    )
    norm_version: str | None = None

    @field_validator("responses")
    @classmethod
    def _validate(cls, v: dict[str, int]) -> dict[str, int]:
        extra = set(v.keys()) - set(STRENGTHS_ITEM_KEYS)
        if extra:
            raise ValueError(f"Unexpected strengths item keys: {sorted(extra)}")
        for key, value in v.items():
            if not 1 <= value <= 5:
                raise ValueError(f"Item {key} must be 1..5 (got {value})")
        return v


class StrengthRank(BaseModel):
    """A single ranked strength."""

    model_config = ConfigDict(extra="forbid")

    rank: int = Field(ge=1, le=8)
    domain_id: str
    name_tr: str
    score: float = Field(ge=1.0, le=5.0)
    percentile: int = Field(ge=0, le=100)


class StrengthsScoreResponse(TenantScopedResponse):
    """Response body for /score/strengths endpoint."""

    top_5: list[StrengthRank]
    all_scores: dict[str, float]
    reliability: ReliabilityInfo
    metadata: ScoringMetadata
