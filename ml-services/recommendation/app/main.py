"""FastAPI application factory for recommendation service."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from prometheus_client import make_asgi_app

from app.api.routes_catalog import router as catalog_router
from app.api.routes_effectiveness import router as effectiveness_router
from app.api.routes_feedback import router as feedback_router
from app.api.routes_health import router as health_router
from app.api.routes_recommend import router as recommend_router
from app.config import settings
from app.dependencies import close_pg_pool, close_redis_pool, init_pg_pool, init_redis_pool

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown."""
    logger.info("starting_recommendation_service", version=settings.SERVICE_VERSION)

    try:
        await init_pg_pool()
    except Exception:
        logger.warning("pg_pool_init_failed", exc_info=True)

    try:
        await init_redis_pool()
    except Exception:
        logger.warning("redis_pool_init_failed", exc_info=True)

    logger.info("recommendation_service_ready", port=settings.PORT)
    yield

    await close_pg_pool()
    await close_redis_pool()
    logger.info("recommendation_service_stopped")


def create_app() -> FastAPI:
    application = FastAPI(
        title="Upcore Recommendation Service",
        description="CBR-based intervention recommendation with Thompson sampling",
        version=settings.SERVICE_VERSION,
        lifespan=lifespan,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )

    metrics_app = make_asgi_app()
    application.mount("/metrics", metrics_app)

    application.include_router(health_router, tags=["health"])
    application.include_router(recommend_router, prefix="/api/v1/recommend", tags=["recommend"])
    application.include_router(feedback_router, prefix="/api/v1/recommend/feedback", tags=["feedback"])
    application.include_router(catalog_router, prefix="/api/v1/recommend/catalog", tags=["catalog"])
    application.include_router(effectiveness_router, prefix="/api/v1/recommend/effectiveness", tags=["effectiveness"])

    return application


app = create_app()
