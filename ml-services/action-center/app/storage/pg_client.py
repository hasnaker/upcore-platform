"""PostgreSQL client for action event persistence."""

from __future__ import annotations

import structlog

logger = structlog.get_logger()


async def persist_action_event(
    pg_pool,
    tenant_id: str,
    user_id: str,
    action_id: str,
    event_type: str,
    metadata: dict | None = None,
) -> None:
    """Persist an action event (present, dismiss, complete, snooze)."""
    if pg_pool is None:
        logger.debug("action_event_not_persisted", reason="no_pg_pool")
        return

    try:
        await pg_pool.execute(
            """INSERT INTO action_events (tenant_id, user_id, action_id, event_type, metadata)
               VALUES ($1, $2, $3, $4, $5)""",
            tenant_id,
            user_id,
            action_id,
            event_type,
            str(metadata or {}),
        )
    except Exception:
        logger.warning("action_event_persist_failed", exc_info=True)


async def get_user_history(
    pg_pool,
    user_id: str,
    days: int = 30,
) -> list[dict]:
    """Get action history for a user."""
    if pg_pool is None:
        return []

    try:
        rows = await pg_pool.fetch(
            """SELECT action_id, event_type, metadata, created_at
               FROM action_events
               WHERE user_id = $1 AND created_at > NOW() - INTERVAL '%s days'
               ORDER BY created_at DESC
               LIMIT 100""",
            user_id,
        )
        return [dict(row) for row in rows]
    except Exception:
        logger.warning("user_history_fetch_failed", exc_info=True)
        return []
