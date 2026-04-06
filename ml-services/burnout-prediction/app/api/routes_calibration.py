"""Calibration report endpoints."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, status

from app.schemas.responses import CalibrationReport

logger = structlog.get_logger()
router = APIRouter()


@router.get("/{model_version}", response_model=CalibrationReport)
async def get_calibration_report(model_version: str) -> CalibrationReport:
    """Get calibration report for a model version.

    Returns reliability diagram data, ECE, and Brier score.
    For heuristic_v0.1: returns placeholder (calibration not applicable).
    """
    if model_version == "heuristic_v0.1":
        return CalibrationReport(
            model_version=model_version,
            ece=0.0,
            brier_score=0.0,
            reliability_bins=[],
        )

    # For future LSTM models: retrieve stored calibration artifacts
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Calibration report not found for model version '{model_version}'.",
    )
