"""Response schemas for burnout prediction service."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class FeatureContribution(BaseModel):
    """A single feature's contribution to the prediction."""

    feature: str
    shap_value: float = Field(..., alias="shap")
    direction: Literal["positive", "negative"]
    label_tr: str | None = None


class HorizonPrediction(BaseModel):
    """Prediction result for a single horizon."""

    probability: float = Field(..., ge=0.0, le=1.0)
    ci_lower: float = Field(..., ge=0.0, le=1.0)
    ci_upper: float = Field(..., ge=0.0, le=1.0)
    classification: Literal["GREEN", "AMBER", "RED"]


class TrajectoryBand(BaseModel):
    """90-day trajectory prediction band."""

    next_90d_band_lower: list[float]
    next_90d_band_upper: list[float]


class BurnoutPredictionResponse(BaseModel):
    """Full burnout prediction response."""

    employee_id: UUID
    predictions: dict[str, HorizonPrediction]
    top_drivers: list[FeatureContribution]
    trajectory: TrajectoryBand | None = None
    model_version: str
    model_type: str
    calibration_ece: float | None = None
    predicted_at: datetime = Field(default_factory=datetime.utcnow)


class BatchJobResponse(BaseModel):
    """Response for batch prediction job submission."""

    job_id: UUID
    status: Literal["queued", "processing", "completed", "failed"]
    employee_count: int
    estimated_seconds: int | None = None


class CohortPredictionResponse(BaseModel):
    """Aggregated team/cohort prediction."""

    team_id: UUID | None = None
    department_id: UUID | None = None
    employee_count: int
    horizon_stats: dict[str, CohortHorizonStats]
    hotspot_count: int
    predicted_at: datetime = Field(default_factory=datetime.utcnow)


class CohortHorizonStats(BaseModel):
    """Stats for a single horizon in cohort prediction."""

    mean_risk: float
    median_risk: float
    std_risk: float
    red_count: int
    amber_count: int
    green_count: int


class CalibrationReport(BaseModel):
    """Model calibration report."""

    model_version: str
    ece: float
    brier_score: float
    reliability_bins: list[ReliabilityBin]


class ReliabilityBin(BaseModel):
    """Single bin of reliability diagram."""

    bin_center: float
    predicted_mean: float
    observed_fraction: float
    count: int


class FairnessReport(BaseModel):
    """Model fairness report."""

    model_version: str
    groups: list[FairnessGroupReport]
    demographic_parity_max_diff: float
    passes_gate: bool


class FairnessGroupReport(BaseModel):
    """Fairness metrics for a single demographic group."""

    group_name: str
    group_value: str
    auroc: float
    positive_rate: float
    sample_count: int


class ModelRegistryEntry(BaseModel):
    """Entry from the model registry."""

    model_version: str
    model_type: str
    stage: Literal["staging", "production", "archived"]
    metrics: dict[str, float]
    created_at: datetime


class HealthResponse(BaseModel):
    """Health check response."""

    status: Literal["healthy", "degraded", "unhealthy"]
    service: str
    version: str
    model_loaded: bool
    model_type: str
    checks: dict[str, bool]
