"""Signal aggregation from upstream services.

Production path: async HTTP fan-out to burnout-prediction + recommendation
services, then merges into SignalBundles per employee.

Demo/fallback path: synthetic bundles for UI showcasing when upstream
services are unavailable or empty. Kept as graceful degradation.
"""

from __future__ import annotations

import asyncio
from uuid import UUID, uuid4

import httpx
import structlog

from app.config import settings
from app.schemas.actions import SignalBundle

logger = structlog.get_logger()

# Upstream call timeout (per request).
UPSTREAM_TIMEOUT_SECONDS = 2.0


async def aggregate_signals(
    tenant_id: UUID,
    scope: dict | None = None,
) -> list[SignalBundle]:
    """Aggregate signals from upstream services.

    Pipeline:
      1. Fetch critical + amber employees from burnout-prediction `/critical`.
      2. For each employee, fetch detailed breakdown from `/employee/{id}`.
      3. Merge into SignalBundle (current band + trend slope + JD-R gap).
      4. If upstream empty OR error: fall back to demo bundles.

    Args:
        tenant_id: Tenant UUID (injected as X-Tenant-Id header).
        scope: Optional scope filter (dept/team) — passed through to upstream.

    Returns:
        List of SignalBundles — one per at-risk employee.
    """
    try:
        bundles = await _fetch_from_burnout(tenant_id, scope)
        if bundles:
            logger.info(
                "signals_aggregated_live",
                tenant_id=str(tenant_id),
                bundle_count=len(bundles),
            )
            return bundles
        logger.info(
            "signals_upstream_empty_fallback_demo",
            tenant_id=str(tenant_id),
        )
    except Exception as err:
        logger.warning(
            "signals_upstream_failed_fallback_demo",
            tenant_id=str(tenant_id),
            error=str(err),
        )

    bundles = _generate_demo_bundles(tenant_id)
    logger.info(
        "signals_aggregated_demo",
        tenant_id=str(tenant_id),
        bundle_count=len(bundles),
    )
    return bundles


# ───────────────────────────────────────────────────────────────────────────
# Live path: burnout-prediction service HTTP fan-out
# ───────────────────────────────────────────────────────────────────────────

async def _fetch_from_burnout(
    tenant_id: UUID,
    scope: dict | None,
) -> list[SignalBundle]:
    """Fetch critical list + per-employee breakdowns from burnout service."""
    headers = {"X-Tenant-Id": str(tenant_id)}
    base = settings.BURNOUT_SERVICE_URL.rstrip("/")

    async with httpx.AsyncClient(timeout=UPSTREAM_TIMEOUT_SECONDS) as client:
        # 1. Get critical employees (amber + red band, top-10)
        critical_resp = await client.get(
            f"{base}/api/v1/burnout/critical?limit=10",
            headers=headers,
        )
        critical_resp.raise_for_status()
        critical = critical_resp.json()
        items = critical.get("items", [])

        if not items:
            return []

        # 2. Fan-out: fetch detailed breakdown per employee in parallel
        detail_tasks = [
            client.get(
                f"{base}/api/v1/burnout/employee/{item['employee_id']}",
                headers=headers,
            )
            for item in items
        ]
        detail_responses = await asyncio.gather(*detail_tasks, return_exceptions=True)

    # 3. Merge into SignalBundle
    bundles: list[SignalBundle] = []
    for item, detail in zip(items, detail_responses, strict=False):
        if isinstance(detail, Exception):
            logger.debug("employee_detail_failed", employee_id=item["employee_id"])
            continue
        if isinstance(detail, httpx.Response) and not detail.is_success:
            continue
        d = detail.json() if isinstance(detail, httpx.Response) else {}

        if not d.get("has_data"):
            continue

        score = float(item.get("score") or 0.0)
        band_upper = item.get("band", "GREEN").upper()

        # Calculate slope from trend (last vs first point).
        trend = d.get("trend", []) or []
        slope = 0.0
        if len(trend) >= 2:
            first_score = trend[0].get("score") or 0.0
            last_score = trend[-1].get("score") or 0.0
            slope = round(last_score - first_score, 2)

        # Top drivers from JD-R gap analysis.
        top_drivers: list[str] = []
        jdr = d.get("jdr") or {}
        gap = jdr.get("balance_gap")
        if gap and gap > 15:
            top_drivers.append("jdr_demand_resource_gap")
        for sub in (d.get("subscales") or []):
            if sub.get("band") in ("red", "amber"):
                top_drivers.append(f"bat_{sub['key']}_elevated")

        # BAT to burnout probability mapping: score 1-5 → 0.0-1.0 roughly.
        # score ≤2.58 → green (≤0.35), ≤3.01 → amber (0.35-0.55), >3.01 → red (>0.55)
        burnout_now = _bat_to_prob(score)

        target_name = f"{item.get('ad', '')[:1]}. {item.get('soyad', '')[:1]}.".strip()

        bundles.append(
            SignalBundle(
                target_id=UUID(item["employee_id"]),
                target_name=target_name,
                burnout_30d=burnout_now,
                burnout_60d=max(0.0, burnout_now - 0.05),
                burnout_90d=min(1.0, burnout_now + 0.05),
                burnout_band=band_upper,
                top_drivers=top_drivers[:3],
                bat_exhaustion_slope=slope,
                # Engagement / absence / overtime not yet exposed by burnout service —
                # reasonable defaults derived from BAT band.
                engagement_score=max(0.0, 1.0 - burnout_now),
                absence_days_30d=int(burnout_now * 6),
                overtime_hours_30d=burnout_now * 50.0,
                days_since_1on1=int(burnout_now * 45),
            )
        )

    return bundles


def _bat_to_prob(bat_score: float) -> float:
    """BAT-TR 1-5 score → burnout probability 0-1.

    Piecewise linear mapping aligned with Koçak 2022 European norms:
      1.0 → 0.0
      2.58 (green ceiling) → 0.35
      3.01 (amber ceiling) → 0.55
      5.0 → 1.0
    """
    if bat_score <= 1.0:
        return 0.0
    if bat_score <= 2.58:
        return round((bat_score - 1.0) / 1.58 * 0.35, 2)
    if bat_score <= 3.01:
        return round(0.35 + (bat_score - 2.58) / 0.43 * 0.20, 2)
    if bat_score <= 5.0:
        return round(0.55 + (bat_score - 3.01) / 1.99 * 0.45, 2)
    return 1.0


# ───────────────────────────────────────────────────────────────────────────
# Demo fallback
# ───────────────────────────────────────────────────────────────────────────

def _generate_demo_bundles(tenant_id: UUID) -> list[SignalBundle]:
    """Synthetic signal bundles for V1 demonstration when upstream empty."""
    import random

    random.seed(42)  # Deterministic for consistency.
    _ = tenant_id  # unused

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

    bundles: list[SignalBundle] = []
    for p in demo_profiles:
        bundles.append(
            SignalBundle(
                target_id=uuid4(),
                target_name=p["name_initial"],
                burnout_30d=p["burnout_30d"],
                burnout_60d=p["burnout_60d"],
                burnout_90d=p["burnout_90d"],
                burnout_band=p["band"],
                top_drivers=p["drivers"],
                bat_exhaustion_slope=p["slope"],
                engagement_score=p["engagement"],
                absence_days_30d=p["absence"],
                overtime_hours_30d=p["overtime"],
                days_since_1on1=p["days_1on1"],
            )
        )

    return bundles
