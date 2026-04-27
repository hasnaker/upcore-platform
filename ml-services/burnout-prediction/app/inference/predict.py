"""Core inference pipeline for burnout prediction.

Orchestrates feature engineering, model inference (heuristic or LSTM),
MC-Dropout confidence intervals, and SHAP-like explanations.

Model type: heuristic_v0.1 active path
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

import structlog

from app.config import settings
from app.features.engineering import engineer_features
from app.inference.consent import check_ai_consent
from app.models.lstm_burnout import HeuristicBurnoutPredictor
from app.schemas.responses import (
    BurnoutPredictionResponse,
    FeatureContribution,
    HorizonPrediction,
    TrajectoryBand,
)

logger = structlog.get_logger()

# Singleton heuristic predictor
_heuristic_predictor = HeuristicBurnoutPredictor()

# Traffic-light classification thresholds per horizon
# Heuristic v0.1: same thresholds for all horizons
CLASSIFICATION_THRESHOLDS: dict[int, dict[str, float]] = {
    30: {"green_max": 0.25, "amber_max": 0.50},
    60: {"green_max": 0.25, "amber_max": 0.50},
    90: {"green_max": 0.25, "amber_max": 0.50},
}


class ConsentDeniedError(Exception):
    """Raised when an employee has not granted the ``ai_recommendations`` consent.

    The API layer translates this to HTTP 403 so the caller can show an
    opt-out notice in the UI ("Bu kullanıcı KVKK kapsamında AI önerilerinden
    çekilmiştir").
    """

    def __init__(self, employee_id: UUID, consent_status: str) -> None:
        self.employee_id = employee_id
        self.consent_status = consent_status
        super().__init__(
            f"employee {employee_id} opted out of AI predictions "
            f"(consent status = {consent_status})"
        )


async def predict_burnout(
    employee_id: UUID,
    tenant_id: UUID,
    horizons: list[int],
    raw_signals: dict[str, list[float] | float] | None = None,
    features: dict[str, float] | None = None,
) -> BurnoutPredictionResponse:
    """Run full burnout prediction pipeline.

    Args:
        employee_id: Target employee UUID.
        tenant_id: Tenant UUID.
        horizons: Prediction horizons (subset of [30, 60, 90]).
        raw_signals: Raw signal data for feature engineering.
        features: Pre-computed features (skip engineering if provided).

    Returns:
        BurnoutPredictionResponse with predictions for all horizons.

    Raises:
        ConsentDeniedError: when the employee has not granted the
            ``ai_recommendations`` consent. KVKK Madde 22 itiraz hakkı —
            otomatik karar alma süreçlerinden kullanıcı hariç tutulur.
    """
    # Step 0: KVKK çalışan rıza kontrolü — declined/revoked ise tahmin yapılmaz.
    consent = await check_ai_consent(tenant_id=tenant_id, employee_id=employee_id)
    if not consent.allowed:
        logger.info(
            "prediction_skipped_consent_denied",
            employee_id=str(employee_id),
            tenant_id=str(tenant_id),
            consent_status=consent.status,
        )
        raise ConsentDeniedError(
            employee_id=employee_id,
            consent_status=consent.status,
        )

    # Step 1: Feature engineering
    if features is None:
        if raw_signals is None:
            raw_signals = {}
        features = engineer_features(raw_signals)

    logger.info(
        "running_prediction",
        employee_id=str(employee_id),
        horizons=horizons,
        model_type=settings.ACTIVE_MODEL_TYPE,
        feature_count=len(features),
    )

    # Step 2: Model inference with MC-Dropout simulation
    predictions_raw = _heuristic_predictor.predict(
        features=features,
        horizons=horizons,
        n_samples=settings.MC_DROPOUT_SAMPLES,
    )

    # Step 3: Classify and build response
    predictions: dict[str, HorizonPrediction] = {}
    for horizon in horizons:
        pred = predictions_raw[horizon]
        classification = classify_traffic_light(pred["probability"], horizon)
        predictions[f"{horizon}d"] = HorizonPrediction(
            probability=pred["probability"],
            ci_lower=pred["ci_lower"],
            ci_upper=pred["ci_upper"],
            classification=classification,
        )

    # Step 4: Compute top drivers (pseudo-SHAP)
    top_drivers_raw = _heuristic_predictor.compute_top_drivers(features, k=5)
    top_drivers = [
        FeatureContribution(
            feature=d["feature"],
            shap=d["shap"],
            direction=d["direction"],
            label_tr=d.get("label_tr"),
        )
        for d in top_drivers_raw
    ]

    # Step 5: Generate trajectory band (simplified for heuristic)
    trajectory = _generate_heuristic_trajectory(features, predictions_raw)

    return BurnoutPredictionResponse(
        employee_id=employee_id,
        predictions=predictions,
        top_drivers=top_drivers,
        trajectory=trajectory,
        model_version=settings.ACTIVE_MODEL_TYPE,
        model_type=settings.ACTIVE_MODEL_TYPE,
        calibration_ece=None,  # Not applicable for heuristic model
        predicted_at=datetime.now(timezone.utc),
    )


def classify_traffic_light(
    probability: float,
    horizon: int,
) -> Literal["GREEN", "AMBER", "RED"]:
    """Classify burnout probability into traffic-light band.

    Thresholds (heuristic v0.1):
    - GREEN: probability <= 0.25
    - AMBER: 0.25 < probability <= 0.50
    - RED: probability > 0.50
    """
    thresholds = CLASSIFICATION_THRESHOLDS.get(horizon, {"green_max": 0.25, "amber_max": 0.50})

    if probability <= thresholds["green_max"]:
        return "GREEN"
    elif probability <= thresholds["amber_max"]:
        return "AMBER"
    else:
        return "RED"


def _generate_heuristic_trajectory(
    features: dict[str, float],
    predictions: dict[int, dict[str, float]],
) -> TrajectoryBand:
    """Generate simplified trajectory band for heuristic model.

    Heuristic v0.1: linear interpolation between horizon predictions
    with expanding CI bands.
    """
    import numpy as np

    # Use 30d and 90d predictions to create trajectory
    p30 = predictions.get(30, {}).get("probability", 0.3)
    p90 = predictions.get(90, {}).get("probability", 0.4)

    # Linear interpolation for 90 daily points
    days = np.arange(1, 91)
    mean_trajectory = p30 + (p90 - p30) * (days / 90.0)

    # Expanding CI: starts narrow, widens linearly
    ci_expansion = 0.04 + 0.12 * (days / 90.0)

    lower = np.clip(mean_trajectory - ci_expansion, 0.0, 1.0)
    upper = np.clip(mean_trajectory + ci_expansion, 0.0, 1.0)

    return TrajectoryBand(
        next_90d_band_lower=[round(float(v), 4) for v in lower],
        next_90d_band_upper=[round(float(v), 4) for v in upper],
    )
