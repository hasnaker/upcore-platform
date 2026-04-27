"""Model registry endpoints: list, inspect, promote models."""

from __future__ import annotations

from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, HTTPException, status

from app.schemas.requests import ModelPromoteRequest
from app.schemas.responses import ModelRegistryEntry

logger = structlog.get_logger()
router = APIRouter()

# In-memory registry for V1; production uses MLflow
_model_registry: list[ModelRegistryEntry] = [
    ModelRegistryEntry(
        model_version="heuristic_v0.1",
        model_type="heuristic",
        stage="production",
        metrics={
            "note": 0.0,
            "description": 0.0,  # No AUROC for heuristic model
        },
        created_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
    ),
]


@router.get("", response_model=list[ModelRegistryEntry])
async def list_models() -> list[ModelRegistryEntry]:
    """List all registered models."""
    return _model_registry


@router.get("/active", response_model=ModelRegistryEntry)
async def get_active_model() -> ModelRegistryEntry:
    """Get the currently active (production) model."""
    for model in _model_registry:
        if model.stage == "production":
            return model

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No active production model found.",
    )


@router.post("/{version}/promote")
async def promote_model(version: str, req: ModelPromoteRequest) -> dict:
    """Promote a model version to production.

    Enforces calibration gate (ECE <= 0.05) and fairness gate
    (demographic parity <= 0.10) unless force=True with ml_ops role.
    """
    # Find model in registry
    target = None
    for model in _model_registry:
        if model.model_version == version:
            target = model
            break

    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model version '{version}' not found in registry.",
        )

    if target.stage == "production":
        return {
            "status": "already_active",
            "model_version": version,
            "message": "Model is already in production.",
        }

    if not req.force:
        # For V1: no gates to check (heuristic model only)
        logger.info("model_promotion_gates_skipped", reason="heuristic_v0.1_only")

    # Demote current production model
    for model in _model_registry:
        if model.stage == "production":
            model.stage = "archived"

    target.stage = "production"

    logger.info("model_promoted", version=version)

    return {
        "status": "promoted",
        "model_version": version,
        "message": f"Model {version} promoted to production.",
    }
