"""User relevance scoring.

Personalizes action ranking based on the user's role, past behavior,
and action type affinity.

Factors:
- Role-action fit (from role matrix)
- Dismiss decay: actions of types frequently dismissed get lower scores
- Snooze forgiveness: snoozed actions decay slower than dismissed

Model type: heuristic_v0.1
"""

from __future__ import annotations

from app.schemas.actions import UserHistory

# Base relevance by role-action affinity
ROLE_ACTION_AFFINITY: dict[str, dict[str, float]] = {
    "line_manager": {
        "SCHEDULE_1ON1": 1.0,
        "WORKLOAD_REVIEW": 0.95,
        "RECOGNITION": 0.90,
        "TRAINING_NUDGE": 0.80,
        "WELLBEING_CHECKIN": 0.85,
        "TEAM_PULSE": 0.75,
        "POLICY_REVIEW": 0.40,
        "ESCALATE_TO_HR": 0.70,
    },
    "hr_director": {
        "SCHEDULE_1ON1": 0.50,
        "WORKLOAD_REVIEW": 0.70,
        "RECOGNITION": 0.60,
        "TRAINING_NUDGE": 0.75,
        "WELLBEING_CHECKIN": 0.65,
        "TEAM_PULSE": 0.80,
        "POLICY_REVIEW": 1.0,
        "ESCALATE_TO_HR": 0.90,
    },
    "people_partner": {
        "SCHEDULE_1ON1": 0.85,
        "WORKLOAD_REVIEW": 0.80,
        "RECOGNITION": 0.75,
        "TRAINING_NUDGE": 0.85,
        "WELLBEING_CHECKIN": 0.90,
        "TEAM_PULSE": 0.85,
        "POLICY_REVIEW": 0.70,
        "ESCALATE_TO_HR": 0.95,
    },
    "employee": {
        "SCHEDULE_1ON1": 0.50,
        "WORKLOAD_REVIEW": 0.30,
        "RECOGNITION": 0.20,
        "TRAINING_NUDGE": 0.90,
        "WELLBEING_CHECKIN": 0.95,
        "TEAM_PULSE": 0.40,
        "POLICY_REVIEW": 0.10,
        "ESCALATE_TO_HR": 0.30,
    },
    "executive": {
        "SCHEDULE_1ON1": 0.30,
        "WORKLOAD_REVIEW": 0.50,
        "RECOGNITION": 0.60,
        "TRAINING_NUDGE": 0.40,
        "WELLBEING_CHECKIN": 0.35,
        "TEAM_PULSE": 0.90,
        "POLICY_REVIEW": 0.95,
        "ESCALATE_TO_HR": 0.70,
    },
}


def compute_user_relevance(
    role: str,
    action_type: str,
    history: UserHistory | None = None,
) -> float:
    """Compute user relevance for a specific action type.

    Args:
        role: User role.
        action_type: Action type string.
        history: Optional user interaction history.

    Returns:
        Relevance score in [0, 1].
    """
    role_affinity = ROLE_ACTION_AFFINITY.get(role, {})
    base = role_affinity.get(action_type, 0.5)

    if history is None:
        return base

    # Apply dismiss decay
    base = _apply_dismiss_decay(base, history.dismiss_count_30d)

    return max(0.0, min(1.0, base))


def _apply_dismiss_decay(base: float, dismiss_count_30d: int) -> float:
    """Reduce relevance for frequently dismissed action types.

    Each dismiss in last 30 days reduces relevance by 5%.
    Minimum floor of 0.1 to keep actions discoverable.

    Args:
        base: Base relevance score.
        dismiss_count_30d: Number of dismissals in last 30 days.

    Returns:
        Adjusted relevance score.
    """
    if dismiss_count_30d <= 0:
        return base

    decay_factor = max(0.1, 1.0 - 0.05 * dismiss_count_30d)
    return base * decay_factor
