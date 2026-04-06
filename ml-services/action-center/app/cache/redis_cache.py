"""Redis cache for action center responses.

30-minute TTL per (tenant, user, role, scope_hash).
Invalidated on upstream signal changes.
"""

from __future__ import annotations

import hashlib
import json

import structlog

from app.config import settings

logger = structlog.get_logger()


def build_cache_key(tenant_id: str, user_id: str, role: str, scope: dict | None = None) -> str:
    """Build deterministic cache key from request parameters."""
    scope_str = json.dumps(scope or {}, sort_keys=True)
    scope_hash = hashlib.md5(scope_str.encode()).hexdigest()[:8]
    return f"actions:{tenant_id}:{user_id}:{role}:{scope_hash}"


async def get_cached(redis_client, key: str) -> dict | None:
    """Get cached response from Redis.

    Args:
        redis_client: Async Redis client.
        key: Cache key.

    Returns:
        Cached response dict or None.
    """
    if redis_client is None:
        return None

    try:
        data = await redis_client.get(key)
        if data:
            logger.debug("cache_hit", key=key)
            return json.loads(data)
    except Exception:
        logger.debug("cache_get_failed", key=key, exc_info=True)

    return None


async def set_cached(
    redis_client,
    key: str,
    response: dict,
    ttl: int | None = None,
) -> None:
    """Cache response in Redis.

    Args:
        redis_client: Async Redis client.
        key: Cache key.
        response: Response dict to cache.
        ttl: Time-to-live in seconds (default: settings.CACHE_TTL_SECONDS).
    """
    if redis_client is None:
        return

    if ttl is None:
        ttl = settings.CACHE_TTL_SECONDS

    try:
        await redis_client.setex(key, ttl, json.dumps(response, default=str))
        logger.debug("cache_set", key=key, ttl=ttl)
    except Exception:
        logger.debug("cache_set_failed", key=key, exc_info=True)


async def invalidate(redis_client, pattern: str) -> int:
    """Invalidate cache entries matching pattern.

    Args:
        redis_client: Async Redis client.
        pattern: Key pattern to match (e.g., "actions:tenant_id:*").

    Returns:
        Number of keys deleted.
    """
    if redis_client is None:
        return 0

    try:
        keys = []
        async for key in redis_client.scan_iter(match=pattern, count=100):
            keys.append(key)

        if keys:
            deleted = await redis_client.delete(*keys)
            logger.info("cache_invalidated", pattern=pattern, deleted=deleted)
            return deleted
        return 0
    except Exception:
        logger.debug("cache_invalidation_failed", pattern=pattern, exc_info=True)
        return 0
