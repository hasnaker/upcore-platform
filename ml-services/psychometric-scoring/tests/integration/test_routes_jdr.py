"""Integration tests for JD-R scoring endpoint."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app


@pytest.fixture
async def client() -> AsyncClient:
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestJDREndpoint:
    """Test POST /v1/score/jdr."""

    @pytest.mark.asyncio
    async def test_full_response(self, client: AsyncClient) -> None:
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "demands_z": 1.0,
            "resources_z": 0.5,
            "personal_resources_z": 0.3,
        }
        resp = await client.post("/v1/score/jdr", json=payload)
        assert resp.status_code == 200

        data = resp.json()
        assert "burnout_probability" in data
        assert "balance_index" in data
        assert "engagement_score" in data
        assert "strain_score" in data
        assert "interaction_effect" in data
        assert "coefficients" in data
        assert "metadata" in data

    @pytest.mark.asyncio
    async def test_neutral_inputs(self, client: AsyncClient) -> None:
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "demands_z": 0.0,
            "resources_z": 0.0,
        }
        resp = await client.post("/v1/score/jdr", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["burnout_probability"] == pytest.approx(0.5, abs=1e-4)
        assert data["balance_index"] == pytest.approx(0.0, abs=1e-4)

    @pytest.mark.asyncio
    async def test_heuristic_flag(self, client: AsyncClient) -> None:
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "demands_z": 1.0,
            "resources_z": 1.0,
        }
        resp = await client.post("/v1/score/jdr", json=payload)
        data = resp.json()
        assert data["calibration_status"] == "heuristic_v0.1"
        assert data["metadata"]["confidence"] == "heuristic"

    @pytest.mark.asyncio
    async def test_out_of_range_422(self, client: AsyncClient) -> None:
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "demands_z": 10.0,  # exceeds ge=-5, le=5
            "resources_z": 0.0,
        }
        resp = await client.post("/v1/score/jdr", json=payload)
        assert resp.status_code == 422
