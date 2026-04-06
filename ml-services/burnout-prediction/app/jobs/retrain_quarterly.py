"""Quarterly model retraining job.

Pulls last 365 days of data, runs the full training pipeline,
evaluates against baselines, attempts promotion, and notifies.

For V1: stub implementation. Activated when LSTM training pipeline is ready.
"""

from __future__ import annotations

from datetime import datetime, timezone

import structlog

from app.schemas.internal import TrainingArtifact

logger = structlog.get_logger()


async def run_quarterly_retrain(
    tenant_id: str,
    data_range_days: int = 365,
) -> TrainingArtifact:
    """Execute quarterly retraining pipeline.

    Steps:
    1. Pull training data (last N days)
    2. Feature engineering on full dataset
    3. Train LSTM with hyperparams.yaml config
    4. Train baselines (LR + LightGBM)
    5. Evaluate all models on held-out test set
    6. Run promotion gates
    7. If passed: register and promote
    8. Notify via email/Slack

    Args:
        tenant_id: Tenant to retrain for.
        data_range_days: Days of historical data to use.

    Returns:
        TrainingArtifact with model path and metrics.
    """
    start_time = datetime.now(timezone.utc)

    logger.info(
        "quarterly_retrain_started",
        tenant_id=tenant_id,
        data_range_days=data_range_days,
        started_at=start_time.isoformat(),
    )

    # For V1: return placeholder
    # This will be activated when sufficient training data exists
    artifact = TrainingArtifact(
        model_version="heuristic_v0.1",
        model_path="",
        metrics={
            "status": 0.0,
            "message": 0.0,  # Placeholder: retraining requires training data
        },
        promotion_decision=None,
    )

    elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()

    logger.info(
        "quarterly_retrain_completed",
        tenant_id=tenant_id,
        model_version=artifact.model_version,
        elapsed_seconds=elapsed,
    )

    return artifact
