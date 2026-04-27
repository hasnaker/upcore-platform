"""Integration tests for individual recommendation endpoint."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


class TestRecommendIndividual:
    def test_returns_200(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/recommend/individual",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "burnout_prediction": {"30d": 0.41, "90d": 0.58},
                "top_drivers": ["bat_exhaustion_slope_30d"],
                "max_recommendations": 5,
            },
        )
        assert response.status_code == 200

    def test_response_schema(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/recommend/individual",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "burnout_prediction": {"30d": 0.41},
                "top_drivers": [],
                "max_recommendations": 3,
            },
        )
        data = response.json()
        assert "recommendations" in data
        assert "fallback_used" in data
        assert "model_version" in data

    def test_never_returns_empty(self, client: TestClient) -> None:
        """Recommendation endpoint should NEVER return empty list."""
        response = client.post(
            "/api/v1/recommend/individual",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "burnout_prediction": {"30d": 0.05},
                "top_drivers": ["nonexistent_feature"],
                "max_recommendations": 5,
            },
        )
        data = response.json()
        assert len(data["recommendations"]) > 0

    def test_recommendation_fields(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/recommend/individual",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "burnout_prediction": {"30d": 0.55},
                "top_drivers": ["bat_exhaustion_slope_30d"],
                "max_recommendations": 1,
            },
        )
        data = response.json()
        rec = data["recommendations"][0]
        assert "intervention_id" in rec
        assert "title_tr" in rec
        assert "title_en" in rec
        assert "evidence_tier" in rec
        assert "score" in rec

    def test_max_recommendations_respected(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/recommend/individual",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "burnout_prediction": {"30d": 0.6, "90d": 0.7},
                "top_drivers": ["bat_exhaustion_slope_30d", "copsoq_workload_mean"],
                "max_recommendations": 3,
            },
        )
        data = response.json()
        assert len(data["recommendations"]) <= 3


class TestHealthEndpoints:
    def test_health(self, client: TestClient) -> None:
        response = client.get("/health")
        assert response.status_code == 200

    def test_ready(self, client: TestClient) -> None:
        response = client.get("/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "recommendation"
