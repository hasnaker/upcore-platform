"""Shared enums and helper schemas."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class TrafficLight(StrEnum):
    """Traffic-light risk classification."""

    GREEN = "GREEN"
    AMBER = "AMBER"
    RED = "RED"


class ConfidenceLevel(StrEnum):
    """Scientific confidence level for the scoring result."""

    PROVISIONAL = "provisional"
    VALIDATED = "validated"
    HEURISTIC = "heuristic"


class CalibrationStatus(StrEnum):
    """Calibration status for model/instrument."""

    HEURISTIC_V01 = "heuristic_v0.1"
    PROVISIONAL = "provisional"
    TURKISH_VALIDATED = "turkish_validated"
    PENDING_CALIBRATION = "pending_calibration"


class ReliabilityInfo(BaseModel):
    """Reliability block attached to scoring responses."""

    model_config = ConfigDict(extra="forbid")

    cronbach_alpha: float | None = Field(
        default=None,
        ge=-1.0,
        le=1.0,
        description="Cronbach alpha computed over supplied items (None if N<2)",
    )
    n_items: int = Field(ge=0)
    interpretation: str | None = Field(default=None)
    warning: bool = Field(default=False, description="True when alpha < instrument threshold")


class NormReference(BaseModel):
    """Norm table reference metadata."""

    model_config = ConfigDict(extra="forbid")

    instrument: str
    version: str
    source: str
    n: int = Field(ge=0)
    collected_at: str | None = None
    citation: str
    license: str


class ScoringMetadata(BaseModel):
    """Per-response scoring metadata."""

    model_config = ConfigDict(extra="forbid")

    service_version: str
    scored_at: datetime
    scorer: str
    norm_version: str
    confidence: ConfidenceLevel
    calibration_status: CalibrationStatus
    notes: str | None = None


class ModelCard(BaseModel):
    """Model card (Mitchell et al. 2019)."""

    model_config = ConfigDict(extra="forbid")

    instrument: str
    version: str
    intended_use: str
    limitations: str
    citations: list[str]
    reliability: dict[str, object]
    norms: dict[str, object]
    turkish_validation_status: str
    known_biases: list[str]
    fairness_notes: str
    scoring_method: str
    license: str


class InstrumentSummary(BaseModel):
    """Instrument catalogue entry."""

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    items: int
    subscales: list[str]
    response_scale: str
    license: str
    calibration_status: CalibrationStatus
    citations: list[str]


class ErrorResponse(BaseModel):
    """RFC 7807-style error response body."""

    model_config = ConfigDict(extra="forbid")

    error_code: str
    message: str
    details: dict[str, object] = Field(default_factory=dict)
