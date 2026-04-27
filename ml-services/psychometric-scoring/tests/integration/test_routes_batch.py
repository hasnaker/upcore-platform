"""Integration tests for batch scoring endpoint."""

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


class TestBatchEndpoint:
    """Test POST /v1/score/batch."""

    @pytest.mark.asyncio
    async def test_single_bat_in_batch(self, client: AsyncClient) -> None:
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "assessments": [
                {
                    "instrument": "bat12",
                    "payload": {
                        "responses": {f"bat_{i:02d}": 3 for i in range(1, 13)},
                    },
                },
            ],
        }
        resp = await client.post("/api/v1/score/batch", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["succeeded"] == 1
        assert data["failed"] == 0

    @pytest.mark.asyncio
    async def test_mixed_instruments(self, client: AsyncClient) -> None:
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "assessments": [
                {
                    "instrument": "bat12",
                    "payload": {
                        "responses": {f"bat_{i:02d}": 3 for i in range(1, 13)},
                    },
                },
                {
                    "instrument": "jdr",
                    "payload": {
                        "demands_z": 1.0,
                        "resources_z": 0.5,
                    },
                },
            ],
        }
        resp = await client.post("/api/v1/score/batch", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        assert data["succeeded"] == 2

    @pytest.mark.asyncio
    async def test_partial_failure(self, client: AsyncClient) -> None:
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "assessments": [
                {
                    "instrument": "bat12",
                    "payload": {
                        "responses": {f"bat_{i:02d}": 3 for i in range(1, 13)},
                    },
                },
                {
                    "instrument": "bat12",
                    "payload": {
                        "responses": {},  # empty => will fail
                    },
                },
            ],
        }
        resp = await client.post("/api/v1/score/batch", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        assert data["succeeded"] == 1
        assert data["failed"] == 1
        assert data["results"][1]["success"] is False
        assert data["results"][1]["error"] is not None
