"""Shared pytest fixtures for psychometric scoring tests."""

from __future__ import annotations

import json
from pathlib import Path
from typing import AsyncIterator
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def tenant_id() -> str:
    return str(uuid4())


@pytest.fixture
def employee_id() -> str:
    return str(uuid4())


@pytest.fixture
def assessment_id() -> str:
    return str(uuid4())


@pytest.fixture
def bat_all_mid() -> dict[str, int]:
    """BAT-12 responses: all items scored 3 (middle of scale)."""
    return {f"bat_{i:02d}": 3 for i in range(1, 13)}


@pytest.fixture
def bat_all_max() -> dict[str, int]:
    """BAT-12 responses: all items scored 5 (maximum burnout)."""
    return {f"bat_{i:02d}": 5 for i in range(1, 13)}


@pytest.fixture
def bat_all_min() -> dict[str, int]:
    """BAT-12 responses: all items scored 1 (no burnout)."""
    return {f"bat_{i:02d}": 1 for i in range(1, 13)}


@pytest.fixture
def upcap_all_mid() -> dict[str, int]:
    """UpCap-TR responses: all items scored 4 (above midpoint on 1-6)."""
    return {f"upcap_{i:02d}": 4 for i in range(1, 13)}


@pytest.fixture
def copsoq_all_mid() -> dict[str, int]:
    """COPSOQ responses: all 40 items scored 3."""
    return {f"copsoq_{i:02d}": 3 for i in range(1, 41)}


@pytest.fixture
def strengths_all_mid() -> dict[str, int]:
    """Strengths responses: all 24 items scored 3."""
    return {f"str_{i:02d}": 3 for i in range(1, 25)}


@pytest.fixture
def bat_fixture_responses() -> dict[str, object]:
    """Load BAT responses fixture from JSON."""
    path = FIXTURES_DIR / "bat_responses.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {}


@pytest.fixture
def jdr_fixture_responses() -> dict[str, object]:
    """Load JD-R responses fixture from JSON."""
    path = FIXTURES_DIR / "jdr_responses.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {}


@pytest.fixture
def upcap_fixture_responses() -> dict[str, object]:
    """Load UpCap responses fixture from JSON."""
    path = FIXTURES_DIR / "upcap_responses.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {}


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """Create an async test client for the FastAPI app."""
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
