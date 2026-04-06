"""Shared test fixtures for recommendation service."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def individual_request() -> dict:
    return {
        "tenant_id": "11111111-1111-1111-1111-111111111111",
        "employee_id": "22222222-2222-2222-2222-222222222222",
        "burnout_prediction": {"30d": 0.41, "90d": 0.58},
        "top_drivers": ["bat_exhaustion_slope_30d", "copsoq_workload_mean"],
        "context": {
            "role": "line_manager",
            "tenure_months": 18,
            "language": "tr-TR",
        },
        "max_recommendations": 5,
    }


@pytest.fixture
def team_request() -> dict:
    return {
        "tenant_id": "11111111-1111-1111-1111-111111111111",
        "team_id": "33333333-3333-3333-3333-333333333333",
        "team_burnout_summary": {"mean_risk": 0.35},
        "max_recommendations": 5,
    }
