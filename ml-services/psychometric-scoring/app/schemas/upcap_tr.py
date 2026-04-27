"""UpCap-TR v1.0 request/response schemas.

Canonical contract for the validation pipeline (3 factors × 4 items).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.base import TenantScopedRequest, TenantScopedResponse

UPCAP_TR_V1_N_ITEMS = 12
UPCAP_TR_V1_ITEM_KEYS: tuple[str, ...] = tuple(
    f"upcap_{i:02d}" for i in range(1, UPCAP_TR_V1_N_ITEMS + 1)
)

Sector = Literal["public_sector", "holding", "sme", "health", "education"]
AgeBand = Literal["22_30", "31_45", "46_60"]
Gender = Literal["male", "female", "other", "prefer_not"]


class UpCapTRScoreRequest(TenantScopedRequest):
    """Request body for POST /v1/score/upcap-tr."""

    responses: dict[str, int] = Field(
        description="Mapping from upcap_01..upcap_12 to Likert 1-6",
    )
    sector: Sector | None = Field(
        default=None,
        description="Segment for sector-based norm comparison",
    )
    age_band: AgeBand | None = None
    gender: Gender | None = None

    @field_validator("responses")
    @classmethod
    def _validate_responses(cls, v: dict[str, int]) -> dict[str, int]:
        if len(v) != UPCAP_TR_V1_N_ITEMS:
            raise ValueError(
                f"UpCap-TR v1.0 expects {UPCAP_TR_V1_N_ITEMS} items, got {len(v)}"
            )
        extra = set(v.keys()) - set(UPCAP_TR_V1_ITEM_KEYS)
        if extra:
            raise ValueError(f"Unexpected UpCap-TR item keys: {sorted(extra)}")
        for key, value in v.items():
            if not 1 <= value <= 6:
                raise ValueError(f"Item {key} must be 1..6 (got {value})")
        return v


class UpCapTRFactorScore(BaseModel):
    model_config = ConfigDict(extra="forbid")

    factor: Literal["hope_optimism", "resilience", "self_efficacy"]
    raw_mean: float = Field(ge=1.0, le=6.0)
    items_count: int = Field(ge=1)


class UpCapTRSectorComparison(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sector: str
    sector_mean: float
    sector_sd: float
    sector_percentile: float = Field(ge=0.0, le=100.0)
    delta_from_sector_mean: float


class UpCapTRScoreResponse(TenantScopedResponse):
    """Response body for POST /v1/score/upcap-tr."""

    scale_code: str = Field(default="upcap_tr")
    scale_version: str = Field(default="1.0")
    composite_score: float = Field(ge=1.0, le=6.0)
    factors: dict[str, float]
    factor_breakdown: list[UpCapTRFactorScore]
    percentile: float = Field(ge=0.0, le=100.0)
    t_score: float = Field(ge=0.0, le=120.0, description="M=50, SD=10 convention")
    interpretation: str
    sector_comparison: UpCapTRSectorComparison | None = None
    validated: bool = Field(
        description="True when CFA + Cronbach >= 0.85 + peer-review complete"
    )
    disclaimer: str
    scored_at: datetime


class UpCapPilotConsent(BaseModel):
    """KVKK Madde 6 açık rıza + etik kurul protokol bilgisi."""

    model_config = ConfigDict(extra="forbid")

    consent_given: bool = Field(description="Participant gave informed consent")
    consent_version: str = Field(
        description="Version of the informed consent text",
        default="aydinlatilmis_onam_v1.0",
    )
    ethics_board: str | None = Field(
        default=None,
        description="Human research ethics board name",
    )
    ethics_protocol: str | None = Field(
        default=None,
        description="Ethics board protocol number",
    )
    locale: str = Field(default="tr-TR", pattern=r"^[a-z]{2}(-[A-Z]{2})?$")


class UpCapPilotResponseRequest(BaseModel):
    """Anonymous pilot submission (no PII)."""

    model_config = ConfigDict(extra="forbid")

    participant_token: str = Field(
        min_length=8,
        max_length=64,
        description="Client-generated UUID; no PII reversal possible",
    )
    consent: UpCapPilotConsent
    responses: dict[str, int] = Field(description="upcap_01..upcap_12 => 1-6")
    wave: Literal[1, 2] = Field(
        default=1,
        description="1 = initial, 2 = test-retest (2 weeks later)",
    )
    sector: Sector | None = None
    age_band: AgeBand | None = None
    gender: Gender | None = None
    tenure_years: int | None = Field(default=None, ge=0, le=50)
    convergent_bat12: dict[str, int] | None = Field(
        default=None,
        description="Optional concurrent BAT-12-TR responses for convergent validity",
    )
    convergent_uwes9: dict[str, int] | None = Field(
        default=None,
        description="Optional concurrent UWES-9 responses",
    )

    @field_validator("responses")
    @classmethod
    def _validate_responses(cls, v: dict[str, int]) -> dict[str, int]:
        if len(v) != UPCAP_TR_V1_N_ITEMS:
            raise ValueError(
                f"Pilot responses require {UPCAP_TR_V1_N_ITEMS} items"
            )
        for key, value in v.items():
            if key not in UPCAP_TR_V1_ITEM_KEYS:
                raise ValueError(f"Unknown item: {key}")
            if not 1 <= value <= 6:
                raise ValueError(f"Item {key} must be 1..6 (got {value})")
        return v


class UpCapPilotResponseAck(BaseModel):
    model_config = ConfigDict(extra="forbid")

    accepted: bool
    consent_id: str
    response_id: str
    wave: int
    message: str


class UpCapTRSectorNormsResponse(BaseModel):
    """Response body for GET /v1/score/upcap-tr/norms."""

    model_config = ConfigDict(extra="forbid")

    scale_code: str
    scale_version: str
    validated: bool
    overall: dict[str, object]
    sectors: dict[str, dict[str, object]]
    age_bands: dict[str, dict[str, object]]
    disclaimer: str
