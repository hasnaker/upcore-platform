"""Effectiveness statistics endpoints."""

from __future__ import annotations

from uuid import UUID

import structlog
from fastapi import APIRouter

from app.effectiveness.thompson_sampling import compute_effectiveness_summary

logger = structlog.get_logger()
router = APIRouter()


@router.get("/{intervention_id}")
async def get_effectiveness(intervention_id: UUID) -> dict:
    """Get effectiveness statistics for an intervention.

    Returns posterior (alpha, beta), mean, 95% credible interval,
    and observation counts.

    For V1: returns prior (no observations yet).
    """
    # Default prior for V1
    alpha = 1.0
    beta = 1.0

    # In production: fetch from PosteriorStore
    # posterior = await posterior_store.get_posterior(str(intervention_id))

    summary = compute_effectiveness_summary(alpha, beta)

    return {
        "intervention_id": str(intervention_id),
        "alpha": alpha,
        "beta": beta,
        **summary,
        "note": "Prior values. No observations recorded yet.",
    }
