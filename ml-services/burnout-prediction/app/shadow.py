"""Shadow-mode inference infrastructure (skill: upc-ml-validation §5).

"Shadow mode" means the new challenger model runs **in parallel** with the
current production model on live traffic, but its predictions are **never**
shown to the end user. We persist them to ``app.ml_predictions_audit`` and
later compare them against the observed outcome (12-week burnout signal).

This module provides:

* :class:`ShadowRouter` — takes a production prediction + challenger prediction
  pair, returns only the prod one, but queues the shadow record for persistence.
* :class:`ShadowOutcomeJoiner` — offline job that joins old shadow predictions
  with observed outcomes and produces prospective-AUC + calibration metrics.
* :func:`compute_shadow_auc` — prospective AUROC on joined records.

The actual Postgres queries are wrapped via asyncpg.Pool to match the pattern
of the rest of the service (see ``app/dependencies.py``).
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable
from uuid import UUID, uuid4

import numpy as np
import structlog

from app.dependencies import get_pg_pool_or_none

logger = structlog.get_logger()


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


@dataclass
class ShadowPrediction:
    """A single shadow-mode prediction event awaiting outcome join."""

    prediction_id: UUID
    tenant_id: UUID
    user_id: UUID
    model_version: str
    prediction_value: float
    shown_to_user: bool
    consent_status: str
    shap_json: dict[str, Any] | None
    horizon_days: int
    predicted_at: datetime

    def as_dict(self) -> dict[str, Any]:
        return {
            **asdict(self),
            "prediction_id": str(self.prediction_id),
            "tenant_id": str(self.tenant_id),
            "user_id": str(self.user_id),
            "predicted_at": self.predicted_at.isoformat(),
        }


@dataclass
class ShadowJoinedRecord:
    """Shadow prediction + observed outcome joined for evaluation."""

    prediction_id: UUID
    model_version: str
    predicted_probability: float
    outcome_actual: int  # 0 / 1
    days_to_outcome: int


@dataclass
class ShadowMetrics:
    model_version: str
    n_samples: int
    auroc: float
    brier_score: float
    positive_rate: float


# ---------------------------------------------------------------------------
# Shadow Router
# ---------------------------------------------------------------------------


class ShadowRouter:
    """Routes a request between production + challenger model transparently.

    Usage::

        router = ShadowRouter(prod_fn=predict_prod, shadow_fn=predict_challenger)
        result = await router.run(tenant_id, user_id, features)
        # result is ONLY the prod prediction; shadow is persisted async.
    """

    def __init__(
        self,
        *,
        prod_fn,
        shadow_fn,
        challenger_model_version: str,
        shown_to_user: bool = False,
    ) -> None:
        self._prod_fn = prod_fn
        self._shadow_fn = shadow_fn
        self._challenger_model_version = challenger_model_version
        self._shown_to_user = shown_to_user

    async def run(
        self,
        *,
        tenant_id: UUID,
        user_id: UUID,
        features: dict[str, float],
        horizon_days: int = 90,
        consent_status: str = "granted",
    ) -> dict[str, Any]:
        prod_result = await _maybe_await(self._prod_fn(features))
        shadow_result = None
        try:
            shadow_result = await _maybe_await(self._shadow_fn(features))
        except Exception as exc:
            # Shadow MUST NEVER break the user request.
            logger.warning("shadow_prediction_failed", error=str(exc))

        if shadow_result is not None:
            shadow_pred = _extract_prob(shadow_result)
            shadow_record = ShadowPrediction(
                prediction_id=uuid4(),
                tenant_id=tenant_id,
                user_id=user_id,
                model_version=self._challenger_model_version,
                prediction_value=float(shadow_pred),
                shown_to_user=self._shown_to_user,
                consent_status=consent_status,
                shap_json=_extract_shap(shadow_result),
                horizon_days=horizon_days,
                predicted_at=datetime.now(timezone.utc),
            )
            await persist_shadow_prediction(shadow_record)

        return prod_result


async def _maybe_await(value):
    import inspect

    if inspect.isawaitable(value):
        return await value
    return value


def _extract_prob(result: Any) -> float:
    if isinstance(result, (int, float)):
        return float(result)
    if isinstance(result, dict):
        for k in ("probability", "prediction", "score"):
            if k in result:
                return float(result[k])
    if hasattr(result, "probability"):
        return float(result.probability)
    raise ValueError(f"cannot extract probability from {type(result)}")


def _extract_shap(result: Any) -> dict[str, Any] | None:
    if isinstance(result, dict):
        return result.get("shap") or result.get("top_drivers")
    return None


# ---------------------------------------------------------------------------
# Persistence (app.ml_predictions_audit)
# ---------------------------------------------------------------------------


_INSERT_SHADOW_SQL = """
    INSERT INTO app.ml_predictions_audit (
        id, tenant_id, user_id, model_version, prediction_value,
        shown_to_user, consent_status, shap_json, horizon_days, predicted_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
    ON CONFLICT (id) DO NOTHING
"""


async def persist_shadow_prediction(record: ShadowPrediction) -> bool:
    """Persist a shadow prediction to ``app.ml_predictions_audit``.

    Returns ``True`` when the row was written, ``False`` when the DB pool
    is not available (test / smoke mode). Failures to persist are logged
    but never raised — the user-visible request must not fail because of
    shadow-mode bookkeeping.
    """
    pool = get_pg_pool_or_none()
    if pool is None:
        logger.debug("shadow_persist_skipped_no_pool", prediction_id=str(record.prediction_id))
        return False

    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "SELECT set_config('app.tenant_id', $1, true)", str(record.tenant_id)
            )
            await conn.execute(
                _INSERT_SHADOW_SQL,
                record.prediction_id,
                record.tenant_id,
                record.user_id,
                record.model_version,
                record.prediction_value,
                record.shown_to_user,
                record.consent_status,
                json.dumps(record.shap_json) if record.shap_json else None,
                record.horizon_days,
                record.predicted_at,
            )
        return True
    except Exception as exc:  # pragma: no cover — log-only failure path
        logger.warning(
            "shadow_persist_failed", error=str(exc), prediction_id=str(record.prediction_id)
        )
        return False


# ---------------------------------------------------------------------------
# Outcome joiner + prospective AUC
# ---------------------------------------------------------------------------


class ShadowOutcomeJoiner:
    """Offline job — joins shadow predictions with observed outcomes."""

    DEFAULT_LOOKBACK_DAYS = 90

    _JOIN_SQL = """
        SELECT p.id                AS prediction_id,
               p.model_version     AS model_version,
               p.prediction_value  AS prediction_value,
               p.horizon_days      AS horizon_days,
               p.outcome_actual    AS outcome_actual,
               p.predicted_at      AS predicted_at,
               p.outcome_observed_at AS outcome_observed_at
          FROM app.ml_predictions_audit p
         WHERE p.model_version    = $1
           AND p.outcome_actual IS NOT NULL
           AND p.predicted_at    >= $2
    """

    async def fetch_joined(
        self,
        *,
        model_version: str,
        lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    ) -> list[ShadowJoinedRecord]:
        pool = get_pg_pool_or_none()
        if pool is None:
            return []
        cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)
        async with pool.acquire() as conn:
            rows = await conn.fetch(self._JOIN_SQL, model_version, cutoff)
        out: list[ShadowJoinedRecord] = []
        for r in rows:
            days = 0
            if r["outcome_observed_at"] and r["predicted_at"]:
                days = (r["outcome_observed_at"] - r["predicted_at"]).days
            out.append(
                ShadowJoinedRecord(
                    prediction_id=r["prediction_id"],
                    model_version=r["model_version"],
                    predicted_probability=float(r["prediction_value"]),
                    outcome_actual=int(r["outcome_actual"]),
                    days_to_outcome=int(days),
                )
            )
        return out


def compute_shadow_auc(records: Iterable[ShadowJoinedRecord]) -> ShadowMetrics | None:
    """Compute prospective AUROC + Brier for a set of joined records."""
    records = list(records)
    if not records:
        return None
    probs = np.asarray([r.predicted_probability for r in records], dtype=np.float64)
    labels = np.asarray([r.outcome_actual for r in records], dtype=np.int64)
    if np.unique(labels).size < 2:
        return ShadowMetrics(
            model_version=records[0].model_version,
            n_samples=int(probs.size),
            auroc=0.0,
            brier_score=float(np.mean((probs - labels) ** 2)),
            positive_rate=float(np.mean(labels)),
        )

    # Mann-Whitney-U-based AUROC (no sklearn dependency)
    order = np.argsort(probs)
    ranks = np.empty_like(order, dtype=np.float64)
    ranks[order] = np.arange(1, len(probs) + 1)
    n_pos = float(np.sum(labels == 1))
    n_neg = float(np.sum(labels == 0))
    rank_sum_pos = float(np.sum(ranks[labels == 1]))
    auc = (rank_sum_pos - n_pos * (n_pos + 1) / 2.0) / (n_pos * n_neg)

    return ShadowMetrics(
        model_version=records[0].model_version,
        n_samples=int(probs.size),
        auroc=float(auc),
        brier_score=float(np.mean((probs - labels) ** 2)),
        positive_rate=float(np.mean(labels)),
    )


__all__ = [
    "ShadowJoinedRecord",
    "ShadowMetrics",
    "ShadowOutcomeJoiner",
    "ShadowPrediction",
    "ShadowRouter",
    "compute_shadow_auc",
    "persist_shadow_prediction",
]
