"""Request schemas for burnout prediction service."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class SignalTimestep(BaseModel):
    """A single timestep of feature signals."""

    date: str = Field(..., description="ISO date string, e.g. 2025-10-12")
    features: dict[str, float] = Field(
        ..., description="Feature name to value mapping for this timestep"
    )


class BurnoutPredictRequest(BaseModel):
    """Request for single employee burnout prediction."""

    tenant_id: UUID
    employee_id: UUID
    horizon_days: list[int] = Field(
        default=[30, 60, 90],
        description="Prediction horizons in days. Allowed: 30, 60, 90.",
    )
    signal_window: list[SignalTimestep] | None = Field(
        default=None,
        description="Optional pre-computed signal window. If None, features are computed from stored data.",
    )
    model_version: str | None = Field(
        default=None,
        description="Specific model version to use. If None, uses active model.",
    )

    def validate_horizons(self) -> None:
        """Validate that all horizons are in the allowed set."""
        allowed = {30, 60, 90}
        invalid = set(self.horizon_days) - allowed
        if invalid:
            raise ValueError(f"Invalid horizon_days: {invalid}. Allowed: {allowed}")


class BurnoutBatchRequest(BaseModel):
    """Request for batch burnout prediction."""

    tenant_id: UUID
    employee_ids: list[UUID] = Field(..., max_length=5000)
    horizon_days: list[int] = Field(default=[30, 60, 90])
    model_version: str | None = None


class CohortPredictRequest(BaseModel):
    """Request for team/cohort aggregated prediction."""

    tenant_id: UUID
    team_id: UUID | None = None
    department_id: UUID | None = None
    horizon_days: list[int] = Field(default=[30, 60, 90])


class TrainTriggerRequest(BaseModel):
    """Request to trigger model retraining."""

    tenant_id: UUID
    data_range_days: int = Field(default=365, ge=90, le=730)
    config_overrides: dict[str, float | int | str] | None = None


class ModelPromoteRequest(BaseModel):
    """Request to promote a model version."""

    model_version: str
    force: bool = Field(default=False, description="Skip gates (requires ml_ops role)")
