"""Shared test fixtures for action center service."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def next_actions_request() -> dict:
    return {
        "tenant_id": "11111111-1111-1111-1111-111111111111",
        "user_id": "22222222-2222-2222-2222-222222222222",
        "role": "line_manager",
        "scope": {"team_id": "33333333-3333-3333-3333-333333333333"},
        "language": "tr-TR",
    }
