"""FastAPI application factory for action center service."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from prometheus_client import make_asgi_app

from app.api.routes_actions import router as actions_router
from app.api.routes_feedback import router as feedback_router
from app.api.routes_health import router as health_router
from app.api.routes_history import router as history_router
from app.config import settings
from app.dependencies import close_pg_pool, close_redis_pool, init_pg_pool, init_redis_pool

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("starting_action_center_service", version=settings.SERVICE_VERSION)

    try:
        await init_pg_pool()
    except Exception:
        logger.warning("pg_pool_init_failed", exc_info=True)

    try:
        await init_redis_pool()
    except Exception:
        logger.warning("redis_pool_init_failed", exc_info=True)

    logger.info("action_center_service_ready", port=settings.PORT)
    yield

    await close_pg_pool()
    await close_redis_pool()
    logger.info("action_center_service_stopped")


def create_app() -> FastAPI:
    application = FastAPI(
        title="Upcore Action Center Service",
        description="Priority-ranked action recommendations with LLM-generated Turkish rationales",
        version=settings.SERVICE_VERSION,
        lifespan=lifespan,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )

    metrics_app = make_asgi_app()
    application.mount("/metrics", metrics_app)

    application.include_router(health_router, tags=["health"])
    application.include_router(actions_router, prefix="/v1/actions", tags=["actions"])
    application.include_router(feedback_router, prefix="/v1/actions", tags=["feedback"])
    application.include_router(history_router, prefix="/v1/actions", tags=["history"])

    return application


app = create_app()
