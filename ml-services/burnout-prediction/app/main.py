"""FastAPI application factory for burnout prediction service."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from prometheus_client import make_asgi_app

from app.api.routes_calibration import router as calibration_router
from app.api.routes_explain import router as explain_router
from app.api.routes_fairness import router as fairness_router
from app.api.routes_health import router as health_router
from app.api.routes_models import router as models_router
from app.api.routes_predict import router as predict_router
from app.api.routes_train import router as train_router
from app.config import settings
from app.dependencies import close_pg_pool, close_redis_pool, init_pg_pool, init_redis_pool

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown."""
    logger.info(
        "starting_burnout_service",
        version=settings.SERVICE_VERSION,
        model_type=settings.ACTIVE_MODEL_TYPE,
        device=settings.DEVICE,
    )

    # Startup
    try:
        await init_pg_pool()
    except Exception:
        logger.warning("pg_pool_init_failed", exc_info=True)

    try:
        await init_redis_pool()
    except Exception:
        logger.warning("redis_pool_init_failed", exc_info=True)

    logger.info("burnout_service_ready", port=settings.PORT)

    yield

    # Shutdown
    await close_pg_pool()
    await close_redis_pool()
    logger.info("burnout_service_stopped")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title="Upcore Burnout Prediction Service",
        description="LSTM-based burnout prediction with MC-Dropout confidence intervals",
        version=settings.SERVICE_VERSION,
        lifespan=lifespan,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )

    # Mount Prometheus metrics
    metrics_app = make_asgi_app()
    application.mount("/metrics", metrics_app)

    # Register routers
    application.include_router(health_router, tags=["health"])
    application.include_router(predict_router, prefix="/v1/predict", tags=["predict"])
    application.include_router(train_router, prefix="/v1/train", tags=["train"])
    application.include_router(models_router, prefix="/v1/models", tags=["models"])
    application.include_router(calibration_router, prefix="/v1/calibration", tags=["calibration"])
    application.include_router(fairness_router, prefix="/v1/fairness", tags=["fairness"])
    application.include_router(explain_router, prefix="/v1/explain", tags=["explain"])

    return application


app = create_app()
