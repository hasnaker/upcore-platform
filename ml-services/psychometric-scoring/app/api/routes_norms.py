"""Norm tables, reliability, and model card endpoints.

GET /v1/norms/{instrument}/{version}
GET /v1/reliability/{tenant_id}/{instrument}
GET /v1/model-card/{instrument}
"""

from __future__ import annotations

from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, HTTPException

from app.models.model_cards import get_model_card, get_strengths_model_card
from app.norms.norm_tables import get_norm_table
from app.schemas.common import NormReference
from app.schemas.responses import ModelCardResponse, NormTableResponse, ReliabilityResponse

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1/score", tags=["norms"])


@router.get(
    "/norms/{instrument}/{version}",
    response_model=NormTableResponse,
    summary="Get norm table metadata",
)
async def get_norms_endpoint(instrument: str, version: str) -> NormTableResponse:
    """Return norm table metadata for an instrument version."""
    table = get_norm_table(instrument, version)
    if table is None:
        # Try case variations
        table = get_norm_table(instrument.upper(), version)
    if table is None:
        raise HTTPException(
            status_code=404,
            detail=f"Norm table not found: {instrument}/{version}",
        )

    norm_ref = NormReference(
        instrument=table.instrument,
        version=table.version,
        source=table.citation,
        n=table.n,
        collected_at=table.collected_at,
        citation=table.citation,
        license=table.license,
    )

    return NormTableResponse(
        norm=norm_ref,
        subscale_means=table.subscale_means,
        subscale_sds=table.subscale_sds,
        cutoffs=table.cutoffs,
        percentile_count=sum(
            len(v) for v in table.percentile_distributions.values()
        ),
    )


@router.get(
    "/reliability/{tenant_id}/{instrument}",
    response_model=ReliabilityResponse,
    summary="Get rolling tenant-level reliability",
)
async def get_reliability_endpoint(
    tenant_id: str, instrument: str
) -> ReliabilityResponse:
    """Return rolling tenant-level Cronbach alpha over last 90 days.

    This is a placeholder — in production it would query the database
    for the last 90 days of responses and compute alpha.
    """
    logger.info(
        "reliability_request",
        tenant_id=tenant_id,
        instrument=instrument,
    )

    return ReliabilityResponse(
        tenant_id=tenant_id,
        instrument=instrument,
        cronbach_alpha=None,
        n_responses=0,
        period_days=90,
        computed_at=datetime.now(UTC),
    )


@router.get(
    "/model-card/{instrument}",
    response_model=ModelCardResponse,
    summary="Get instrument model card",
)
async def get_model_card_endpoint(instrument: str) -> ModelCardResponse:
    """Return model card (Mitchell et al. 2019) for an instrument."""
    card = get_model_card(instrument)

    # Check strengths separately (lives in models.model_cards)
    if card is None and instrument.lower() in ("strengths", "strengths-tr"):
        card = get_strengths_model_card()

    if card is None:
        raise HTTPException(
            status_code=404,
            detail=f"Model card not found for instrument: {instrument}",
        )

    return ModelCardResponse(card=card)
