"""Integration tests for the next actions endpoint."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


class TestNextActionsEndpoint:
    """Tests for POST /v1/actions/next."""

    def test_returns_200(self, client: TestClient) -> None:
        """Valid request should return 200."""
        response = client.post(
            "/v1/actions/next",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "user_id": "22222222-2222-2222-2222-222222222222",
                "role": "line_manager",
                "scope": {},
                "language": "tr-TR",
            },
        )
        assert response.status_code == 200

    def test_max_5_actions_enforced(self, client: TestClient) -> None:
        """Response should never contain more than 5 actions."""
        response = client.post(
            "/v1/actions/next",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "user_id": "22222222-2222-2222-2222-222222222222",
                "role": "line_manager",
                "scope": {},
            },
        )
        data = response.json()
        assert len(data["actions"]) <= 5

    def test_response_schema(self, client: TestClient) -> None:
        """Response should match NextActionsResponse schema."""
        response = client.post(
            "/v1/actions/next",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "user_id": "22222222-2222-2222-2222-222222222222",
                "role": "line_manager",
                "scope": {},
            },
        )
        data = response.json()
        assert "actions" in data
        assert "cached" in data
        assert "generated_at" in data
        assert "ttl_seconds" in data

    def test_action_fields(self, client: TestClient) -> None:
        """Each action should have all required fields."""
        response = client.post(
            "/v1/actions/next",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "user_id": "22222222-2222-2222-2222-222222222222",
                "role": "line_manager",
                "scope": {},
            },
        )
        data = response.json()
        if data["actions"]:
            action = data["actions"][0]
            assert "action_id" in action
            assert "type" in action
            assert "target" in action
            assert "priority_score" in action
            assert "urgency" in action
            assert "impact" in action
            assert "actionability" in action
            assert "user_relevance" in action
            assert "title_tr" in action
            assert "rationale_tr" in action
            assert "cta" in action

    def test_priority_scores_bounded(self, client: TestClient) -> None:
        """All priority scores should be in [0, 1]."""
        response = client.post(
            "/v1/actions/next",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "user_id": "22222222-2222-2222-2222-222222222222",
                "role": "line_manager",
                "scope": {},
            },
        )
        data = response.json()
        for action in data["actions"]:
            assert 0.0 <= action["priority_score"] <= 1.0
            assert 0.0 <= action["urgency"] <= 1.0
            assert 0.0 <= action["impact"] <= 1.0
            assert 0.0 <= action["actionability"] <= 1.0

    def test_sorted_by_priority(self, client: TestClient) -> None:
        """Actions should be sorted by priority score descending."""
        response = client.post(
            "/v1/actions/next",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "user_id": "22222222-2222-2222-2222-222222222222",
                "role": "line_manager",
                "scope": {},
            },
        )
        data = response.json()
        scores = [a["priority_score"] for a in data["actions"]]
        # Allow equal scores (tie-breaking may reorder)
        for i in range(1, len(scores)):
            assert scores[i] <= scores[i - 1] or scores[i] == scores[i - 1]

    def test_rationale_not_empty(self, client: TestClient) -> None:
        """Every action should have a non-empty rationale."""
        response = client.post(
            "/v1/actions/next",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "user_id": "22222222-2222-2222-2222-222222222222",
                "role": "line_manager",
                "scope": {},
            },
        )
        data = response.json()
        for action in data["actions"]:
            assert len(action["rationale_tr"]) > 0

    def test_employee_role_filtering(self, client: TestClient) -> None:
        """Employee role should only see employee-visible actions."""
        response = client.post(
            "/v1/actions/next",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "user_id": "22222222-2222-2222-2222-222222222222",
                "role": "employee",
                "scope": {},
            },
        )
        data = response.json()
        allowed_types = {"TRAINING_NUDGE", "WELLBEING_CHECKIN"}
        for action in data["actions"]:
            assert action["type"] in allowed_types

    def test_ttl_is_1800(self, client: TestClient) -> None:
        """TTL should be 30 minutes (1800 seconds)."""
        response = client.post(
            "/v1/actions/next",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "user_id": "22222222-2222-2222-2222-222222222222",
                "role": "line_manager",
                "scope": {},
            },
        )
        data = response.json()
        assert data["ttl_seconds"] == 1800


class TestHealthEndpoints:
    def test_health(self, client: TestClient) -> None:
        response = client.get("/health")
        assert response.status_code == 200

    def test_ready(self, client: TestClient) -> None:
        response = client.get("/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "action-center"
