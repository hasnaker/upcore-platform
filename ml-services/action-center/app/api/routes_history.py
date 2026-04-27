"""Action history + recap endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

import structlog
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.schemas.responses import ActionHistoryResponse

logger = structlog.get_logger()
router = APIRouter()


@router.get("/history/{user_id}", response_model=ActionHistoryResponse)
async def get_action_history(user_id: UUID) -> ActionHistoryResponse:
    """Get last 30 days of actions for a user.

    Returns presented, dismissed, completed, and snoozed actions.
    For V1: returns empty history (no persistence yet).
    """
    return ActionHistoryResponse(
        user_id=user_id,
        actions=[],
        period_days=30,
    )


# ---------------------------------------------------------------------------
# Weekly recap — aggregated metrics for the panel's "Bu Hafta" section
# ---------------------------------------------------------------------------

class RecapMetric(BaseModel):
    """One summary metric in the weekly recap."""

    key: str
    label_tr: str
    value: int
    change_vs_prev: int = Field(default=0, description="Positive = more than prev period")
    breakdown: list[dict] = Field(default_factory=list)


class RecapResponse(BaseModel):
    """Panel haftalık özet yanıtı."""

    period: Literal["7d", "14d", "30d"] = "7d"
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metrics: list[RecapMetric]


@router.get("/recap", response_model=RecapResponse)
async def get_recap(
    period: Literal["7d", "14d", "30d"] = Query("7d", description="Dönem"),
) -> RecapResponse:
    """Aksiyon merkezi haftalık özet.

    V1: deterministik demo rakamları — gerçek persistence eklenince
    veritabanından çekilecek (presented / dismissed / completed / snoozed
    sayıları, önerilen koçluk sayısı, yapılan assessment sayısı, rotasyon).
    """
    # Persistence-backed aggregation lives in the recap worker (wave-11);
    # here we return a deterministic V1 sample so the dashboard renders
    # without a database roundtrip during demos.
    metrics = [
        RecapMetric(
            key="completed_actions",
            label_tr="Tamamlanan Aksiyon",
            value=12,
            change_vs_prev=3,
            breakdown=[
                {"label_tr": "Onaylanan", "value": 8},
                {"label_tr": "Reddedilen", "value": 2},
                {"label_tr": "Ertelenen", "value": 2},
            ],
        ),
        RecapMetric(
            key="suggested_coaching",
            label_tr="Önerilen Koçluk",
            value=5,
            change_vs_prev=1,
            breakdown=[
                {"label_tr": "Aktif", "value": 3},
                {"label_tr": "Tamamlanan", "value": 2},
            ],
        ),
        RecapMetric(
            key="assessments",
            label_tr="Yapılan Değerlendirme",
            value=18,
            change_vs_prev=-2,
            breakdown=[
                {"label_tr": "BAT-12-TR", "value": 14},
                {"label_tr": "IPIP-50-TR", "value": 4},
            ],
        ),
        RecapMetric(
            key="internal_rotations",
            label_tr="İç Rotasyon",
            value=2,
            change_vs_prev=0,
            breakdown=[
                {"label_tr": "Beklemede", "value": 1},
                {"label_tr": "Aktif", "value": 1},
            ],
        ),
    ]

    return RecapResponse(period=period, metrics=metrics)
