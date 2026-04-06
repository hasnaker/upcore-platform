"""Unified response schemas re-export.

Individual instrument response schemas live in their own modules;
this module re-exports them and defines batch/norm/reliability responses.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.bat import BATScoreResponse
from app.schemas.common import ModelCard, NormReference
from app.schemas.copsoq import COPSOQScoreResponse
from app.schemas.jdr import JDRScoreResponse
from app.schemas.strengths import StrengthsScoreResponse
from app.schemas.upcap import UpCapScoreResponse


class NormTableResponse(BaseModel):
    """GET /v1/norms/{instrument}/{version} response."""

    model_config = ConfigDict(extra="forbid")

    norm: NormReference
    subscale_means: dict[str, float] = Field(default_factory=dict)
    subscale_sds: dict[str, float] = Field(default_factory=dict)
    cutoffs: dict[str, dict[str, float]] = Field(default_factory=dict)
    percentile_count: int = Field(ge=0)


class ReliabilityResponse(BaseModel):
    """GET /v1/reliability/{tenant_id}/{instrument} response."""

    model_config = ConfigDict(extra="forbid")

    tenant_id: str
    instrument: str
    cronbach_alpha: float | None
    n_responses: int
    period_days: int = 90
    computed_at: datetime


class ModelCardResponse(BaseModel):
    """GET /v1/model-card/{instrument} response."""

    model_config = ConfigDict(extra="forbid")

    card: ModelCard


class BatchResultItem(BaseModel):
    """Single result within a batch response."""

    model_config = ConfigDict(extra="forbid")

    index: int
    instrument: str
    success: bool
    result: dict[str, object] | None = None
    error: str | None = None


class BatchScoreResponse(BaseModel):
    """POST /v1/score/batch response."""

    model_config = ConfigDict(extra="forbid")

    total: int
    succeeded: int
    failed: int
    results: list[BatchResultItem]


__all__ = [
    "BATScoreResponse",
    "BatchResultItem",
    "BatchScoreResponse",
    "COPSOQScoreResponse",
    "JDRScoreResponse",
    "ModelCardResponse",
    "NormTableResponse",
    "ReliabilityResponse",
    "StrengthsScoreResponse",
    "UpCapScoreResponse",
]
