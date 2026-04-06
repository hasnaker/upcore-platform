"""Health check endpoints."""

from __future__ import annotations

import structlog
from fastapi import APIRouter

from app.config import settings
from app.dependencies import _pg_pool, _redis_pool
from app.schemas.responses import HealthResponse

logger = structlog.get_logger()
router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        service=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        checks={"service": True},
    )


@router.get("/ready", response_model=HealthResponse)
async def readiness_check() -> HealthResponse:
    checks: dict[str, bool] = {"service": True}

    try:
        if _pg_pool is not None:
            async with _pg_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            checks["postgresql"] = True
        else:
            checks["postgresql"] = False
    except Exception:
        checks["postgresql"] = False

    try:
        if _redis_pool is not None:
            await _redis_pool.ping()
            checks["redis"] = True
        else:
            checks["redis"] = False
    except Exception:
        checks["redis"] = False

    all_ok = all(checks.values())
    status_val = "healthy" if all_ok else "degraded"

    return HealthResponse(
        status=status_val,
        service=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        checks=checks,
    )
