"""Integration tests for BAT-12-TR scoring endpoint.

End-to-end HTTP tests verifying full response schema.
"""

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


class TestBATEndpoint:
    """Test POST /v1/score/bat12."""

    @pytest.mark.asyncio
    async def test_full_response(self, client: AsyncClient) -> None:
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "responses": {f"bat_{i:02d}": 3 for i in range(1, 13)},
        }
        resp = await client.post("/v1/score/bat12", json=payload)
        assert resp.status_code == 200

        data = resp.json()
        assert "subscales" in data
        assert "total_score" in data
        assert "classifications" in data
        assert "percentiles" in data
        assert "reliability" in data
        assert "metadata" in data

        assert data["subscales"]["exhaustion"] == pytest.approx(3.0, abs=1e-4)
        assert data["total_score"] == pytest.approx(3.0, abs=1e-4)

    @pytest.mark.asyncio
    async def test_all_min_green(self, client: AsyncClient) -> None:
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "responses": {f"bat_{i:02d}": 1 for i in range(1, 13)},
        }
        resp = await client.post("/v1/score/bat12", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["classifications"]["total"] == "GREEN"

    @pytest.mark.asyncio
    async def test_all_max_red(self, client: AsyncClient) -> None:
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "responses": {f"bat_{i:02d}": 5 for i in range(1, 13)},
        }
        resp = await client.post("/v1/score/bat12", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["classifications"]["total"] == "RED"

    @pytest.mark.asyncio
    async def test_missing_items_imputed(self, client: AsyncClient) -> None:
        responses = {f"bat_{i:02d}": 3 for i in range(1, 13)}
        del responses["bat_01"]
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "responses": responses,
        }
        resp = await client.post("/v1/score/bat12", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "bat_01" in data["imputed_items"]

    @pytest.mark.asyncio
    async def test_too_many_missing_422(self, client: AsyncClient) -> None:
        responses = {f"bat_{i:02d}": 3 for i in range(4, 13)}  # only 9 items
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "responses": responses,
        }
        resp = await client.post("/v1/score/bat12", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_value_422(self, client: AsyncClient) -> None:
        responses = {f"bat_{i:02d}": 3 for i in range(1, 13)}
        responses["bat_01"] = 6  # out of range
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "responses": responses,
        }
        resp = await client.post("/v1/score/bat12", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_norm_version_in_metadata(self, client: AsyncClient) -> None:
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "responses": {f"bat_{i:02d}": 3 for i in range(1, 13)},
        }
        resp = await client.post("/v1/score/bat12", json=payload)
        data = resp.json()
        assert data["metadata"]["norm_version"] == "bat12-tr-provisional-v0.1"
