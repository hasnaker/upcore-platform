"""Async PostgreSQL connection pool and scoring result persistence.

Stores every scoring event in `assessment_scores` for audit trail.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any
from uuid import UUID

import structlog

logger = structlog.get_logger(__name__)

_pool: Any = None  # asyncpg.Pool


async def init_pg(database_url: str, min_size: int = 2, max_size: int = 10) -> Any:
    """Initialize asyncpg connection pool."""
    global _pool
    try:
        import asyncpg

        _pool = await asyncpg.create_pool(
            database_url, min_size=min_size, max_size=max_size
        )
        logger.info("pg_connected", pool_size=f"{min_size}-{max_size}")
        return _pool
    except Exception as exc:
        logger.warning("pg_connection_failed", error=str(exc))
        return None


async def get_pg() -> Any:
    """Return the asyncpg pool (None if not initialized)."""
    return _pool


async def close_pg() -> None:
    """Close the asyncpg pool."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("pg_closed")


async def health_check() -> bool:
    """Check if PostgreSQL is reachable."""
    if _pool is None:
        return False
    try:
        async with _pool.acquire() as conn:
            result = await conn.fetchval("SELECT 1")
            return result == 1
    except Exception:
        return False


async def persist_scoring_result(
    tenant_id: UUID,
    employee_id: UUID,
    assessment_id: UUID,
    instrument: str,
    norm_version: str,
    scored_at: datetime,
    service_version: str,
    raw_responses: dict[str, int],
    scored_result: dict[str, object],
) -> bool:
    """Persist a scoring result to the assessment_scores table.

    Returns True on success, False if database is unavailable.
    """
    if _pool is None:
        logger.debug("pg_not_available", action="persist_scoring_result_skipped")
        return False

    try:
        async with _pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO assessment_scores
                    (tenant_id, employee_id, assessment_id, instrument,
                     norm_version, scored_at, service_version,
                     raw_responses, scored_result)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (assessment_id, instrument) DO UPDATE SET
                    scored_at = EXCLUDED.scored_at,
                    scored_result = EXCLUDED.scored_result
                """,
                tenant_id,
                employee_id,
                assessment_id,
                instrument,
                norm_version,
                scored_at,
                service_version,
                json.dumps(raw_responses),
                json.dumps(scored_result, default=str),
            )
        return True
    except Exception as exc:
        logger.error("persist_scoring_result_failed", error=str(exc))
        return False
