"""PostgreSQL client with pgvector codec registration."""

from __future__ import annotations

import structlog


logger = structlog.get_logger()


async def register_pgvector_codec(pool) -> None:
    """Register pgvector vector type codec with asyncpg.

    Must be called after pool creation to handle vector columns.
    """
    try:
        async with pool.acquire() as conn:
            # Ensure pgvector extension exists
            await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
            logger.info("pgvector_extension_ensured")
    except Exception as exc:
        logger.warning("pgvector_registration_failed", error=str(exc))


async def ensure_tables(pool) -> None:
    """Create required tables if they don't exist.

    For V1: creates interventions and outcomes tables.
    """
    if pool is None:
        return

    try:
        async with pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS interventions (
                    id UUID PRIMARY KEY,
                    title_tr TEXT NOT NULL,
                    title_en TEXT NOT NULL,
                    description_tr TEXT DEFAULT '',
                    description_en TEXT DEFAULT '',
                    evidence_tier VARCHAR(1) DEFAULT 'C',
                    target_drivers JSONB DEFAULT '[]',
                    target_burnout_band JSONB DEFAULT '[]',
                    delivery_mode VARCHAR(20) DEFAULT 'async',
                    expected_effect_size FLOAT DEFAULT 0.0,
                    time_to_effect_weeks INT DEFAULT 4,
                    cost_tier VARCHAR(10) DEFAULT 'low',
                    citations JSONB DEFAULT '[]',
                    embedding vector(3072),
                    active BOOLEAN DEFAULT true,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS intervention_posteriors (
                    intervention_id TEXT NOT NULL,
                    segment TEXT NOT NULL DEFAULT 'global',
                    alpha FLOAT DEFAULT 1.0,
                    beta FLOAT DEFAULT 1.0,
                    updated_at TIMESTAMPTZ DEFAULT NOW(),
                    PRIMARY KEY (intervention_id, segment)
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS intervention_outcomes (
                    case_id UUID PRIMARY KEY,
                    tenant_id UUID,
                    employee_id UUID,
                    intervention_id UUID REFERENCES interventions(id),
                    burnout_band VARCHAR(10),
                    outcome_success BOOLEAN,
                    pre_bat FLOAT,
                    post_bat FLOAT,
                    days_elapsed INT,
                    employee_embedding vector(3072),
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)

            logger.info("recommendation_tables_ensured")
    except Exception as exc:
        logger.warning("table_creation_failed", error=str(exc))
