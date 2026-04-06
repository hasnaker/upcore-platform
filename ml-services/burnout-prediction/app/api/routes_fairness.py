"""Fairness report endpoints."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, status

from app.schemas.responses import FairnessReport

logger = structlog.get_logger()
router = APIRouter()


@router.get("/{model_version}", response_model=FairnessReport)
async def get_fairness_report(model_version: str) -> FairnessReport:
    """Get fairness report for a model version.

    Returns per-group AUROC, demographic parity, and gate pass status.
    For heuristic_v0.1: returns placeholder (fairness audit not applicable).
    """
    if model_version == "heuristic_v0.1":
        return FairnessReport(
            model_version=model_version,
            groups=[],
            demographic_parity_max_diff=0.0,
            passes_gate=True,
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Fairness report not found for model version '{model_version}'.",
    )
