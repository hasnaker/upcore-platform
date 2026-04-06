"""Data-scope visibility enforcement.

Ensures users can only see actions for employees they have
access to (RLS-style predicate).
"""

from __future__ import annotations

from uuid import UUID

import structlog

logger = structlog.get_logger()


async def visible_employee_ids(
    user_id: UUID,
    role: str,
    tenant_id: UUID,
    scope: dict | None = None,
) -> set[UUID]:
    """Determine which employee IDs this user can see.

    For V1: returns all employees in scope (no RLS enforcement yet).
    Production will query org structure for team membership.

    Args:
        user_id: Requesting user ID.
        role: User role.
        tenant_id: Tenant ID.
        scope: Optional scope with team_id or department_id.

    Returns:
        Set of visible employee UUIDs.
    """
    # For V1: return empty set (all actions will be visible)
    # Production: query org hierarchy based on role
    if role == "hr_director":
        # HR director sees all employees in tenant
        return set()  # Empty means "all" in V1 logic

    if role == "executive":
        return set()  # Sees aggregated data

    if role == "line_manager" and scope:
        # Line manager sees direct reports
        team_id = scope.get("team_id")
        if team_id:
            # Production: SELECT employee_id FROM team_members WHERE team_id = $1
            return set()

    if role == "employee":
        # Employee only sees own data
        return {user_id}

    return set()


def filter_by_visibility(
    actions: list,
    visible_ids: set[UUID],
) -> list:
    """Filter actions to only include visible targets.

    Args:
        actions: List of action candidates/ranked actions.
        visible_ids: Set of visible employee UUIDs.

    Returns:
        Filtered action list.
    """
    if not visible_ids:
        # Empty set means "all visible" in V1
        return actions

    return [
        a for a in actions
        if getattr(a, "target_id", None) in visible_ids
        or (hasattr(a, "candidate") and getattr(a.candidate, "target_id", None) in visible_ids)
    ]
