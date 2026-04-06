"""Signal aggregation from upstream services.

Pulls signals from burnout-prediction and recommendation services
via async HTTP fan-out, then merges into SignalBundles per employee.

For V1: generates synthetic signal bundles for demonstration.
Production will use httpx async calls to upstream services.
"""

from __future__ import annotations

from uuid import UUID, uuid4

import structlog

from app.config import settings
from app.schemas.actions import SignalBundle

logger = structlog.get_logger()

# Upstream call timeout
UPSTREAM_TIMEOUT_SECONDS = 2.0


async def aggregate_signals(
    tenant_id: UUID,
    scope: dict | None = None,
) -> list[SignalBundle]:
    """Aggregate signals from upstream services.

    For V1: returns synthetic demo data.
    Production: async HTTP fan-out to burnout and recommendation services.

    Args:
        tenant_id: Tenant UUID.
        scope: Scope filter (team_id, department_id, etc.)

    Returns:
        List of SignalBundles, one per employee in scope.
    """
    # For V1: generate synthetic demo bundles
    bundles = _generate_demo_bundles(tenant_id)

    logger.info(
        "signals_aggregated",
        tenant_id=str(tenant_id),
        bundle_count=len(bundles),
    )

    return bundles


def _generate_demo_bundles(tenant_id: UUID) -> list[SignalBundle]:
    """Generate synthetic signal bundles for V1 demonstration.

    Creates a mix of risk levels to showcase the action center.
    """
    import random

    random.seed(42)  # Deterministic for consistency

    bundles: list[SignalBundle] = []

    # Demo employees with varying risk profiles
    demo_profiles = [
        {
            "name_initial": "A. Y.",
            "burnout_30d": 0.58,
            "burnout_60d": 0.52,
            "burnout_90d": 0.65,
            "band": "RED",
            "drivers": ["bat_exhaustion_slope_30d", "copsoq_workload_mean"],
            "slope": 0.7,
            "engagement": 0.25,
            "absence": 5,
            "overtime": 45.0,
            "days_1on1": 42,
        },
        {
            "name_initial": "M. K.",
            "burnout_30d": 0.38,
            "burnout_60d": 0.42,
            "burnout_90d": 0.48,
            "band": "AMBER",
            "drivers": ["overtime_hours_30d", "jdr_balance_ratio"],
            "slope": 0.3,
            "engagement": 0.45,
            "absence": 2,
            "overtime": 30.0,
            "days_1on1": 21,
        },
        {
            "name_initial": "E. S.",
            "burnout_30d": 0.44,
            "burnout_60d": 0.40,
            "burnout_90d": 0.50,
            "band": "AMBER",
            "drivers": ["manager_1on1_days_since", "engagement_score"],
            "slope": 0.2,
            "engagement": 0.35,
            "absence": 3,
            "overtime": 20.0,
            "days_1on1": 35,
        },
        {
            "name_initial": "D. T.",
            "burnout_30d": 0.15,
            "burnout_60d": 0.18,
            "burnout_90d": 0.20,
            "band": "GREEN",
            "drivers": [],
            "slope": 0.0,
            "engagement": 0.75,
            "absence": 0,
            "overtime": 5.0,
            "days_1on1": 7,
        },
    ]

    for profile in demo_profiles:
        bundles.append(SignalBundle(
            target_id=uuid4(),
            target_name=profile["name_initial"],
            burnout_30d=profile["burnout_30d"],
            burnout_60d=profile["burnout_60d"],
            burnout_90d=profile["burnout_90d"],
            burnout_band=profile["band"],
            top_drivers=profile["drivers"],
            bat_exhaustion_slope=profile["slope"],
            engagement_score=profile["engagement"],
            absence_days_30d=profile["absence"],
            overtime_hours_30d=profile["overtime"],
            days_since_1on1=profile["days_1on1"],
        ))

    return bundles
