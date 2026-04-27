"""Main action center endpoint: POST /v1/actions/next.

Orchestrates: cache lookup -> signal aggregation -> candidate building ->
scoring -> role filtering -> top-5 -> rationale generation -> cache -> return.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import structlog
from fastapi import APIRouter

from app.aggregation.action_builder import build_candidates
from app.aggregation.signal_aggregator import aggregate_signals
from app.config import settings
from app.filtering.role_matrix import filter_by_role
from app.rationale.prompt_templates import templated_fallback
from app.schemas.actions import RankedAction
from app.schemas.requests import NextActionsRequest
from app.schemas.responses import (
    Action,
    ActionTarget,
    CTAHint,
    NextActionsResponse,
)
from app.scoring.priority import score_and_rank

logger = structlog.get_logger()
router = APIRouter()


@router.post("/next", response_model=NextActionsResponse)
async def next_actions_endpoint(req: NextActionsRequest) -> NextActionsResponse:
    """Get top-5 prioritized actions for a user.

    Pipeline:
    1. Check Redis cache
    2. Aggregate signals from upstream services
    3. Build action candidates from signals
    4. Filter by role visibility
    5. Score and rank candidates
    6. Generate rationales (LLM with template fallback)
    7. Enforce max-5 (Miller's cognitive load)
    8. Cache response
    9. Return
    """
    # Step 1: Cache lookup (disabled for V1 without Redis)
    # cached = await get_cached(redis_client, cache_key)

    # Step 2: Aggregate signals
    bundles = await aggregate_signals(
        tenant_id=req.tenant_id,
        scope=req.scope.model_dump() if req.scope else None,
    )

    # Step 3: Build candidates
    candidates = build_candidates(bundles)

    if not candidates:
        return NextActionsResponse(
            actions=[],
            cached=False,
            generated_at=datetime.now(timezone.utc),
            ttl_seconds=settings.CACHE_TTL_SECONDS,
        )

    # Step 4: Filter by role
    filtered = filter_by_role(candidates, req.role)

    if not filtered:
        return NextActionsResponse(
            actions=[],
            cached=False,
            generated_at=datetime.now(timezone.utc),
            ttl_seconds=settings.CACHE_TTL_SECONDS,
        )

    # Step 5: Score and rank (includes max-5 enforcement)
    ranked = score_and_rank(filtered)

    # Step 6: Generate rationales (template fallback for V1)
    actions = _build_response_actions(ranked)

    # Step 7: Build response (already max-5 from score_and_rank)
    response = NextActionsResponse(
        actions=actions,
        cached=False,
        generated_at=datetime.now(timezone.utc),
        ttl_seconds=settings.CACHE_TTL_SECONDS,
    )

    logger.info(
        "next_actions_generated",
        user_id=str(req.user_id),
        role=req.role,
        action_count=len(actions),
    )

    return response


@router.post("/invalidate")
async def invalidate_cache(tenant_id: str, user_id: str | None = None) -> dict:
    """Force cache invalidation for a user or tenant."""
    # In production: invalidate Redis cache
    return {
        "status": "invalidated",
        "tenant_id": tenant_id,
        "user_id": user_id,
        "message": "Cache invalidation requested.",
    }


def _build_response_actions(ranked: list[RankedAction]) -> list[Action]:
    """Convert ranked actions to response model."""
    actions: list[Action] = []

    for ranked_action in ranked:
        c = ranked_action.candidate

        # Generate deterministic rationale (V1: no LLM)
        rationale = templated_fallback(c)

        action = Action(
            action_id=uuid4(),
            type=c.action_type.value,
            target=ActionTarget(
                employee_id=c.target_id,
                name_masked=c.target_name_masked,
            ),
            priority_score=ranked_action.priority_score,
            urgency=ranked_action.urgency,
            impact=ranked_action.impact,
            actionability=ranked_action.actionability,
            user_relevance=ranked_action.user_relevance,
            title_tr=c.title_tr,
            rationale_tr=rationale,
            suggested_within_hours=_severity_to_hours(c.severity_band),
            supporting_signals=c.supporting_signals,
            cta=CTAHint(kind="DEEP_LINK", href=c.cta_href),
        )
        actions.append(action)

    return actions


def _severity_to_hours(severity: str) -> int:
    """Map severity band to suggested action timeframe."""
    return {"RED": 24, "AMBER": 72, "GREEN": 168}.get(severity, 48)
