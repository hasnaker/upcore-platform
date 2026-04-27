"""FastAPI application factory for the psychometric scoring service."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import (
    routes_bat,
    routes_batch,
    routes_copsoq,
    routes_fit,
    routes_health,
    routes_instruments,
    routes_jdr,
    routes_norms,
    routes_strengths,
    routes_upcap,
    routes_upcap_tr,
)
from app.config import get_settings
from app.core.exceptions import PsychometricError
from app.core.logging import configure_logging
from app.middleware import MetricsMiddleware, RequestIDMiddleware, TenantContextMiddleware
from app.norms.norm_loader import load_all_norms
from app.storage import pg_client, redis_client
from app.utils.errors import psychometric_error_handler

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application startup and shutdown lifecycle."""
    settings = get_settings()
    configure_logging(settings.log_level)

    logger.info(
        "service_starting",
        service=settings.service_name,
        version=settings.service_version,
        environment=settings.environment,
    )

    # Initialize storage connections
    if settings.redis_enabled:
        await redis_client.init_redis(settings.redis_url)

    if settings.db_enabled:
        await pg_client.init_pg(
            settings.database_url,
            min_size=settings.db_pool_min_size,
            max_size=settings.db_pool_max_size,
        )

    # Preload norm tables
    n_loaded = load_all_norms(settings.data_dir)
    logger.info("norms_preloaded", count=n_loaded)

    logger.info("service_ready", port=settings.port)

    yield

    # Shutdown
    logger.info("service_shutting_down")
    if settings.redis_enabled:
        await redis_client.close_redis()
    if settings.db_enabled:
        await pg_client.close_pg()
    logger.info("service_stopped")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Upcore Psychometric Scoring Service",
        description=(
            "Deterministic scoring engine for validated psychometric instruments. "
            "BAT-12-TR, COPSOQ-III-TR, UpCap-TR, JD-R, Strengths."
        ),
        version=__version__,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Exception handlers
    app.add_exception_handler(PsychometricError, psychometric_error_handler)

    # Middleware (order matters — outermost first)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.environment == "development" else [],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(MetricsMiddleware)
    app.add_middleware(TenantContextMiddleware)
    app.add_middleware(RequestIDMiddleware)

    # Register routers
    app.include_router(routes_health.router)
    app.include_router(routes_bat.router)
    app.include_router(routes_jdr.router)
    app.include_router(routes_upcap.router)
    app.include_router(routes_upcap_tr.router)
    app.include_router(routes_copsoq.router)
    app.include_router(routes_strengths.router)
    app.include_router(routes_batch.router)
    app.include_router(routes_norms.router)
    app.include_router(routes_fit.router)
    app.include_router(routes_instruments.router)

    return app


# Module-level app instance for uvicorn
app = create_app()
