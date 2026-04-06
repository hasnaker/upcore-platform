"""Persistence layer for Thompson sampling posteriors.

Stores (intervention_id, segment, alpha, beta) in PostgreSQL
with Redis caching for fast reads.
"""

from __future__ import annotations

import json

import structlog

from app.config import settings
from app.effectiveness.thompson_sampling import update_posterior as ts_update

logger = structlog.get_logger()


class PosteriorStore:
    """Manages Thompson sampling posterior persistence."""

    def __init__(self, pg_pool, redis_client) -> None:
        self.pg = pg_pool
        self.redis = redis_client

    async def get_posterior(
        self,
        intervention_id: str,
        segment: str = "global",
    ) -> tuple[float, float]:
        """Get posterior (alpha, beta) for an intervention-segment pair.

        Falls back to prior if not found.
        """
        cache_key = f"posterior:{intervention_id}:{segment}"

        # Try Redis cache first
        if self.redis:
            try:
                cached = await self.redis.get(cache_key)
                if cached:
                    data = json.loads(cached)
                    return (data["alpha"], data["beta"])
            except Exception:
                pass

        # Try PostgreSQL
        if self.pg:
            try:
                row = await self.pg.fetchrow(
                    """SELECT alpha, beta FROM intervention_posteriors
                       WHERE intervention_id = $1 AND segment = $2""",
                    intervention_id,
                    segment,
                )
                if row:
                    alpha, beta = float(row["alpha"]), float(row["beta"])
                    await self._cache_posterior(cache_key, alpha, beta)
                    return (alpha, beta)
            except Exception:
                logger.debug("posterior_pg_lookup_failed", exc_info=True)

        # Return prior
        return (settings.THOMPSON_PRIOR_ALPHA, settings.THOMPSON_PRIOR_BETA)

    async def update_posterior(
        self,
        intervention_id: str,
        segment: str,
        success: bool,
    ) -> tuple[float, float]:
        """Update posterior with new observation."""
        current = await self.get_posterior(intervention_id, segment)
        new_alpha, new_beta = ts_update(current[0], current[1], success)

        # Persist to PostgreSQL
        if self.pg:
            try:
                await self.pg.execute(
                    """INSERT INTO intervention_posteriors (intervention_id, segment, alpha, beta)
                       VALUES ($1, $2, $3, $4)
                       ON CONFLICT (intervention_id, segment)
                       DO UPDATE SET alpha = $3, beta = $4, updated_at = NOW()""",
                    intervention_id,
                    segment,
                    new_alpha,
                    new_beta,
                )
            except Exception:
                logger.warning("posterior_pg_update_failed", exc_info=True)

        # Update cache
        cache_key = f"posterior:{intervention_id}:{segment}"
        await self._cache_posterior(cache_key, new_alpha, new_beta)

        logger.info(
            "posterior_updated",
            intervention_id=intervention_id,
            segment=segment,
            success=success,
            alpha=new_alpha,
            beta=new_beta,
        )

        return (new_alpha, new_beta)

    async def fallback_to_global(self, intervention_id: str) -> tuple[float, float]:
        """Get global (cross-tenant) posterior for an intervention."""
        return await self.get_posterior(intervention_id, segment="global")

    async def get_all_posteriors(
        self,
        intervention_ids: list[str],
        segment: str = "global",
    ) -> dict[str, tuple[float, float]]:
        """Get posteriors for multiple interventions."""
        result: dict[str, tuple[float, float]] = {}
        for iid in intervention_ids:
            result[iid] = await self.get_posterior(iid, segment)
        return result

    async def _cache_posterior(self, key: str, alpha: float, beta: float) -> None:
        """Cache posterior in Redis."""
        if self.redis:
            try:
                await self.redis.setex(
                    key,
                    settings.CACHE_TTL_SECONDS,
                    json.dumps({"alpha": alpha, "beta": beta}),
                )
            except Exception:
                pass
