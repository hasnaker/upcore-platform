"""Async Redis connection pool and operations.

Used for norm table caching and session management.
"""

from __future__ import annotations

import redis.asyncio as aioredis
import structlog

logger = structlog.get_logger(__name__)

_pool: aioredis.Redis | None = None


async def init_redis(redis_url: str) -> aioredis.Redis:
    """Initialize Redis connection pool."""
    global _pool
    _pool = aioredis.from_url(
        redis_url,
        decode_responses=True,
        max_connections=20,
    )
    logger.info("redis_connected", url=redis_url.split("@")[-1])
    return _pool


async def get_redis() -> aioredis.Redis | None:
    """Return the Redis client (None if not initialized)."""
    return _pool


async def close_redis() -> None:
    """Close the Redis connection pool."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("redis_closed")


async def health_check() -> bool:
    """Ping Redis and return True if healthy."""
    if _pool is None:
        return False
    try:
        result = await _pool.ping()
        return bool(result)
    except Exception:
        return False


async def cache_get(key: str) -> str | None:
    """Get a value from cache."""
    if _pool is None:
        return None
    return await _pool.get(key)


async def cache_set(key: str, value: str, ttl: int = 3600) -> None:
    """Set a value in cache with TTL."""
    if _pool is None:
        return
    await _pool.set(key, value, ex=ttl)
