"""Tests for role-action visibility matrix."""

from __future__ import annotations

from uuid import uuid4


from app.filtering.role_matrix import (
    filter_by_role,
    get_all_roles,
    get_allowed_types,
    is_allowed,
)
from app.schemas.actions import ActionCandidate, ActionType


class TestIsAllowed:
    def test_line_manager_can_see_1on1(self) -> None:
        assert is_allowed("line_manager", "SCHEDULE_1ON1") is True

    def test_employee_cannot_see_policy_review(self) -> None:
        assert is_allowed("employee", "POLICY_REVIEW") is False

    def test_employee_can_see_wellbeing(self) -> None:
        assert is_allowed("employee", "WELLBEING_CHECKIN") is True

    def test_hr_director_sees_all(self) -> None:
        """HR director should have access to all action types."""
        for action_type in ActionType:
            assert is_allowed("hr_director", action_type.value) is True

    def test_unknown_role_sees_nothing(self) -> None:
        """Unknown role should have no access."""
        assert is_allowed("unknown_role", "SCHEDULE_1ON1") is False

    def test_employee_cannot_see_hr_only_actions(self) -> None:
        """Employee should not see HR-specific actions."""
        assert is_allowed("employee", "POLICY_REVIEW") is False
        assert is_allowed("employee", "ESCALATE_TO_HR") is False
        assert is_allowed("employee", "WORKLOAD_REVIEW") is False


class TestFilterByRole:
    def test_filters_correctly(self) -> None:
        """Should filter out disallowed action types."""
        candidates = [
            ActionCandidate(
                action_type=ActionType.SCHEDULE_1ON1,
                target_id=uuid4(),
                target_name_masked="X. X.",
                title_tr="Test",
                title_en="Test",
                severity_band="AMBER",
            ),
            ActionCandidate(
                action_type=ActionType.POLICY_REVIEW,
                target_id=uuid4(),
                target_name_masked="X. X.",
                title_tr="Test",
                title_en="Test",
                severity_band="AMBER",
            ),
        ]
        # Employee cannot see POLICY_REVIEW
        filtered = filter_by_role(candidates, "employee")
        types = [c.action_type.value for c in filtered]
        assert "POLICY_REVIEW" not in types


class TestGetAllRoles:
    def test_returns_five_roles(self) -> None:
        roles = get_all_roles()
        assert len(roles) == 5
        assert "hr_director" in roles
        assert "employee" in roles


class TestGetAllowedTypes:
    def test_employee_has_limited_types(self) -> None:
        allowed = get_allowed_types("employee")
        assert len(allowed) == 2  # TRAINING_NUDGE, WELLBEING_CHECKIN
