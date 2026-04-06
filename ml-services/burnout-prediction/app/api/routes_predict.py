"""Prediction API routes: individual, batch, and cohort endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

import structlog
from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.inference.predict import predict_burnout
from app.schemas.requests import (
    BurnoutBatchRequest,
    BurnoutPredictRequest,
    CohortPredictRequest,
)
from app.schemas.responses import (
    BatchJobResponse,
    BurnoutPredictionResponse,
    CohortHorizonStats,
    CohortPredictionResponse,
)

logger = structlog.get_logger()
router = APIRouter()

# Allowed horizon values
ALLOWED_HORIZONS = {30, 60, 90}


@router.post("/burnout", response_model=BurnoutPredictionResponse)
async def predict_endpoint(req: BurnoutPredictRequest) -> BurnoutPredictionResponse:
    """Predict burnout risk for a single employee.

    Accepts employee features (or signal window for feature engineering)
    and returns multi-horizon burnout probabilities with confidence
    intervals, top drivers, and trajectory band.
    """
    # Validate horizons
    invalid = set(req.horizon_days) - ALLOWED_HORIZONS
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid horizon_days: {invalid}. Allowed: {ALLOWED_HORIZONS}",
        )

    # Build features from signal window if provided
    raw_signals: dict[str, list[float] | float] | None = None
    if req.signal_window:
        raw_signals = _extract_signals_from_window(req.signal_window)

    try:
        response = await predict_burnout(
            employee_id=req.employee_id,
            tenant_id=req.tenant_id,
            horizons=req.horizon_days,
            raw_signals=raw_signals,
        )
    except Exception as exc:
        logger.error(
            "prediction_failed",
            employee_id=str(req.employee_id),
            error=str(exc),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prediction failed. Please try again later.",
        ) from exc

    logger.info(
        "prediction_completed",
        employee_id=str(req.employee_id),
        model_type=response.model_type,
        horizons=req.horizon_days,
    )

    return response


@router.post("/batch", response_model=BatchJobResponse)
async def batch_predict_endpoint(req: BurnoutBatchRequest) -> BatchJobResponse:
    """Submit a batch prediction job for multiple employees.

    Max batch size: 5000 employees. Returns a job ID for polling.
    Results are retrieved via GET /v1/predict/jobs/{job_id}.
    """
    if len(req.employee_ids) > 5000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Batch size exceeds maximum of 5000 employees.",
        )

    invalid = set(req.horizon_days) - ALLOWED_HORIZONS
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid horizon_days: {invalid}. Allowed: {ALLOWED_HORIZONS}",
        )

    job_id = uuid4()
    employee_count = len(req.employee_ids)

    # Estimate processing time: ~50ms per employee for heuristic model
    estimated_seconds = max(1, employee_count * 50 // 1000)

    logger.info(
        "batch_job_submitted",
        job_id=str(job_id),
        employee_count=employee_count,
        estimated_seconds=estimated_seconds,
    )

    # In production, this would enqueue to a task queue (Celery/ARQ)
    # For V1, we return the job ID immediately
    return BatchJobResponse(
        job_id=job_id,
        status="queued",
        employee_count=employee_count,
        estimated_seconds=estimated_seconds,
    )


@router.post("/cohort", response_model=CohortPredictionResponse)
async def cohort_predict_endpoint(req: CohortPredictRequest) -> CohortPredictionResponse:
    """Compute aggregated burnout risk for a team or department.

    Returns mean risk, distribution stats, and hotspot counts per horizon.
    """
    invalid = set(req.horizon_days) - ALLOWED_HORIZONS
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid horizon_days: {invalid}. Allowed: {ALLOWED_HORIZONS}",
        )

    # For V1: return placeholder aggregation
    # In production, this queries all team members and aggregates predictions
    horizon_stats: dict[str, CohortHorizonStats] = {}
    for horizon in req.horizon_days:
        horizon_stats[f"{horizon}d"] = CohortHorizonStats(
            mean_risk=0.0,
            median_risk=0.0,
            std_risk=0.0,
            red_count=0,
            amber_count=0,
            green_count=0,
        )

    return CohortPredictionResponse(
        team_id=req.team_id,
        department_id=req.department_id,
        employee_count=0,
        horizon_stats=horizon_stats,
        hotspot_count=0,
        predicted_at=datetime.now(timezone.utc),
    )


def _extract_signals_from_window(
    signal_window: list,
) -> dict[str, list[float] | float]:
    """Extract raw signals from a signal window for feature engineering."""
    signals: dict[str, list[float]] = {}

    for timestep in signal_window:
        for key, value in timestep.features.items():
            if key not in signals:
                signals[key] = []
            signals[key].append(float(value))

    return signals
