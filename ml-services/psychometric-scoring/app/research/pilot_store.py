"""Pilot data store — persists anonymous pilot submissions.

Prefers the configured Postgres pool (app.upcap_pilot_* tables, migration 056).
Falls back to an in-memory store when DB is disabled (tests, dev).

All data is anonymous. No tenant_id, no employee_id, no PII.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import structlog

from app.storage import pg_client

logger = structlog.get_logger(__name__)

_SALT = "upcap-tr-pilot-v1"  # Rotated per-deploy in prod via env


def _hash_pii(value: str | None) -> str | None:
    """One-way SHA-256 for IP / UA audit trail."""
    if not value:
        return None
    return hashlib.sha256(f"{_SALT}::{value}".encode()).hexdigest()


@dataclass
class InMemoryPilotStore:
    """Fallback in-memory store for tests and DB-off environments."""

    consents: dict[str, dict[str, Any]] = field(default_factory=dict)
    responses: dict[str, dict[str, Any]] = field(default_factory=dict)

    def insert_consent(
        self,
        participant_token: str,
        consent_given: bool,
        consent_version: str,
        ethics_board: str | None,
        ethics_protocol: str | None,
        ip_hash: str | None,
        user_agent_hash: str | None,
        locale: str,
    ) -> str:
        consent_id = str(uuid.uuid4())
        self.consents[consent_id] = {
            "id": consent_id,
            "participant_token": participant_token,
            "consent_given": consent_given,
            "consent_version": consent_version,
            "ethics_board": ethics_board,
            "ethics_protocol": ethics_protocol,
            "ip_hash": ip_hash,
            "user_agent_hash": user_agent_hash,
            "locale": locale,
            "created_at": datetime.now(UTC).isoformat(),
        }
        return consent_id

    def insert_response(
        self,
        consent_id: str,
        scale_id: str,
        wave: int,
        responses: dict[str, int],
        sector: str | None,
        age_band: str | None,
        gender: str | None,
        tenure_years: int | None,
        convergent_bat12: dict[str, int] | None,
        convergent_uwes9: dict[str, int] | None,
    ) -> str:
        response_id = str(uuid.uuid4())
        self.responses[response_id] = {
            "id": response_id,
            "consent_id": consent_id,
            "scale_id": scale_id,
            "wave": wave,
            "responses": responses,
            "sector": sector,
            "age_band": age_band,
            "gender": gender,
            "tenure_years": tenure_years,
            "convergent_bat12": convergent_bat12,
            "convergent_uwes9": convergent_uwes9,
            "submitted_at": datetime.now(UTC).isoformat(),
        }
        return response_id


_memory_store = InMemoryPilotStore()


async def persist_pilot_submission(
    *,
    participant_token: str,
    consent_given: bool,
    consent_version: str,
    ethics_board: str | None,
    ethics_protocol: str | None,
    locale: str,
    ip_raw: str | None,
    user_agent_raw: str | None,
    scale_code: str,
    scale_version: str,
    wave: int,
    responses: dict[str, int],
    sector: str | None,
    age_band: str | None,
    gender: str | None,
    tenure_years: int | None,
    convergent_bat12: dict[str, int] | None,
    convergent_uwes9: dict[str, int] | None,
) -> tuple[str, str]:
    """Persist consent + response. Returns (consent_id, response_id).

    Will use DB when available, otherwise fallback to in-memory store.
    """
    ip_hash = _hash_pii(ip_raw)
    ua_hash = _hash_pii(user_agent_raw)

    pool = await pg_client.get_pg()
    if pool is None:
        consent_id = _memory_store.insert_consent(
            participant_token,
            consent_given,
            consent_version,
            ethics_board,
            ethics_protocol,
            ip_hash,
            ua_hash,
            locale,
        )
        response_id = _memory_store.insert_response(
            consent_id,
            scale_id="memory-upcap-tr-1.0",
            wave=wave,
            responses=responses,
            sector=sector,
            age_band=age_band,
            gender=gender,
            tenure_years=tenure_years,
            convergent_bat12=convergent_bat12,
            convergent_uwes9=convergent_uwes9,
        )
        logger.info(
            "pilot_submission_memory",
            consent_id=consent_id,
            response_id=response_id,
        )
        return consent_id, response_id

    async with pool.acquire() as conn:
        scale_row = await conn.fetchrow(
            """
            SELECT id FROM app.psychometric_scales
            WHERE code = $1 AND version = $2 AND locale = 'tr-TR'
            """,
            scale_code,
            scale_version,
        )
        if scale_row is None:
            raise ValueError(
                f"Scale not found: {scale_code}/{scale_version} (migration 056 run?)"
            )
        scale_id = scale_row["id"]

        async with conn.transaction():
            consent_row = await conn.fetchrow(
                """
                INSERT INTO app.upcap_pilot_consents
                    (participant_token, consent_given, consent_version,
                     ethics_board, ethics_protocol, ip_hash, user_agent_hash, locale)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (participant_token) DO UPDATE
                    SET consent_given = EXCLUDED.consent_given
                RETURNING id
                """,
                participant_token,
                consent_given,
                consent_version,
                ethics_board,
                ethics_protocol,
                ip_hash,
                ua_hash,
                locale,
            )
            consent_id = consent_row["id"]

            response_row = await conn.fetchrow(
                """
                INSERT INTO app.upcap_pilot_responses
                    (consent_id, scale_id, wave, responses, sector, age_band,
                     gender, tenure_years, convergent_bat12, convergent_uwes9)
                VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
                ON CONFLICT (consent_id, wave) DO UPDATE
                    SET responses = EXCLUDED.responses,
                        submitted_at = NOW()
                RETURNING id
                """,
                consent_id,
                scale_id,
                wave,
                json.dumps(responses),
                sector,
                age_band,
                gender,
                tenure_years,
                json.dumps(convergent_bat12) if convergent_bat12 else None,
                json.dumps(convergent_uwes9) if convergent_uwes9 else None,
            )
            response_id = response_row["id"]

    logger.info("pilot_submission_db", consent_id=str(consent_id), response_id=str(response_id))
    return str(consent_id), str(response_id)


def get_memory_store_snapshot() -> dict[str, Any]:
    """Expose fallback store for testing introspection."""
    return {
        "consents": list(_memory_store.consents.values()),
        "responses": list(_memory_store.responses.values()),
    }


def reset_memory_store() -> None:
    """Test hook: clear in-memory store."""
    _memory_store.consents.clear()
    _memory_store.responses.clear()
