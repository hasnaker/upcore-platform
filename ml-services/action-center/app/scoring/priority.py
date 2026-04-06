"""Priority scoring: combines urgency, impact, actionability, and user relevance.

priority = urgency x impact x actionability x user_relevance

All factors are in [0, 1]. Product is in [0, 1].
Max 5 actions enforced (Miller's cognitive load limit).

Model type: heuristic_v0.1 (rule-based scoring, no learned weights)
"""

from __future__ import annotations

import structlog

from app.config import settings
from app.schemas.actions import ActionCandidate, RankedAction

logger = structlog.get_logger()


def compute_priority(
    urgency: float,
    impact: float,
    actionability: float,
    user_relevance: float,
) -> float:
    """Compute priority score as product of four factors.

    All factors must be in [0, 1]. Result is clamped to [0, 1].

    Args:
        urgency: How time-sensitive is this action.
        impact: Expected positive impact if acted upon.
        actionability: How easy is it to execute.
        user_relevance: How relevant is this to this specific user.

    Returns:
        Priority score in [0, 1].
    """
    score = urgency * impact * actionability * user_relevance
    return max(0.0, min(1.0, score))


def rank_actions(candidates: list[RankedAction]) -> list[RankedAction]:
    """Sort actions by priority score descending.

    Args:
        candidates: List of scored actions.

    Returns:
        Sorted list (highest priority first).
    """
    return sorted(candidates, key=lambda a: a.priority_score, reverse=True)


def enforce_max_5(ranked: list[RankedAction]) -> list[RankedAction]:
    """Enforce Miller's cognitive load limit: max 5 actions.

    Logs how many actions were dropped.

    Args:
        ranked: Sorted action list.

    Returns:
        Top 5 actions.
    """
    max_actions = settings.MAX_ACTIONS
    if len(ranked) > max_actions:
        dropped = len(ranked) - max_actions
        logger.info("actions_truncated", total=len(ranked), kept=max_actions, dropped=dropped)
        return ranked[:max_actions]
    return ranked


def break_ties(actions: list[RankedAction]) -> list[RankedAction]:
    """Break ties in priority score using secondary criteria.

    Tie-breaking order:
    1. Higher severity band (RED > AMBER > GREEN)
    2. More recent (lower days_until_horizon)
    3. Lexical on action type name

    Args:
        actions: Equally scored actions.

    Returns:
        Tie-broken list.
    """
    severity_order = {"RED": 3, "AMBER": 2, "GREEN": 1}

    def sort_key(action: RankedAction) -> tuple:
        return (
            -action.priority_score,
            -severity_order.get(action.candidate.severity_band, 0),
            action.candidate.days_until_horizon,
            action.candidate.action_type.value,
        )

    return sorted(actions, key=sort_key)


def score_and_rank(candidates: list[ActionCandidate], user_history: dict | None = None) -> list[RankedAction]:
    """Full scoring pipeline: score -> rank -> tie-break -> enforce max 5.

    Args:
        candidates: Raw action candidates.
        user_history: Optional user interaction history for relevance.

    Returns:
        Top 5 prioritized actions.
    """
    from app.scoring.actionability import compute_actionability
    from app.scoring.impact import compute_impact
    from app.scoring.relevance import compute_user_relevance
    from app.scoring.urgency import compute_urgency

    scored: list[RankedAction] = []

    for candidate in candidates:
        urgency = compute_urgency(
            severity_band=candidate.severity_band,
            days_until_horizon=candidate.days_until_horizon,
            trend_slope=candidate.trend_slope,
        )
        impact = compute_impact(
            effect_size=candidate.effect_size,
            n_affected=candidate.n_affected,
        )
        actionability = compute_actionability(
            time_required_hours=candidate.time_required_hours,
            authority_level=candidate.authority_level,
            budget_tier=candidate.budget_tier,
        )
        relevance = compute_user_relevance(
            role="line_manager",
            action_type=candidate.action_type.value,
            history=None,
        )

        priority = compute_priority(urgency, impact, actionability, relevance)

        scored.append(RankedAction(
            candidate=candidate,
            urgency=round(urgency, 4),
            impact=round(impact, 4),
            actionability=round(actionability, 4),
            user_relevance=round(relevance, 4),
            priority_score=round(priority, 4),
        ))

    ranked = rank_actions(scored)
    ranked = break_ties(ranked)
    ranked = enforce_max_5(ranked)

    return ranked
