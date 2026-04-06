"""FastAPI dependency injection providers."""

from __future__ import annotations

from typing import AsyncGenerator

import asyncpg
import redis.asyncio as redis
import structlog

from app.config import settings

logger = structlog.get_logger()

_pg_pool: asyncpg.Pool | None = None
_redis_pool: redis.Redis | None = None


async def init_pg_pool() -> asyncpg.Pool:
    """Initialize PostgreSQL connection pool with pgvector."""
    global _pg_pool
    if _pg_pool is None:
        _pg_pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=settings.DB_POOL_MIN,
            max_size=settings.DB_POOL_MAX,
        )
        logger.info("pg_pool_initialized")
    return _pg_pool


async def close_pg_pool() -> None:
    global _pg_pool
    if _pg_pool is not None:
        await _pg_pool.close()
        _pg_pool = None


async def init_redis_pool() -> redis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_pool


async def close_redis_pool() -> None:
    global _redis_pool
    if _redis_pool is not None:
        await _redis_pool.close()
        _redis_pool = None


async def get_pg() -> AsyncGenerator[asyncpg.Pool, None]:
    if _pg_pool is None:
        raise RuntimeError("PostgreSQL pool not initialized")
    yield _pg_pool


async def get_redis() -> AsyncGenerator[redis.Redis, None]:
    if _redis_pool is None:
        raise RuntimeError("Redis pool not initialized")
    yield _redis_pool
