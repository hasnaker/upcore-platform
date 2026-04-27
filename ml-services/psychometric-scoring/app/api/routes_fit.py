"""JD-R fit scoring endpoint — aday ↔ pozisyon uyumu.

Bir pozisyon profili (6 talep + 6 kaynak) ve bir aday profili arasında
ağırlıklı benzerlik hesaplar. Asimetrik ceza kullanır:

- Talepler: aday < pozisyon → altında kalmış, yüksek ceza.
  Aday > pozisyon → over-qualified, düşük ceza (fazlalık iyi).
- Kaynaklar: aday > pozisyon → pozisyon yetmeyecek, yüksek ceza.
  Aday < pozisyon → pozisyon fazla kaynak sunar, düşük ceza.

Output: fit 0-100, boyut bazlı gap listesi, kısa mülakat soruları.
"""

from __future__ import annotations

from typing import Literal

import structlog
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/score", tags=["fit"])


# Dimension keys expected in both position and candidate profiles.
DEMAND_DIMS = [
    ("workload", "İş yükü"),
    ("time_pressure", "Zaman baskısı"),
    ("cognitive_demand", "Bilişsel talep"),
    ("emotional_demand", "Duygusal talep"),
    ("role_conflict", "Rol çatışması"),
    ("role_ambiguity", "Rol belirsizliği"),
]
RESOURCE_DIMS = [
    ("autonomy", "Özerklik"),
    ("feedback", "Geri bildirim"),
    ("social_support", "Sosyal destek"),
    ("development", "Gelişim fırsatı"),
    ("skill_variety", "Beceri çeşitliliği"),
    ("task_importance", "Görev önemi"),
]


# ──────────────────────────────────────────────────────────────────────────

class JDRProfile(BaseModel):
    """6 talep + 6 kaynak — 0-100 normalize."""

    demands: dict[str, float] = Field(..., description="demand_key → 0-100")
    resources: dict[str, float] = Field(..., description="resource_key → 0-100")

    @field_validator("demands", "resources")
    @classmethod
    def validate_range(cls, v: dict[str, float]) -> dict[str, float]:
        for k, val in v.items():
            if not 0 <= val <= 100:
                raise ValueError(f"{k}: 0-100 aralığında olmalı, {val} verildi")
        return v


class FitRequest(BaseModel):
    position: JDRProfile
    candidate: JDRProfile
    candidate_name: str | None = None
    position_title: str | None = None


class DimensionGap(BaseModel):
    key: str
    label_tr: str
    kind: Literal["demand", "resource"]
    position: float
    candidate: float
    gap: float  # signed: positive = candidate > position
    severity: Literal["good_fit", "minor", "moderate", "critical"]


class FitResponse(BaseModel):
    fit_score: float  # 0-100 overall
    demands_fit: float
    resources_fit: float
    risk_level: Literal["low", "medium", "high"]
    risk_reasoning_tr: str
    dimensions: list[DimensionGap]
    interview_questions_tr: list[str] = Field(default_factory=list)


# ──────────────────────────────────────────────────────────────────────────

def _asymmetric_score(position: float, candidate: float, is_demand: bool) -> float:
    """Return a 0-1 score for one dimension.

    For demands: candidate must >= position demand. Under-capacity penalized.
    For resources: position offers >= candidate need. Under-supply penalized.

    Simplifying: both cases use min(candidate, position) / max(position, 1)
    with asymmetric penalty when under.
    """
    if is_demand:
        # candidate's capacity vs position's demand
        if position == 0:
            return 1.0
        ratio = candidate / max(position, 1)
        if ratio >= 1.0:
            # Over-qualified → slight diminishing (too much over is also suspicious)
            return max(0.85, 1.0 - 0.05 * (ratio - 1.0))
        # Under-capacity — steep penalty
        return ratio  # linear; 0.5 means half-capacity → 50% fit
    # Resource: position offers vs candidate need
    if candidate == 0:
        return 1.0
    ratio = position / max(candidate, 1)
    if ratio >= 1.0:
        return 1.0  # enough + surplus is ok
    return ratio  # under-supply penalty


def _severity(gap_abs: float) -> Literal["good_fit", "minor", "moderate", "critical"]:
    if gap_abs <= 10:
        return "good_fit"
    if gap_abs <= 25:
        return "minor"
    if gap_abs <= 40:
        return "moderate"
    return "critical"


