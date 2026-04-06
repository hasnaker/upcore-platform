"""Internal data models used across modules."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal
from uuid import UUID


@dataclass
class MCPredictResult:
    """Result of MC-Dropout inference."""

    mean: float
    ci_lower: float
    ci_upper: float
    samples: list[float] = field(default_factory=list)


@dataclass
class HeuristicFeatures:
    """Extracted features for heuristic predictor."""

    bat_exhaustion_mean: float = 0.0
    bat_exhaustion_slope_30d: float = 0.0
    copsoq_workload_mean: float = 0.0
    jdr_balance_ratio: float = 1.0
    engagement_score: float = 0.5
    absence_days_30d: int = 0
    overtime_hours_30d: float = 0.0
    tenure_months: int = 12
    psycap_composite: float = 0.5
    recent_negative_events: int = 0
    manager_1on1_days_since: int = 14
    recognition_events_30d: int = 0
    team_size: int = 8
    after_hours_activity: float = 0.0
    survey_response_latency: float = 0.0


@dataclass
class PromotionDecision:
    """Model promotion gate decision."""

    allowed: bool
    reasons: list[str]
    metrics: dict[str, float]


@dataclass
class TrainingArtifact:
    """Output of a training run."""

    model_version: str
    model_path: str
    metrics: dict[str, float]
    promotion_decision: PromotionDecision | None = None


@dataclass
class PredictionRecord:
    """Persisted prediction record."""

    tenant_id: UUID
    employee_id: UUID
    model_version: str
    horizon: int
    probability: float
    ci_lower: float
    ci_upper: float
    classification: Literal["GREEN", "AMBER", "RED"]
    top_drivers: list[dict[str, float | str]]
