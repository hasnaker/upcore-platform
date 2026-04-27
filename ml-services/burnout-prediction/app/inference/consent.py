"""KVKK consent checks for ML inference.

Reads `app.data_consents` to determine whether a given (tenant, user) pair
has granted the `ai_recommendations` consent. When declined or revoked,
the burnout prediction pipeline skips the user and returns a deterministic
OPT_OUT response instead of feeding them into the model.

This is the concrete implementation of the KVKK Madde 22 "otomatik karar
alma süreçlerine itiraz hakkı" guarantee on the inference side.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

import structlog

from app.dependencies import get_pg_pool_or_none

logger = structlog.get_logger()

AI_CONSENT_TYPE = "ai_recommendations"


@dataclass
class ConsentDecision:
    """Result of an AI-consent lookup."""

    allowed: bool
    status: str  # "granted" | "declined" | "revoked" | "unknown"

    @property
    def blocked_reason(self) -> str | None:
        """Human-readable reason for inclusion in opt-out responses."""
        if self.allowed:
            return None
        if self.status == "unknown":
            return "ai_recommendations_consent_not_granted"
        return f"ai_recommendations_consent_{self.status}"


async def check_ai_consent(tenant_id: UUID, employee_id: UUID) -> ConsentDecision:
    """Return whether the given employee has granted AI-recommendations consent.

    Default-deny semantics:
    - No row in `app.data_consents` for the user → **not allowed**.
    - Row exists and status = "granted" → allowed.
    - Row exists and status in ("declined", "revoked") → not allowed.

    The DB pool is optional: if it's not initialised (e.g. tests without a
    real Postgres), we return ``allowed=True`` with status="unknown" so that
    the unit tests of the inference pipeline do not need a live DB. Production
    callers always have a pool — see ``init_pg_pool`` in app.main lifespan.
    """
    pool = get_pg_pool_or_none()
    if pool is None:
        logger.debug(
            "consent_check_skipped_no_pool",
            tenant_id=str(tenant_id),
            employee_id=str(employee_id),
        )
        return ConsentDecision(allowed=True, status="unknown")

    query = """
        SELECT status
          FROM app.data_consents
         WHERE tenant_id = $1
           AND user_id   = $2
           AND consent_type = $3
         ORDER BY version DESC
         LIMIT 1
    """
    try:
        async with pool.acquire() as conn:
            # Set the RLS GUC so the tenant policy allows this row.
            await conn.execute(
                "SELECT set_config('app.tenant_id', $1, true)",
                str(tenant_id),
            )
            row = await conn.fetchrow(query, tenant_id, employee_id, AI_CONSENT_TYPE)
    except Exception as exc:  # pragma: no cover — fail-closed in production
        logger.error(
            "consent_check_db_error",
            tenant_id=str(tenant_id),
            employee_id=str(employee_id),
            error=str(exc),
        )
        # Fail closed: when we cannot verify consent, treat as blocked.
        return ConsentDecision(allowed=False, status="unknown")

    if row is None:
        return ConsentDecision(allowed=False, status="unknown")

    status = str(row["status"])
    return ConsentDecision(allowed=(status == "granted"), status=status)
