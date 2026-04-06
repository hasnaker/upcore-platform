"""Shared test fixtures for burnout prediction service."""

from __future__ import annotations

from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def tenant_id() -> UUID:
    """Sample tenant UUID."""
    return UUID("11111111-1111-1111-1111-111111111111")


@pytest.fixture
def employee_id() -> UUID:
    """Sample employee UUID."""
    return UUID("22222222-2222-2222-2222-222222222222")


@pytest.fixture
def sample_features() -> dict[str, float]:
    """Sample feature vector with realistic values for a medium-risk employee."""
    return {
        "bat_exhaustion_mean": 3.2,
        "bat_exhaustion_slope_30d": 0.4,
        "bat_exhaustion_volatility": 0.3,
        "bat_distance_mean": 2.8,
        "bat_distance_slope_30d": 0.1,
        "bat_cognitive_mean": 2.5,
        "bat_emotional_mean": 3.0,
        "bat_composite": 2.88,
        "copsoq_workload_mean": 65.0,
        "copsoq_workload_slope_30d": 5.0,
        "copsoq_autonomy_mean": 40.0,
        "copsoq_social_support": 45.0,
        "copsoq_recognition": 35.0,
        "jdr_balance_ratio": 0.7,
        "jdr_demands_total": 70.0,
        "jdr_resources_total": 49.0,
        "engagement_score": 0.4,
        "engagement_trend_30d": -0.1,
        "absence_days_30d": 3,
        "absence_days_90d": 8,
        "overtime_hours_30d": 25.0,
        "overtime_ratio": 0.16,
        "meeting_load_hours_week": 18.0,
        "after_hours_activity": 0.3,
        "manager_1on1_days_since": 28,
        "peer_interaction_count": 15,
        "recognition_events_30d": 0,
        "role_change_flag": 0,
        "tenure_months": 24,
        "team_size": 10,
        "span_of_control": 0,
        "survey_response_latency": 48.0,
        "survey_completion_rate": 0.6,
        "psycap_composite": 0.4,
        "psycap_efficacy": 0.45,
        "psycap_resilience": 0.35,
        "psycap_hope": 0.4,
        "psycap_optimism": 0.4,
        "leave_balance_ratio": 0.3,
        "training_hours_30d": 0.0,
        "negative_events_90d": 2,
        "positive_events_90d": 0,
    }


@pytest.fixture
def low_risk_features() -> dict[str, float]:
    """Feature vector for a low-risk employee."""
    return {
        "bat_exhaustion_mean": 1.5,
        "bat_exhaustion_slope_30d": -0.1,
        "bat_exhaustion_volatility": 0.1,
        "bat_distance_mean": 1.3,
        "bat_distance_slope_30d": 0.0,
        "bat_cognitive_mean": 1.4,
        "bat_emotional_mean": 1.2,
        "bat_composite": 1.35,
        "copsoq_workload_mean": 35.0,
        "copsoq_workload_slope_30d": -2.0,
        "copsoq_autonomy_mean": 70.0,
        "copsoq_social_support": 75.0,
        "copsoq_recognition": 70.0,
        "jdr_balance_ratio": 1.8,
        "jdr_demands_total": 35.0,
        "jdr_resources_total": 63.0,
        "engagement_score": 0.85,
        "engagement_trend_30d": 0.05,
        "absence_days_30d": 0,
        "absence_days_90d": 1,
        "overtime_hours_30d": 2.0,
        "overtime_ratio": 0.01,
        "meeting_load_hours_week": 8.0,
        "after_hours_activity": 0.02,
        "manager_1on1_days_since": 5,
        "peer_interaction_count": 40,
        "recognition_events_30d": 3,
        "role_change_flag": 0,
        "tenure_months": 36,
        "team_size": 6,
        "span_of_control": 0,
        "survey_response_latency": 4.0,
        "survey_completion_rate": 1.0,
        "psycap_composite": 0.8,
        "psycap_efficacy": 0.85,
        "psycap_resilience": 0.8,
        "psycap_hope": 0.75,
        "psycap_optimism": 0.8,
        "leave_balance_ratio": 1.5,
        "training_hours_30d": 8.0,
        "negative_events_90d": 0,
        "positive_events_90d": 4,
    }


@pytest.fixture
def high_risk_features() -> dict[str, float]:
    """Feature vector for a high-risk employee."""
    return {
        "bat_exhaustion_mean": 4.2,
        "bat_exhaustion_slope_30d": 0.8,
        "bat_exhaustion_volatility": 0.6,
        "bat_distance_mean": 4.0,
        "bat_distance_slope_30d": 0.5,
        "bat_cognitive_mean": 3.8,
        "bat_emotional_mean": 4.1,
        "bat_composite": 4.03,
        "copsoq_workload_mean": 85.0,
        "copsoq_workload_slope_30d": 10.0,
        "copsoq_autonomy_mean": 20.0,
        "copsoq_social_support": 25.0,
        "copsoq_recognition": 15.0,
        "jdr_balance_ratio": 0.3,
        "jdr_demands_total": 90.0,
        "jdr_resources_total": 27.0,
        "engagement_score": 0.15,
        "engagement_trend_30d": -0.2,
        "absence_days_30d": 7,
        "absence_days_90d": 18,
        "overtime_hours_30d": 60.0,
        "overtime_ratio": 0.38,
        "meeting_load_hours_week": 30.0,
        "after_hours_activity": 0.6,
        "manager_1on1_days_since": 60,
        "peer_interaction_count": 5,
        "recognition_events_30d": 0,
        "role_change_flag": 1,
        "tenure_months": 8,
        "team_size": 15,
        "span_of_control": 0,
        "survey_response_latency": 96.0,
        "survey_completion_rate": 0.3,
        "psycap_composite": 0.2,
        "psycap_efficacy": 0.2,
        "psycap_resilience": 0.15,
        "psycap_hope": 0.2,
        "psycap_optimism": 0.25,
        "leave_balance_ratio": 0.1,
        "training_hours_30d": 0.0,
        "negative_events_90d": 5,
        "positive_events_90d": 0,
    }
