"""Integration tests for UpCap-TR v1.0 endpoints.

POST /api/v1/score/upcap-tr
GET  /api/v1/score/upcap-tr/norms
POST /api/v1/research/upcap-pilot
"""

from __future__ import annotations

import uuid
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app
from app.research import pilot_store


@pytest.fixture
async def client() -> AsyncClient:
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
def _reset_pilot_store() -> None:
    pilot_store.reset_memory_store()


def _responses_all(v: int) -> dict[str, int]:
    return {f"upcap_{i:02d}": v for i in range(1, 13)}


class TestScoreUpcapTR:
    @pytest.mark.asyncio
    async def test_full_response_shape(self, client: AsyncClient) -> None:
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "responses": _responses_all(5),
        }
        resp = await client.post("/api/v1/score/upcap-tr", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["scale_code"] == "upcap_tr"
        assert data["scale_version"] == "1.0"
        assert "composite_score" in data
        assert set(data["factors"].keys()) == {"hope_optimism", "resilience", "self_efficacy"}
        assert 0.0 <= data["percentile"] <= 100.0
        assert 0.0 <= data["t_score"] <= 120.0
        assert isinstance(data["validated"], bool)
        assert "disclaimer" in data

    @pytest.mark.asyncio
    async def test_sector_comparison_block(self, client: AsyncClient) -> None:
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "responses": _responses_all(5),
            "sector": "holding",
        }
        resp = await client.post("/api/v1/score/upcap-tr", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["sector_comparison"] is not None
        assert data["sector_comparison"]["sector"] == "holding"

    @pytest.mark.asyncio
    async def test_rejects_missing_items(self, client: AsyncClient) -> None:
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "responses": {f"upcap_{i:02d}": 4 for i in range(1, 12)},  # 11 items
        }
        resp = await client.post("/api/v1/score/upcap-tr", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_rejects_out_of_range(self, client: AsyncClient) -> None:
        r = _responses_all(4)
        r["upcap_01"] = 7
        payload = {
            "tenant_id": str(uuid4()),
            "employee_id": str(uuid4()),
            "assessment_id": str(uuid4()),
            "responses": r,
        }
        resp = await client.post("/api/v1/score/upcap-tr", json=payload)
        assert resp.status_code == 422


class TestNormsEndpoint:
    @pytest.mark.asyncio
    async def test_returns_norm_bundle(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/score/upcap-tr/norms")
        assert resp.status_code == 200
        data = resp.json()
        assert data["scale_code"] == "upcap_tr"
        assert "overall" in data
        assert "sectors" in data
        assert "age_bands" in data
        # Sectors include 5 Türkiye segments
        assert set(data["sectors"].keys()) >= {
            "public_sector", "holding", "sme", "health", "education",
        }
        assert "disclaimer" in data


class TestPilotEndpoint:
    @pytest.mark.asyncio
    async def test_accepts_consented_submission(self, client: AsyncClient) -> None:
        payload = {
            "participant_token": str(uuid.uuid4()),
            "consent": {
                "consent_given": True,
                "consent_version": "aydinlatilmis_onam_v1.0",
                "ethics_board": "X Üniversitesi İnsan Araştırmaları Etik Kurulu",
                "ethics_protocol": "2026/04-123",
                "locale": "tr-TR",
            },
            "responses": _responses_all(4),
            "wave": 1,
            "sector": "public_sector",
            "age_band": "31_45",
            "gender": "prefer_not",
            "tenure_years": 5,
        }
        resp = await client.post("/api/v1/research/upcap-pilot", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["accepted"] is True
        assert data["wave"] == 1
        assert data["consent_id"]
        assert data["response_id"]

        # In-memory store captured the submission
        snap = pilot_store.get_memory_store_snapshot()
        assert len(snap["responses"]) == 1
        assert len(snap["consents"]) == 1

    @pytest.mark.asyncio
    async def test_rejects_no_consent(self, client: AsyncClient) -> None:
        payload = {
            "participant_token": str(uuid.uuid4()),
            "consent": {
                "consent_given": False,
                "consent_version": "aydinlatilmis_onam_v1.0",
                "locale": "tr-TR",
            },
            "responses": _responses_all(4),
        }
        resp = await client.post("/api/v1/research/upcap-pilot", json=payload)
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_rejects_invalid_responses(self, client: AsyncClient) -> None:
        r = _responses_all(4)
        r["upcap_01"] = 99  # out of range
        payload = {
            "participant_token": str(uuid.uuid4()),
            "consent": {
                "consent_given": True,
                "consent_version": "aydinlatilmis_onam_v1.0",
                "locale": "tr-TR",
            },
            "responses": r,
        }
        resp = await client.post("/api/v1/research/upcap-pilot", json=payload)
        assert resp.status_code == 422