INTERVIEW_TEMPLATES_TR = {
    "workload": "Yüksek iş yükü dönemlerinde önceliklendirmeyi nasıl yaparsınız?",
    "time_pressure": "Sıkı bir teslim tarihine rağmen kalite düşmesin diye ne yaparsınız?",
    "cognitive_demand": "Karmaşık problemleri parçalara ayırma sürecinizi bir örnekle anlatın.",
    "emotional_demand": "Duygusal olarak zorlayıcı bir iş deneyiminizle nasıl başa çıktığınızı anlatın.",
    "role_conflict": "Farklı paydaşların birbiriyle çelişen beklentilerini nasıl yönetirsiniz?",
    "role_ambiguity": "Belirsiz bir rol tanımı ile karşılaştığınızda ilk 30 gününüzü nasıl kurgularsınız?",
    "autonomy": "En verimli olduğunuz çalışma tarzı nedir — ne kadar özerklik gerektirir?",
    "feedback": "Son 6 ayda aldığınız en değerli geri bildirim neydi, ne değiştirdi?",
    "social_support": "Ekip içinde destek almak/vermek konusunda nasıl bir pozisyon alırsınız?",
    "development": "Bir sonraki 2 yılda kendinizi hangi alanda geliştirmek istiyorsunuz?",
    "skill_variety": "Rutin işleri uzun süre yapmakla çeşitli iş arasında dengeyi nasıl kurarsınız?",
    "task_importance": "Yaptığınız işin daha büyük resimdeki yerini nasıl tanımlarsınız?",
}


@router.post("/fit", response_model=FitResponse)
async def compute_fit(req: FitRequest) -> FitResponse:
    """JD-R pozisyon ↔ aday uyum skoru."""
    try:
        dim_results: list[DimensionGap] = []

        # Demand dimensions
        demand_scores: list[float] = []
        for key, label in DEMAND_DIMS:
            pos = req.position.demands.get(key, 0.0)
            cand = req.candidate.demands.get(key, 0.0)
            score = _asymmetric_score(pos, cand, is_demand=True)
            demand_scores.append(score)
            gap = cand - pos
            dim_results.append(
                DimensionGap(
                    key=key,
                    label_tr=label,
                    kind="demand",
                    position=pos,
                    candidate=cand,
                    gap=round(gap, 1),
                    severity=_severity(abs(gap)),
                )
            )

        # Resource dimensions
        resource_scores: list[float] = []
        for key, label in RESOURCE_DIMS:
            pos = req.position.resources.get(key, 0.0)
            cand = req.candidate.resources.get(key, 0.0)
            score = _asymmetric_score(pos, cand, is_demand=False)
            resource_scores.append(score)
            gap = pos - cand  # reversed: position - candidate_need
            dim_results.append(
                DimensionGap(
                    key=key,
                    label_tr=label,
                    kind="resource",
                    position=pos,
                    candidate=cand,
                    gap=round(gap, 1),
                    severity=_severity(abs(gap)),
                )
            )

        demands_fit = sum(demand_scores) / len(demand_scores) * 100 if demand_scores else 0.0
        resources_fit = (
            sum(resource_scores) / len(resource_scores) * 100 if resource_scores else 0.0
        )
        fit_score = 0.55 * demands_fit + 0.45 * resources_fit  # demands slightly weighted

        # Risk classification
        critical_count = sum(1 for d in dim_results if d.severity == "critical")
        moderate_count = sum(1 for d in dim_results if d.severity == "moderate")
        if fit_score >= 75 and critical_count == 0:
            risk = "low"
            reasoning = "Genel uyum yüksek, kritik boyut yok — önerilir."
        elif fit_score >= 55 and critical_count <= 1:
            risk = "medium"
            reasoning = (
                f"Orta uyum — {critical_count} kritik + {moderate_count} orta boyut var; "
                "mülakatta derinlemesine incele."
            )
        else:
            risk = "high"
            reasoning = (
                f"Düşük uyum ({critical_count} kritik boyut). Ek koçluk / gelişim planı "
                "gerekecek; role alternatif adaylar önerilir."
            )

        # Interview questions from worst-severity dimensions
        worst = sorted(dim_results, key=lambda d: -abs(d.gap))[:3]
        interview_qs = [
            INTERVIEW_TEMPLATES_TR[d.key] for d in worst if d.key in INTERVIEW_TEMPLATES_TR
        ]

        return FitResponse(
            fit_score=round(fit_score, 1),
            demands_fit=round(demands_fit, 1),
            resources_fit=round(resources_fit, 1),
            risk_level=risk,
            risk_reasoning_tr=reasoning,
            dimensions=dim_results,
            interview_questions_tr=interview_qs,
        )
    except Exception as err:
        logger.exception("jdr_fit_error", candidate_name=req.candidate_name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"fit scoring failed: {err}",
        ) from err
