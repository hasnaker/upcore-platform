"""Static role-action visibility matrix.

Defines which action types each role can see. Actions not allowed
for a role are filtered out before presentation.

Roles: hr_director, people_partner, line_manager, employee, executive
"""

from __future__ import annotations

from app.schemas.actions import ActionCandidate, ActionType

# Visibility matrix: role -> set of allowed action types
ROLE_VISIBILITY: dict[str, set[str]] = {
    "hr_director": {
        ActionType.SCHEDULE_1ON1.value,
        ActionType.WORKLOAD_REVIEW.value,
        ActionType.RECOGNITION.value,
        ActionType.TRAINING_NUDGE.value,
        ActionType.WELLBEING_CHECKIN.value,
        ActionType.TEAM_PULSE.value,
        ActionType.POLICY_REVIEW.value,
        ActionType.ESCALATE_TO_HR.value,
    },
    "people_partner": {
        ActionType.SCHEDULE_1ON1.value,
        ActionType.WORKLOAD_REVIEW.value,
        ActionType.RECOGNITION.value,
        ActionType.TRAINING_NUDGE.value,
        ActionType.WELLBEING_CHECKIN.value,
        ActionType.TEAM_PULSE.value,
        ActionType.ESCALATE_TO_HR.value,
    },
    "line_manager": {
        ActionType.SCHEDULE_1ON1.value,
        ActionType.WORKLOAD_REVIEW.value,
        ActionType.RECOGNITION.value,
        ActionType.TRAINING_NUDGE.value,
        ActionType.WELLBEING_CHECKIN.value,
        ActionType.TEAM_PULSE.value,
        ActionType.ESCALATE_TO_HR.value,
    },
    "employee": {
        ActionType.TRAINING_NUDGE.value,
        ActionType.WELLBEING_CHECKIN.value,
    },
    "executive": {
        ActionType.TEAM_PULSE.value,
        ActionType.POLICY_REVIEW.value,
        ActionType.WORKLOAD_REVIEW.value,
    },
}


def is_allowed(role: str, action_type: str) -> bool:
    """Check if a role is allowed to see an action type.

    Args:
        role: User role string.
        action_type: Action type string.

    Returns:
        True if the role can see this action type.
    """
    allowed_types = ROLE_VISIBILITY.get(role, set())
    return action_type in allowed_types


def filter_by_role(
    actions: list[ActionCandidate],
    role: str,
) -> list[ActionCandidate]:
    """Filter action candidates by role visibility.

    Args:
        actions: List of action candidates.
        role: User role.

    Returns:
        Filtered list containing only allowed action types.
    """
    allowed = ROLE_VISIBILITY.get(role, set())
    return [a for a in actions if a.action_type.value in allowed]


def get_all_roles() -> list[str]:
    """Return all defined roles."""
    return list(ROLE_VISIBILITY.keys())


def get_allowed_types(role: str) -> list[str]:
    """Return allowed action types for a role."""
    return sorted(ROLE_VISIBILITY.get(role, set()))
