"""Health check endpoints: liveness and readiness probes."""

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
    """Liveness probe. Returns basic service status."""
    return HealthResponse(
        status="healthy",
        service=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        model_loaded=True,  # Heuristic model is always "loaded"
        model_type=settings.ACTIVE_MODEL_TYPE,
        checks={"model": True},
    )


@router.get("/ready", response_model=HealthResponse)
async def readiness_check() -> HealthResponse:
    """Readiness probe. Verifies all dependencies are available."""
    checks: dict[str, bool] = {
        "model": True,  # Heuristic model is always available
    }

    # Check PostgreSQL
    try:
        if _pg_pool is not None:
            async with _pg_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            checks["postgresql"] = True
        else:
            checks["postgresql"] = False
    except Exception:
        checks["postgresql"] = False
        logger.warning("readiness_pg_failed", exc_info=True)

    # Check Redis
    try:
        if _redis_pool is not None:
            await _redis_pool.ping()
            checks["redis"] = True
        else:
            checks["redis"] = False
    except Exception:
        checks["redis"] = False
        logger.warning("readiness_redis_failed", exc_info=True)

    all_ok = all(checks.values())
    any_critical_down = not checks.get("model", False)

    if any_critical_down:
        status_val = "unhealthy"
    elif not all_ok:
        status_val = "degraded"
    else:
        status_val = "healthy"

    return HealthResponse(
        status=status_val,
        service=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        model_loaded=checks["model"],
        model_type=settings.ACTIVE_MODEL_TYPE,
        checks=checks,
    )
