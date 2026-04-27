"""Health, readiness, and metrics endpoints.

GET /health  — liveness probe
GET /ready   — readiness probe (checks Redis + pg + norms)
GET /metrics — Prometheus exposition
"""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.config import get_settings
from app.norms.norm_tables import list_norm_tables
from app.storage import pg_client, redis_client

router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness probe")
async def health() -> dict[str, str]:
    """Simple liveness check — always returns OK if the process is running."""
    return {"status": "ok"}


@router.get("/ready", summary="Readiness probe")
async def ready() -> dict[str, object]:
    """Readiness check — verifies Redis, PostgreSQL, and norm tables are loaded."""
    settings = get_settings()
    checks: dict[str, bool] = {}

    # Redis check
    if settings.redis_enabled:
        checks["redis"] = await redis_client.health_check()
    else:
        checks["redis"] = True  # not required

    # PostgreSQL check
    if settings.db_enabled:
        checks["postgres"] = await pg_client.health_check()
    else:
        checks["postgres"] = True  # not required

    # Norms check
    norms = list_norm_tables()
    checks["norms_loaded"] = len(norms) > 0

    all_ready = all(checks.values())

    return {
        "status": "ready" if all_ready else "not_ready",
        "checks": checks,
        "norms_count": len(norms),
    }


@router.get("/metrics", summary="Prometheus metrics")
async def metrics() -> PlainTextResponse:
    """Prometheus metrics exposition endpoint."""
    return PlainTextResponse(
        content=generate_latest().decode("utf-8"),
        media_type=CONTENT_TYPE_LATEST,
    )
