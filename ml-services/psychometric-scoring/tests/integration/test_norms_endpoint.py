"""Integration tests for norms, model card, and health endpoints."""

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


class TestHealthEndpoints:
    """Test liveness and readiness probes."""

    @pytest.mark.asyncio
    async def test_health(self, client: AsyncClient) -> None:
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_ready(self, client: AsyncClient) -> None:
        resp = await client.get("/ready")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "checks" in data


class TestModelCardEndpoint:
    """Test GET /v1/model-card/{instrument}."""

    @pytest.mark.asyncio
    async def test_bat_model_card(self, client: AsyncClient) -> None:
        resp = await client.get("/v1/model-card/bat")
        assert resp.status_code == 200
        data = resp.json()
        assert "card" in data
        card = data["card"]
        assert card["instrument"] == "BAT-12-TR"
        assert len(card["citations"]) > 0
        assert card["turkish_validation_status"] is not None

    @pytest.mark.asyncio
    async def test_jdr_model_card(self, client: AsyncClient) -> None:
        resp = await client.get("/v1/model-card/jdr")
        assert resp.status_code == 200
        data = resp.json()
        assert data["card"]["instrument"] == "JD-R-v0.1"

    @pytest.mark.asyncio
    async def test_upcap_model_card(self, client: AsyncClient) -> None:
        resp = await client.get("/v1/model-card/upcap")
        assert resp.status_code == 200
        data = resp.json()
        assert data["card"]["instrument"] == "UpCap-TR"

    @pytest.mark.asyncio
    async def test_copsoq_model_card(self, client: AsyncClient) -> None:
        resp = await client.get("/v1/model-card/copsoq")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_strengths_model_card(self, client: AsyncClient) -> None:
        resp = await client.get("/v1/model-card/strengths")
        assert resp.status_code == 200
        data = resp.json()
        assert data["card"]["instrument"] == "Strengths-TR"

    @pytest.mark.asyncio
    async def test_unknown_instrument_404(self, client: AsyncClient) -> None:
        resp = await client.get("/v1/model-card/unknown_instrument")
        assert resp.status_code == 404


class TestReliabilityEndpoint:
    """Test GET /v1/reliability/{tenant_id}/{instrument}."""

    @pytest.mark.asyncio
    async def test_returns_placeholder(self, client: AsyncClient) -> None:
        tid = str(uuid4())
        resp = await client.get(f"/v1/reliability/{tid}/bat")
        assert resp.status_code == 200
        data = resp.json()
        assert data["tenant_id"] == tid
        assert data["instrument"] == "bat"
        assert data["period_days"] == 90
