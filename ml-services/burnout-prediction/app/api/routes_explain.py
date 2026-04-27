"""Explanation endpoints: SHAP-based feature explanations."""

from __future__ import annotations

from uuid import UUID

import structlog
from fastapi import APIRouter

logger = structlog.get_logger()
router = APIRouter()


@router.get("/{employee_id}")
async def get_explanation(employee_id: UUID) -> dict:
    """Get stored SHAP explanation for last prediction of an employee.

    For V1: returns a message indicating explanations are generated
    inline with predictions. In production, stored explanations will
    be served from the database.
    """
    # In production: query stored explanation from pg
    # For V1 heuristic: explanations are returned inline in prediction response
    return {
        "employee_id": str(employee_id),
        "message": "Explanations are included in the prediction response. "
        "Stored explanation retrieval will be available when LSTM model is active.",
        "model_type": "heuristic_v0.1",
    }
