"""Redis client utilities for action center."""

from __future__ import annotations

import json

import structlog

logger = structlog.get_logger()


async def ping_redis(redis_client) -> bool:
    """Check Redis connectivity."""
    if redis_client is None:
        return False
    try:
        await redis_client.ping()
        return True
    except Exception:
        return False
