"""Intervention catalog CRUD endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

import structlog
from fastapi import APIRouter, HTTPException, status

from app.schemas.requests import CatalogWriteRequest
from app.schemas.responses import CatalogEntry

logger = structlog.get_logger()
router = APIRouter()

# In-memory catalog for V1; production uses PostgreSQL
_catalog: dict[str, CatalogEntry] = {}


@router.post("/interventions", response_model=CatalogEntry)
async def create_intervention(req: CatalogWriteRequest) -> CatalogEntry:
    """Create a new intervention in the catalog."""
    # Validate: Tier A must have citations
    if req.evidence_tier == "A" and not req.citations:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Evidence tier A interventions must include at least 1 citation.",
        )

    entry_id = uuid4()
    now = datetime.now(timezone.utc)

    entry = CatalogEntry(
        id=entry_id,
        title_tr=req.title_tr,
        title_en=req.title_en,
        description_tr=req.description_tr,
        description_en=req.description_en,
        evidence_tier=req.evidence_tier,
        target_drivers=req.target_drivers,
        target_burnout_band=req.target_burnout_band,
        delivery_mode=req.delivery_mode,
        expected_effect_size=req.expected_effect_size,
        time_to_effect_weeks=req.time_to_effect_weeks,
        cost_tier=req.cost_tier,
        citations=req.citations,
        active=req.active,
        created_at=now,
        updated_at=now,
    )

    _catalog[str(entry_id)] = entry

    logger.info(
        "intervention_created",
        id=str(entry_id),
        title_en=req.title_en,
        evidence_tier=req.evidence_tier,
    )

    return entry


@router.get("/interventions/{intervention_id}", response_model=CatalogEntry)
async def get_intervention(intervention_id: UUID) -> CatalogEntry:
    """Get a specific intervention from the catalog."""
    entry = _catalog.get(str(intervention_id))
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intervention '{intervention_id}' not found.",
        )
    return entry


@router.get("/search")
async def search_catalog(q: str = "", evidence_tier: str | None = None) -> list[CatalogEntry]:
    """Search interventions in the catalog."""
    results: list[CatalogEntry] = []
    q_lower = q.lower()

    for entry in _catalog.values():
        if not entry.active:
            continue

        if evidence_tier and entry.evidence_tier != evidence_tier:
            continue

        if q_lower and q_lower not in entry.title_tr.lower() and q_lower not in entry.title_en.lower():
            continue

        results.append(entry)

    return results
