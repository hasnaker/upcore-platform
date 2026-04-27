"""Training trigger and job management endpoints."""

from __future__ import annotations

from uuid import uuid4

import structlog
from fastapi import APIRouter, HTTPException, status

from app.schemas.requests import TrainTriggerRequest

logger = structlog.get_logger()
router = APIRouter()

# In-memory job store for V1; production uses Redis/DB
_training_jobs: dict[str, dict] = {}


@router.post("/trigger")
async def trigger_training(req: TrainTriggerRequest) -> dict:
    """Trigger a model retraining job.

    Requires ml_ops role (enforced by API gateway in production).
    Enqueues retraining job and returns job ID.
    """
    job_id = str(uuid4())

    _training_jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "tenant_id": str(req.tenant_id),
        "data_range_days": req.data_range_days,
        "config_overrides": req.config_overrides,
        "message": "Training job queued. LSTM training requires GPU and sufficient data.",
    }

    logger.info(
        "training_job_queued",
        job_id=job_id,
        tenant_id=str(req.tenant_id),
        data_range_days=req.data_range_days,
    )

    return _training_jobs[job_id]


@router.get("/jobs/{job_id}")
async def get_training_job(job_id: str) -> dict:
    """Get status of a training job."""
    if job_id not in _training_jobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training job '{job_id}' not found.",
        )
    return _training_jobs[job_id]
