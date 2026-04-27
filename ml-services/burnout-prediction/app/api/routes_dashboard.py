"""Burnout dashboard endpoints — heatmap and critical employees.

These aggregate BAT-12-TR signals stored in app.burnout_signals into
the visualizations the /tukenmislik panel needs:

- GET /api/v1/burnout/heatmap?weeks=4  →  department × week grid
- GET /api/v1/burnout/critical?limit=10  →  top-N highest-risk employees
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Literal
from uuid import UUID

import asyncpg
import structlog
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.dependencies import get_pg

logger = structlog.get_logger()
router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────
# Shared: tenant context — gateway sets X-Tenant-Id after JWT validation.
# ──────────────────────────────────────────────────────────────────────────

async def tenant_from_header(
    x_tenant_id: str | None = Header(default=None, alias="X-Tenant-Id"),
) -> UUID:
    if not x_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing X-Tenant-Id header",
        )
    try:
        return UUID(x_tenant_id)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"invalid tenant id: {err}",
        ) from err


# BAT-TR thresholds (Koçak et al. 2022 European norms)
GREEN_MAX = 2.58
AMBER_MAX = 3.01


def classify_band(score: float | None) -> Literal["green", "amber", "red", "na"]:
    if score is None:
        return "na"
    if score <= GREEN_MAX:
        return "green"
    if score <= AMBER_MAX:
        return "amber"
    return "red"


# ──────────────────────────────────────────────────────────────────────────
# Heatmap: dept × week grid
# ──────────────────────────────────────────────────────────────────────────

class HeatmapCell(BaseModel):
    department_id: str | None = None
    department_name: str
    week_start: date
    avg_score: float | None = None
    respondent_count: int = 0
    band: Literal["green", "amber", "red", "na"] = "na"


class HeatmapStats(BaseModel):
    avg_total: float | None = None
    red_count: int = 0
    amber_count: int = 0
    green_count: int = 0
    total_employees: int = 0


class HeatmapResponse(BaseModel):
    weeks: int
    generated_at: date
    cells: list[HeatmapCell] = Field(default_factory=list)
    stats: HeatmapStats


@router.get("/heatmap", response_model=HeatmapResponse)
async def get_heatmap(
    weeks: int = Query(4, ge=1, le=52, description="Kaç hafta"),
    pool: asyncpg.Pool = Depends(get_pg),
    tenant_id: UUID = Depends(tenant_from_header),
) -> HeatmapResponse:
    """Burnout heatmap — her departman için son N haftanın ortalama BAT-12 skoru."""
    since = date.today() - timedelta(days=weeks * 7)

    heatmap_sql = """
        SELECT
            d.id::text AS department_id,
            COALESCE(d.name_tr, 'Genel') AS department_name,
            (date_trunc('week', bs.ts))::date AS week_start,
            ROUND(AVG(bs.feature_value)::numeric, 2)::double precision AS avg_score,
            COUNT(DISTINCT bs.employee_id)::int AS respondent_count
        FROM app.burnout_signals bs
        JOIN app.employees e
            ON e.id = bs.employee_id AND e.tenant_id = bs.tenant_id
        LEFT JOIN app.departments d ON d.id = e.department_id
        WHERE bs.tenant_id = $1
          AND bs.feature_name = 'bat_total'
          AND bs.ts >= $2
        GROUP BY d.id, d.name_tr, date_trunc('week', bs.ts)
        ORDER BY d.name_tr NULLS LAST, week_start
    """

    stats_sql = """
        WITH latest AS (
            SELECT DISTINCT ON (bs.employee_id)
                bs.employee_id, bs.feature_value
            FROM app.burnout_signals bs
            WHERE bs.tenant_id = $1 AND bs.feature_name = 'bat_total'
            ORDER BY bs.employee_id, bs.ts DESC
        )
        SELECT
            ROUND(AVG(feature_value)::numeric, 2)::double precision AS avg_total,
            COUNT(*) FILTER (WHERE feature_value >  3.01)::int AS red_count,
            COUNT(*) FILTER (WHERE feature_value >  2.58 AND feature_value <= 3.01)::int AS amber_count,
            COUNT(*) FILTER (WHERE feature_value <= 2.58)::int AS green_count,
            COUNT(*)::int AS total_employees
        FROM latest
    """

    async with pool.acquire() as conn:
        await conn.execute("SELECT set_config('app.tenant_id', $1, true)", str(tenant_id))
        rows = await conn.fetch(heatmap_sql, tenant_id, since)
        stat_row = await conn.fetchrow(stats_sql, tenant_id)

    cells = [
        HeatmapCell(
            department_id=r["department_id"],
            department_name=r["department_name"],
            week_start=r["week_start"],
            avg_score=r["avg_score"],
            respondent_count=r["respondent_count"],
            band=classify_band(r["avg_score"]),
        )
        for r in rows
    ]

    stats = HeatmapStats(
        avg_total=stat_row["avg_total"] if stat_row else None,
        red_count=stat_row["red_count"] if stat_row else 0,
        amber_count=stat_row["amber_count"] if stat_row else 0,
        green_count=stat_row["green_count"] if stat_row else 0,
        total_employees=stat_row["total_employees"] if stat_row else 0,
    )

    return HeatmapResponse(
        weeks=weeks,
        generated_at=date.today(),
        cells=cells,
        stats=stats,
    )


# ──────────────────────────────────────────────────────────────────────────
# Critical employees: top-N highest-risk
# ──────────────────────────────────────────────────────────────────────────

class CriticalEmployee(BaseModel):
    employee_id: str
    employee_no: str | None = None
    ad: str
    soyad: str
    department_id: str | None = None
    department_name: str | None = None
    score: float
    band: Literal["amber", "red"]
    last_measured_at: date


class CriticalListResponse(BaseModel):
    total: int
    items: list[CriticalEmployee] = Field(default_factory=list)


@router.get("/critical", response_model=CriticalListResponse)
async def get_critical_employees(
    limit: int = Query(10, ge=1, le=100),
    pool: asyncpg.Pool = Depends(get_pg),
    tenant_id: UUID = Depends(tenant_from_header),
) -> CriticalListResponse:
    """Son BAT-12 skoruna göre en yüksek riskli N çalışan (amber + red)."""
    sql = """
        WITH latest AS (
            SELECT DISTINCT ON (bs.employee_id)
                bs.employee_id, bs.feature_value, bs.ts
            FROM app.burnout_signals bs
            WHERE bs.tenant_id = $1 AND bs.feature_name = 'bat_total'
            ORDER BY bs.employee_id, bs.ts DESC
        )
        SELECT
            e.id::text        AS employee_id,
            e.employee_no     AS employee_no,
            e.ad              AS ad,
            e.soyad           AS soyad,
            d.id::text        AS department_id,
            d.name_tr         AS department_name,
            l.feature_value::double precision AS score,
            l.ts              AS last_measured_at
        FROM latest l
        JOIN app.employees e
            ON e.id = l.employee_id AND e.tenant_id = $1
        LEFT JOIN app.departments d ON d.id = e.department_id
        WHERE l.feature_value > 2.58
        ORDER BY l.feature_value DESC
        LIMIT $2
    """
    async with pool.acquire() as conn:
        await conn.execute("SELECT set_config('app.tenant_id', $1, true)", str(tenant_id))
        rows = await conn.fetch(sql, tenant_id, limit)

    items = [
        CriticalEmployee(
            employee_id=r["employee_id"],
            employee_no=r["employee_no"],
            ad=r["ad"],
            soyad=r["soyad"],
            department_id=r["department_id"],
            department_name=r["department_name"],
            score=r["score"],
            band="red" if r["score"] > AMBER_MAX else "amber",
            last_measured_at=r["last_measured_at"],
        )
        for r in rows
    ]

    return CriticalListResponse(total=len(items), items=items)


# ──────────────────────────────────────────────────────────────────────────
# Individual BAT-12-TR + JD-R breakdown
# ──────────────────────────────────────────────────────────────────────────

# BAT-12-TR subscales (Koçak 2022): 4 boyut, her biri 3 item × 5'li Likert
BAT_SUBSCALES = [
    ("bat_exhaustion", "Tükenmişlik"),
    ("bat_mental_distance", "Zihinsel Uzaklaşma"),
    ("bat_cognitive", "Bilişsel Bozulma"),
    ("bat_emotional", "Duygusal Bozulma"),
]

# JD-R talepler ve kaynakları (COPSOQ-III-TR Şahan 2019)
JDR_DEMANDS = [
    ("jdr_workload", "İş yükü"),
    ("jdr_time_pressure", "Zaman baskısı"),
    ("jdr_cognitive_demand", "Bilişsel talep"),
    ("jdr_emotional_demand", "Duygusal talep"),
    ("jdr_role_conflict", "Rol çatışması"),
    ("jdr_role_ambiguity", "Rol belirsizliği"),
]
JDR_RESOURCES = [
    ("jdr_autonomy", "Özerklik"),
    ("jdr_feedback", "Geri bildirim"),
    ("jdr_social_support", "Sosyal destek"),
    ("jdr_development", "Gelişim fırsatı"),
    ("jdr_skill_variety", "Beceri çeşitliliği"),
    ("jdr_task_importance", "Görev önemi"),
]


class SubscaleScore(BaseModel):
    key: str
    label_tr: str
    score: float | None = None
    band: Literal["green", "amber", "red", "na"] = "na"


class JDRDimension(BaseModel):
    key: str
    label_tr: str
    score: float | None = None  # 0-100 normalize


class JDRBalance(BaseModel):
    demands: list[JDRDimension] = Field(default_factory=list)
    resources: list[JDRDimension] = Field(default_factory=list)
    demand_avg: float | None = None
    resource_avg: float | None = None
    balance_gap: float | None = None  # positive = demands exceed resources


class TrendPoint(BaseModel):
    week_start: date
    score: float | None = None


class EmployeeBurnoutResponse(BaseModel):
    employee_id: str
    has_data: bool
    bat_total: float | None = None
    bat_band: Literal["green", "amber", "red", "na"] = "na"
    norm_percentile: int | None = None  # European norm (demo rough mapping)
    last_measured_at: date | None = None
    subscales: list[SubscaleScore] = Field(default_factory=list)
    jdr: JDRBalance | None = None
    trend: list[TrendPoint] = Field(default_factory=list)


def _estimate_percentile(score: float) -> int:
    """Rough European norm percentile — Koçak 2022 mean≈2.25 SD≈0.55.

    Mapping:
      ≤1.50 → 5
       2.00 → 25
       2.58 → 60 (green ceiling)
       3.01 → 80 (amber ceiling)
      ≥3.50 → 95
    """
    if score <= 1.5:
        return 5
    if score <= 2.0:
        return int(5 + (score - 1.5) / 0.5 * 20)
    if score <= 2.58:
        return int(25 + (score - 2.0) / 0.58 * 35)
    if score <= 3.01:
        return int(60 + (score - 2.58) / 0.43 * 20)
    if score <= 3.5:
        return int(80 + (score - 3.01) / 0.49 * 15)
    return 95


@router.get("/employee/{employee_id}", response_model=EmployeeBurnoutResponse)
async def get_employee_burnout(
    employee_id: UUID,
    pool: asyncpg.Pool = Depends(get_pg),
    tenant_id: UUID = Depends(tenant_from_header),
) -> EmployeeBurnoutResponse:
    """Bir çalışanın BAT-12-TR breakdown'u, JD-R dengesi ve 30 günlük trendi."""
    all_features = (
        ["bat_total"]
        + [k for k, _ in BAT_SUBSCALES]
        + [k for k, _ in JDR_DEMANDS]
        + [k for k, _ in JDR_RESOURCES]
    )

    latest_sql = """
        SELECT DISTINCT ON (feature_name)
            feature_name, feature_value::double precision AS v, ts
        FROM app.burnout_signals
        WHERE tenant_id = $1 AND employee_id = $2
          AND feature_name = ANY($3)
        ORDER BY feature_name, ts DESC
    """

    trend_sql = """
        SELECT
            (date_trunc('week', ts))::date AS week_start,
            ROUND(AVG(feature_value)::numeric, 2)::double precision AS score
        FROM app.burnout_signals
        WHERE tenant_id = $1 AND employee_id = $2
          AND feature_name = 'bat_total'
          AND ts >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY date_trunc('week', ts)
        ORDER BY week_start
    """

    async with pool.acquire() as conn:
        await conn.execute("SELECT set_config('app.tenant_id', $1, true)", str(tenant_id))
        latest_rows = await conn.fetch(latest_sql, tenant_id, employee_id, all_features)
        trend_rows = await conn.fetch(trend_sql, tenant_id, employee_id)

    latest = {r["feature_name"]: (r["v"], r["ts"]) for r in latest_rows}

    if not latest:
        return EmployeeBurnoutResponse(
            employee_id=str(employee_id),
            has_data=False,
        )

    bat_total_tuple = latest.get("bat_total")
    bat_total = bat_total_tuple[0] if bat_total_tuple else None
    last_measured = bat_total_tuple[1] if bat_total_tuple else None

    subscales = [
        SubscaleScore(
            key=k,
            label_tr=label,
            score=latest.get(k, (None, None))[0],
            band=classify_band(latest.get(k, (None, None))[0]),
        )
        for k, label in BAT_SUBSCALES
    ]

    # JD-R dimensions normalized to 0-100 (Likert 1-5 → 0-100)
    def norm(v: float | None) -> float | None:
        if v is None:
            return None
        return round((v - 1) / 4 * 100, 1)

    demand_dims = [
        JDRDimension(key=k, label_tr=label, score=norm(latest.get(k, (None, None))[0]))
        for k, label in JDR_DEMANDS
    ]
    resource_dims = [
        JDRDimension(key=k, label_tr=label, score=norm(latest.get(k, (None, None))[0]))
        for k, label in JDR_RESOURCES
    ]

    demand_vals = [d.score for d in demand_dims if d.score is not None]
    resource_vals = [r.score for r in resource_dims if r.score is not None]
    demand_avg = round(sum(demand_vals) / len(demand_vals), 1) if demand_vals else None
    resource_avg = round(sum(resource_vals) / len(resource_vals), 1) if resource_vals else None
    gap = (
        round(demand_avg - resource_avg, 1)
        if demand_avg is not None and resource_avg is not None
        else None
    )

    trend = [
        TrendPoint(week_start=r["week_start"], score=r["score"]) for r in trend_rows
    ]

    return EmployeeBurnoutResponse(
        employee_id=str(employee_id),
        has_data=True,
        bat_total=bat_total,
        bat_band=classify_band(bat_total),
        norm_percentile=_estimate_percentile(bat_total) if bat_total else None,
        last_measured_at=last_measured,
        subscales=subscales,
        jdr=JDRBalance(
            demands=demand_dims,
            resources=resource_dims,
            demand_avg=demand_avg,
            resource_avg=resource_avg,
            balance_gap=gap,
        ),
        trend=trend,
    )
