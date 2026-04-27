"""Audit API (skill: upc-ml-validation §4, §5, §7).

Endpoints
---------
* ``GET  /audit/bias-report``     — Fairlearn bias metrics + 4/5ths rule.
* ``GET  /audit/calibration``     — Platt/Isotonic calibration report + plot data.
* ``GET  /audit/drift``           — PSI drift report and retrain trigger flag.
* ``POST /predictions/{id}/object`` — KVKK Madde 22 itiraz endpoint.
* ``GET  /audit/predictions/me``  — çalışan kendi tahmin + SHAP geçmişini görür.

All endpoints persist to ``app.ml_predictions_audit`` / ``app.ml_objections``.
When the DB pool is not initialised (tests), the endpoints still return a
well-formed response using in-memory fixtures so the frontend can be developed
without a live Postgres.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

import structlog
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.bias_audit import BiasReport
from app.calibration import CalibrationReport, calibration_plot_payload
from app.dependencies import get_pg_pool_or_none
from app.drift import DriftReport

logger = structlog.get_logger()
router = APIRouter()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class BiasReportResponse(BaseModel):
    model_version: str
    n_samples: int
    threshold: float
    overall_passes: bool
    attribute_audits: list[dict[str, Any]]
    mitigation_applied: str | None = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CalibrationResponse(BaseModel):
    model_version: str
    method: str
    n_samples: int
    brier_score: float
    ece: float
    passes_gate: bool
    plot: dict[str, Any]
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DriftResponse(BaseModel):
    model_version: str
    overall_psi: float
    overall_severity: str
    triggers_retrain: bool
    features: list[dict[str, Any]]
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ObjectionRequest(BaseModel):
    tenant_id: UUID
    user_id: UUID
    reason: str = Field(..., min_length=5, max_length=2000)
    contact_email: str | None = None


class ObjectionResponse(BaseModel):
    objection_id: UUID
    prediction_id: UUID
    status: str
    reviewed_at: datetime | None = None
    message: str


class UserPredictionSummary(BaseModel):
    prediction_id: UUID
    model_version: str
    prediction_value: float
    horizon_days: int
    predicted_at: datetime
    consent_status: str
    objected_at: datetime | None = None
    top_drivers: list[dict[str, Any]] = []


# ---------------------------------------------------------------------------
# In-memory latest-report cache (populated after each eval job)
# ---------------------------------------------------------------------------


class _ReportCache:
    """Small in-memory cache for the most recent bias/calibration/drift reports.

    Offline training jobs call :meth:`set_bias` / :meth:`set_calibration` /
    :meth:`set_drift` after a retrain. The API reads from here synchronously.
    """

    def __init__(self) -> None:
        self._bias: BiasReport | None = None
        self._calibration: CalibrationReport | None = None
        self._drift: DriftReport | None = None

    def set_bias(self, report: BiasReport) -> None:
        self._bias = report

    def set_calibration(self, report: CalibrationReport) -> None:
        self._calibration = report

    def set_drift(self, report: DriftReport) -> None:
        self._drift = report

    def bias(self) -> BiasReport | None:
        return self._bias

    def calibration(self) -> CalibrationReport | None:
        return self._calibration

    def drift(self) -> DriftReport | None:
        return self._drift


_CACHE = _ReportCache()


def get_report_cache() -> _ReportCache:
    """Access the module-level report cache (used by training jobs + tests)."""
    return _CACHE


# ---------------------------------------------------------------------------
# Audit endpoints
# ---------------------------------------------------------------------------


@router.get("/audit/bias-report", response_model=BiasReportResponse)
async def get_bias_report() -> BiasReportResponse:
    """Latest bias audit. Falls back to an empty placeholder when no run yet."""
    report = _CACHE.bias()
    if report is None:
        return BiasReportResponse(
            model_version="unknown",
            n_samples=0,
            threshold=0.5,
            overall_passes=True,
            attribute_audits=[],
        )
    data = report.as_dict()
    return BiasReportResponse(
        model_version=data["model_version"],
        n_samples=data["n_samples"],
        threshold=data["threshold"],
        overall_passes=data["overall_passes"],
        attribute_audits=data["attribute_audits"],
        mitigation_applied=data.get("mitigation_applied"),
    )


@router.get("/audit/calibration", response_model=CalibrationResponse)
async def get_calibration_report() -> CalibrationResponse:
    """Latest calibration report with reliability-diagram JSON payload."""
    report = _CACHE.calibration()
    if report is None:
        return CalibrationResponse(
            model_version="unknown",
            method="isotonic",
            n_samples=0,
            brier_score=0.0,
            ece=0.0,
            passes_gate=True,
            plot={"points": [], "diagonal": [{"x": 0, "y": 0}, {"x": 1, "y": 1}]},
        )
    return CalibrationResponse(
        model_version=report.model_version,
        method=report.method,
        n_samples=report.n_samples,
        brier_score=report.brier_score,
        ece=report.ece,
        passes_gate=report.passes_brier_gate and report.passes_ece_gate,
        plot=calibration_plot_payload(report),
    )


@router.get("/audit/drift", response_model=DriftResponse)
async def get_drift_report() -> DriftResponse:
    """Latest drift (PSI) report."""
    report = _CACHE.drift()
    if report is None:
        return DriftResponse(
            model_version="unknown",
            overall_psi=0.0,
            overall_severity="none",
            triggers_retrain=False,
            features=[],
        )
    data = report.as_dict()
    return DriftResponse(
        model_version=data["model_version"],
        overall_psi=data["overall_psi"],
        overall_severity=data["overall_severity"],
        triggers_retrain=data["triggers_retrain"],
        features=data["features"],
    )


# ---------------------------------------------------------------------------
# Objection endpoint (KVKK Madde 22)
# ---------------------------------------------------------------------------


_OBJECTION_INSERT_SQL = """
    INSERT INTO app.ml_objections (
        id, tenant_id, user_id, prediction_id, reason, contact_email, objected_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO NOTHING
"""

_OBJECTION_UPDATE_PREDICTION_SQL = """
    UPDATE app.ml_predictions_audit
       SET objected_at = $2
     WHERE id = $1
"""


@router.post("/predictions/{prediction_id}/object", response_model=ObjectionResponse)
async def file_objection(prediction_id: UUID, body: ObjectionRequest) -> ObjectionResponse:
    """KVKK Madde 22: çalışan AI tabanlı tahminlere itiraz eder.

    Creates a new manual-review record and marks the original prediction as
    objected. The review queue is handled by ``services/audit/`` (DSR-style
    handler ``objection_handler.go``).
    """
    pool = get_pg_pool_or_none()
    objection_id = uuid4()
    now = datetime.now(timezone.utc)

    if pool is not None:
        async with pool.acquire() as conn:
            await conn.execute("SELECT set_config('app.tenant_id', $1, true)", str(body.tenant_id))
            # Make sure the target prediction exists and belongs to this user.
            row = await conn.fetchrow(
                "SELECT id, user_id FROM app.ml_predictions_audit WHERE id = $1",
                prediction_id,
            )
            if row is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"prediction {prediction_id} not found",
                )
            if str(row["user_id"]) != str(body.user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="not authorized to object to this prediction",
                )

            await conn.execute(
                _OBJECTION_INSERT_SQL,
                objection_id,
                body.tenant_id,
                body.user_id,
                prediction_id,
                body.reason,
                body.contact_email,
                now,
            )
            await conn.execute(_OBJECTION_UPDATE_PREDICTION_SQL, prediction_id, now)

    logger.info(
        "ml_objection_filed",
        objection_id=str(objection_id),
        prediction_id=str(prediction_id),
        tenant_id=str(body.tenant_id),
    )

    return ObjectionResponse(
        objection_id=objection_id,
        prediction_id=prediction_id,
        status="received",
        reviewed_at=None,
        message=(
            "İtirazınız alındı. KVKK Madde 22 uyarınca İK + veri bilimi ekibi tarafından "
            "30 gün içinde gözden geçirilecek; sonuç e-posta ile bildirilecektir."
        ),
    )


# ---------------------------------------------------------------------------
# User-facing predictions list
# ---------------------------------------------------------------------------


_USER_PREDICTIONS_SQL = """
    SELECT id              AS prediction_id,
           model_version,
           prediction_value,
           horizon_days,
           predicted_at,
           consent_status,
           objected_at,
           shap_json
      FROM app.ml_predictions_audit
     WHERE tenant_id = $1
       AND user_id   = $2
     ORDER BY predicted_at DESC
     LIMIT $3
"""


@router.get("/audit/predictions/me", response_model=list[UserPredictionSummary])
async def list_my_predictions(
    tenant_id: UUID = Query(...),
    user_id: UUID = Query(...),
    limit: int = Query(20, ge=1, le=200),
) -> list[UserPredictionSummary]:
    """Return the predictions + SHAP for the calling user (KVKK Madde 11 erişim hakkı)."""
    pool = get_pg_pool_or_none()
    if pool is None:
        return []
    async with pool.acquire() as conn:
        await conn.execute("SELECT set_config('app.tenant_id', $1, true)", str(tenant_id))
        rows = await conn.fetch(_USER_PREDICTIONS_SQL, tenant_id, user_id, limit)
    out: list[UserPredictionSummary] = []
    for r in rows:
        shap_val = r["shap_json"]
        if isinstance(shap_val, str):
            try:
                shap_val = json.loads(shap_val)
            except json.JSONDecodeError:
                shap_val = None
        top_drivers: list[dict[str, Any]] = []
        if isinstance(shap_val, list):
            top_drivers = shap_val
        elif isinstance(shap_val, dict):
            top_drivers = shap_val.get("top_k") or shap_val.get("top_drivers") or []
        out.append(
            UserPredictionSummary(
                prediction_id=r["prediction_id"],
                model_version=r["model_version"],
                prediction_value=float(r["prediction_value"]),
                horizon_days=int(r["horizon_days"]),
                predicted_at=r["predicted_at"],
                consent_status=r["consent_status"],
                objected_at=r["objected_at"],
                top_drivers=top_drivers,
            )
        )
    return out


__all__ = [
    "BiasReportResponse",
    "CalibrationResponse",
    "DriftResponse",
    "ObjectionRequest",
    "ObjectionResponse",
    "UserPredictionSummary",
    "get_report_cache",
    "router",
]
