"""Redis client utilities for recommendation service."""

from __future__ import annotations

import json

import structlog

logger = structlog.get_logger()


async def cache_get(redis_client, key: str) -> dict | None:
    """Get cached value from Redis."""
    if redis_client is None:
        return None
    try:
        data = await redis_client.get(key)
        if data:
            return json.loads(data)
    except Exception:
        pass
    return None


async def cache_set(redis_client, key: str, value: dict, ttl: int = 300) -> None:
    """Set cached value in Redis with TTL."""
    if redis_client is None:
        return
    try:
        await redis_client.setex(key, ttl, json.dumps(value))
    except Exception:
        logger.debug("cache_set_failed", key=key, exc_info=True)
