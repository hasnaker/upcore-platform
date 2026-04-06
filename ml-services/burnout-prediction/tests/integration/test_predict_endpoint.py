"""Integration tests for the burnout prediction endpoint."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


class TestPredictEndpoint:
    """Tests for POST /v1/predict/burnout."""

    def test_predict_returns_200(self, client: TestClient) -> None:
        """Valid prediction request should return 200."""
        response = client.post(
            "/v1/predict/burnout",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "horizon_days": [30, 60, 90],
            },
        )
        assert response.status_code == 200

    def test_response_schema(self, client: TestClient) -> None:
        """Response should match BurnoutPredictionResponse schema."""
        response = client.post(
            "/v1/predict/burnout",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "horizon_days": [30, 60, 90],
            },
        )
        data = response.json()
        assert "employee_id" in data
        assert "predictions" in data
        assert "top_drivers" in data
        assert "model_version" in data
        assert "model_type" in data

    def test_all_three_horizons_present(self, client: TestClient) -> None:
        """Response should contain predictions for all requested horizons."""
        response = client.post(
            "/v1/predict/burnout",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "horizon_days": [30, 60, 90],
            },
        )
        data = response.json()
        assert "30d" in data["predictions"]
        assert "60d" in data["predictions"]
        assert "90d" in data["predictions"]

    def test_horizon_prediction_fields(self, client: TestClient) -> None:
        """Each horizon prediction should have probability, CI, and classification."""
        response = client.post(
            "/v1/predict/burnout",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "horizon_days": [30],
            },
        )
        data = response.json()
        pred = data["predictions"]["30d"]
        assert "probability" in pred
        assert "ci_lower" in pred
        assert "ci_upper" in pred
        assert "classification" in pred
        assert pred["classification"] in ["GREEN", "AMBER", "RED"]

    def test_ci_ordering(self, client: TestClient) -> None:
        """CI lower should be <= probability <= CI upper."""
        response = client.post(
            "/v1/predict/burnout",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "horizon_days": [30, 60, 90],
            },
        )
        data = response.json()
        for horizon_key in ["30d", "60d", "90d"]:
            pred = data["predictions"][horizon_key]
            assert pred["ci_lower"] <= pred["probability"]
            assert pred["probability"] <= pred["ci_upper"]

    def test_probabilities_bounded(self, client: TestClient) -> None:
        """All probabilities should be in [0, 1]."""
        response = client.post(
            "/v1/predict/burnout",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "horizon_days": [30, 60, 90],
            },
        )
        data = response.json()
        for horizon_key in ["30d", "60d", "90d"]:
            pred = data["predictions"][horizon_key]
            assert 0.0 <= pred["probability"] <= 1.0
            assert 0.0 <= pred["ci_lower"] <= 1.0
            assert 0.0 <= pred["ci_upper"] <= 1.0

    def test_top_drivers_present(self, client: TestClient) -> None:
        """Response should include top drivers."""
        response = client.post(
            "/v1/predict/burnout",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "horizon_days": [30],
            },
        )
        data = response.json()
        assert len(data["top_drivers"]) > 0
        driver = data["top_drivers"][0]
        assert "feature" in driver
        assert "direction" in driver

    def test_model_type_is_heuristic(self, client: TestClient) -> None:
        """V1 should report heuristic model type."""
        response = client.post(
            "/v1/predict/burnout",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "horizon_days": [30],
            },
        )
        data = response.json()
        assert data["model_type"] == "heuristic_v0.1"

    def test_invalid_horizon_rejected(self, client: TestClient) -> None:
        """Invalid horizon values should be rejected with 422."""
        response = client.post(
            "/v1/predict/burnout",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "horizon_days": [30, 45],
            },
        )
        assert response.status_code == 422

    def test_with_signal_window(self, client: TestClient) -> None:
        """Prediction with signal window should work."""
        response = client.post(
            "/v1/predict/burnout",
            json={
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "employee_id": "22222222-2222-2222-2222-222222222222",
                "horizon_days": [30],
                "signal_window": [
                    {"date": "2025-10-01", "features": {"bat_exhaustion": 3.5}},
                    {"date": "2025-10-15", "features": {"bat_exhaustion": 3.8}},
                ],
            },
        )
        assert response.status_code == 200


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_health_returns_200(self, client: TestClient) -> None:
        """Health endpoint should return 200."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "degraded", "unhealthy"]

    def test_ready_returns_service_info(self, client: TestClient) -> None:
        """Readiness probe should include service info."""
        response = client.get("/ready")
        data = response.json()
        assert data["service"] == "burnout-prediction"
        assert "model_type" in data
