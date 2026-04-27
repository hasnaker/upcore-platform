"""Unit tests for KVKK consent gating in burnout prediction.

These tests verify that ``check_ai_consent`` correctly interprets the
``app.data_consents`` row for the ``ai_recommendations`` type and that the
inference pipeline raises ``ConsentDeniedError`` when the user has opted out.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest

from app.inference import consent as consent_module
from app.inference.consent import ConsentDecision, check_ai_consent
from app.inference.predict import ConsentDeniedError, predict_burnout


@pytest.fixture
def fake_tenant() -> UUID:
    return UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")


@pytest.fixture
def fake_user() -> UUID:
    return UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")


def _make_fake_pool(row_status: str | None):
    """Build a minimal asyncpg-like pool returning a single row or None."""
    conn = MagicMock()
    conn.execute = AsyncMock()
    fetchrow = AsyncMock()
    if row_status is None:
        fetchrow.return_value = None
    else:
        # asyncpg.Record exposes __getitem__; use a dict-like mock.
        row = {"status": row_status}
        fetchrow.return_value = row
    conn.fetchrow = fetchrow

    # async context manager for pool.acquire()
    acquire_cm = MagicMock()
    acquire_cm.__aenter__ = AsyncMock(return_value=conn)
    acquire_cm.__aexit__ = AsyncMock(return_value=None)

    pool = MagicMock()
    pool.acquire = MagicMock(return_value=acquire_cm)
    return pool, conn


@pytest.mark.asyncio
async def test_check_ai_consent_default_deny_without_pool(
    monkeypatch: pytest.MonkeyPatch, fake_tenant: UUID, fake_user: UUID
) -> None:
    """When no DB pool is initialised, consent defaults to 'unknown/allowed'."""
    monkeypatch.setattr(consent_module, "get_pg_pool_or_none", lambda: None)

    decision = await check_ai_consent(tenant_id=fake_tenant, employee_id=fake_user)
    assert decision.status == "unknown"
    assert decision.allowed is True


@pytest.mark.asyncio
async def test_check_ai_consent_granted(
    monkeypatch: pytest.MonkeyPatch, fake_tenant: UUID, fake_user: UUID
) -> None:
    pool, _conn = _make_fake_pool(row_status="granted")
    monkeypatch.setattr(consent_module, "get_pg_pool_or_none", lambda: pool)

    decision = await check_ai_consent(tenant_id=fake_tenant, employee_id=fake_user)
    assert decision.allowed is True
    assert decision.status == "granted"
    assert decision.blocked_reason is None


@pytest.mark.asyncio
async def test_check_ai_consent_declined(
    monkeypatch: pytest.MonkeyPatch, fake_tenant: UUID, fake_user: UUID
) -> None:
    pool, _conn = _make_fake_pool(row_status="declined")
    monkeypatch.setattr(consent_module, "get_pg_pool_or_none", lambda: pool)

    decision = await check_ai_consent(tenant_id=fake_tenant, employee_id=fake_user)
    assert decision.allowed is False
    assert decision.status == "declined"
    assert decision.blocked_reason == "ai_recommendations_consent_declined"


@pytest.mark.asyncio
async def test_check_ai_consent_revoked(
    monkeypatch: pytest.MonkeyPatch, fake_tenant: UUID, fake_user: UUID
) -> None:
    pool, _conn = _make_fake_pool(row_status="revoked")
    monkeypatch.setattr(consent_module, "get_pg_pool_or_none", lambda: pool)

    decision = await check_ai_consent(tenant_id=fake_tenant, employee_id=fake_user)
    assert decision.allowed is False
    assert decision.status == "revoked"
    assert decision.blocked_reason == "ai_recommendations_consent_revoked"


@pytest.mark.asyncio
async def test_check_ai_consent_missing_row_defaults_deny(
    monkeypatch: pytest.MonkeyPatch, fake_tenant: UUID, fake_user: UUID
) -> None:
    """Pool exists but the user has no row → default-deny."""
    pool, _conn = _make_fake_pool(row_status=None)
    monkeypatch.setattr(consent_module, "get_pg_pool_or_none", lambda: pool)

    decision = await check_ai_consent(tenant_id=fake_tenant, employee_id=fake_user)
    assert decision.allowed is False
    assert decision.status == "unknown"


@pytest.mark.asyncio
async def test_predict_burnout_raises_consent_denied(
    monkeypatch: pytest.MonkeyPatch, fake_tenant: UUID, fake_user: UUID
) -> None:
    """predict_burnout short-circuits when consent is not granted."""

    async def fake_check(tenant_id: UUID, employee_id: UUID) -> ConsentDecision:
        return ConsentDecision(allowed=False, status="revoked")

    monkeypatch.setattr("app.inference.predict.check_ai_consent", fake_check)

    with pytest.raises(ConsentDeniedError) as exc_info:
        await predict_burnout(
            employee_id=fake_user,
            tenant_id=fake_tenant,
            horizons=[30],
        )
    assert exc_info.value.consent_status == "revoked"
    assert exc_info.value.employee_id == fake_user


@pytest.mark.asyncio
async def test_predict_burnout_runs_when_allowed(
    monkeypatch: pytest.MonkeyPatch, fake_tenant: UUID, fake_user: UUID
) -> None:
    """predict_burnout continues to inference when consent is granted."""

    async def fake_check(tenant_id: UUID, employee_id: UUID) -> ConsentDecision:
        return ConsentDecision(allowed=True, status="granted")

    monkeypatch.setattr("app.inference.predict.check_ai_consent", fake_check)

    resp = await predict_burnout(
        employee_id=fake_user,
        tenant_id=fake_tenant,
        horizons=[30],
    )
    assert resp.employee_id == fake_user
    assert "30d" in resp.predictions
