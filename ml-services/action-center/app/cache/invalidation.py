"""Cache invalidation handlers for upstream events.

Subscribes to signal update events and invalidates relevant cache keys.
"""

from __future__ import annotations

import structlog

from app.cache.redis_cache import invalidate

logger = structlog.get_logger()


async def on_event(redis_client, event: dict) -> None:
    """Handle upstream event and invalidate relevant cache.

    Events:
    - burnout.score.updated: invalidate user's actions
    - recommendation.updated: invalidate user's actions
    - action.completed/dismissed: invalidate user's actions
    """
    event_type = event.get("type", "")
    tenant_id = event.get("tenant_id", "")
    user_id = event.get("user_id", "")

    if not tenant_id:
        return

    if user_id:
        pattern = f"actions:{tenant_id}:{user_id}:*"
    else:
        pattern = f"actions:{tenant_id}:*"

    count = await invalidate(redis_client, pattern)

    logger.info(
        "event_triggered_invalidation",
        event_type=event_type,
        tenant_id=tenant_id,
        user_id=user_id,
        invalidated_count=count,
    )


async def invalidate_user(redis_client, tenant_id: str, user_id: str) -> int:
    """Invalidate all cache entries for a specific user."""
    pattern = f"actions:{tenant_id}:{user_id}:*"
    return await invalidate(redis_client, pattern)


async def invalidate_tenant(redis_client, tenant_id: str) -> int:
    """Invalidate all cache entries for a tenant."""
    pattern = f"actions:{tenant_id}:*"
    return await invalidate(redis_client, pattern)
