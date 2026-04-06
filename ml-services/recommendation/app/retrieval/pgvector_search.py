"""pgvector HNSW-backed nearest neighbor search.

Uses cosine similarity over text-embedding-3-large (3072d) vectors
stored in PostgreSQL with HNSW index for fast approximate search.
"""

from __future__ import annotations

from uuid import UUID

import structlog

from app.config import settings
from app.schemas.internal import CaseHit, SearchHit

logger = structlog.get_logger()


async def search_similar(
    pg_pool,
    query_embedding: list[float],
    tenant_id: UUID,
    k: int = 10,
    active_only: bool = True,
) -> list[SearchHit]:
    """Search for similar interventions using pgvector cosine similarity.

    SQL uses cosine distance operator (<=>).
    similarity = 1 - cosine_distance

    Args:
        pg_pool: asyncpg connection pool.
        query_embedding: Query embedding vector (3072d).
        tenant_id: Tenant scope.
        k: Number of results.
        active_only: Only return active interventions.

    Returns:
        List of SearchHit sorted by similarity descending.
    """
    if pg_pool is None:
        logger.debug("pgvector_search_skipped", reason="no_pg_pool")
        return []

    try:
        embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

        query = """
            SELECT id, title_tr, title_en, evidence_tier,
                   1 - (embedding <=> $1::vector) AS similarity
            FROM interventions
            WHERE active = $2
            ORDER BY embedding <=> $1::vector
            LIMIT $3
        """

        rows = await pg_pool.fetch(query, embedding_str, active_only, k)

        results = [
            SearchHit(
                intervention_id=row["id"],
                similarity=float(row["similarity"]),
                title_tr=row["title_tr"],
                title_en=row["title_en"],
                evidence_tier=row["evidence_tier"],
            )
            for row in rows
        ]

        logger.info(
            "pgvector_search_completed",
            k=k,
            results_count=len(results),
            top_similarity=results[0].similarity if results else 0.0,
        )

        return results

    except Exception as exc:
        logger.error("pgvector_search_failed", error=str(exc), exc_info=True)
        return []


async def search_cases(
    pg_pool,
    query_embedding: list[float],
    burnout_band: str | None = None,
    drivers: list[str] | None = None,
    k: int = 20,
) -> list[CaseHit]:
    """Search historical cases for CBR matching.

    Finds similar past employee profiles and their intervention outcomes.

    Args:
        pg_pool: asyncpg connection pool.
        query_embedding: Employee profile embedding.
        burnout_band: Optional burnout band filter.
        drivers: Optional driver feature filter.
        k: Number of cases to retrieve.

    Returns:
        List of CaseHit with intervention and outcome info.
    """
    if pg_pool is None:
        return []

    try:
        query = """
            SELECT case_id, intervention_id, outcome_success,
                   pre_bat, post_bat, days_elapsed,
                   1 - (employee_embedding <=> $1::vector) AS similarity
            FROM intervention_outcomes
            WHERE 1=1
        """
        params: list = [
            "[" + ",".join(str(v) for v in query_embedding) + "]"
        ]
        param_idx = 2

        if burnout_band:
            query += f" AND burnout_band = ${param_idx}"
            params.append(burnout_band)
            param_idx += 1

        query += f" ORDER BY employee_embedding <=> $1::vector LIMIT ${param_idx}"
        params.append(k)

        rows = await pg_pool.fetch(query, *params)

        return [
            CaseHit(
                case_id=row["case_id"],
                employee_embedding_similarity=float(row["similarity"]),
                intervention_id=row["intervention_id"],
                outcome_success=row["outcome_success"],
                pre_bat=float(row["pre_bat"]),
                post_bat=float(row["post_bat"]),
                days_elapsed=row["days_elapsed"],
            )
            for row in rows
        ]

    except Exception as exc:
        logger.error("case_search_failed", error=str(exc), exc_info=True)
        return []
