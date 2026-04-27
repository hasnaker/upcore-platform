"""UpCap-TR v1.0 validated scoring + sector comparison + pilot research.

POST /v1/score/upcap-tr              — produce composite, factors, percentile, T-score
GET  /v1/score/upcap-tr/norms        — serve norm bundle + disclaimer
POST /v1/research/upcap-pilot        — anonymous academic pilot submission
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, Request

from app.norms.upcap_tr_norms import (
    get_all_age_bands,
    get_all_sectors,
    get_overall_norm,
    get_sector_norm,
    get_validation_status,
    load_upcap_tr_norms,
)
from app.research.pilot_store import persist_pilot_submission
from app.schemas.upcap_tr import (
    UpCapPilotResponseAck,
    UpCapPilotResponseRequest,
    UpCapTRFactorScore,
    UpCapTRScoreRequest,
    UpCapTRScoreResponse,
    UpCapTRSectorComparison,
    UpCapTRSectorNormsResponse,
)
from app.scoring.upcap_tr_scoring import (
    UPCAP_TR_V1_VERSION,
    score_upcap_tr,
)

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["upcap-tr"])


@router.post(
    "/score/upcap-tr",
    response_model=UpCapTRScoreResponse,
    summary="Score UpCap-TR v1.0 (3 factor × 4 item PsyCap)",
    description=(
        "Deterministic scoring of the UpCap-TR v1.0 psychological capital scale. "
        "Returns factor means (umut-iyimserlik, dirençlilik, öz-yeterlik), composite, "
        "percentile rank, T-score (M=50, SD=10) and optional sector comparison. "
        "Validation status (Cronbach >= 0.85 + CFA fit + peer-review) reflected in the "
        "`validated` flag — do not use for personnel decisions while validated=false."
    ),
)
async def score_upcap_tr_endpoint(req: UpCapTRScoreRequest) -> UpCapTRScoreResponse:
    logger.info(
        "upcap_tr_score_request",
        assessment_id=str(req.assessment_id),
        sector=req.sector,
    )

    overall = get_overall_norm()
    sector_norm = get_sector_norm(req.sector)
    validated = get_validation_status()

    try:
        result = score_upcap_tr(
            responses=req.responses,
            overall_norm=overall,
            sector_norm=sector_norm,
            validated=validated,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    sector_block: UpCapTRSectorComparison | None = None
    if req.sector and result.sector_comparison:
        sector_block = UpCapTRSectorComparison(
            sector=req.sector,
            sector_mean=result.sector_comparison["sector_mean"],
            sector_sd=result.sector_comparison["sector_sd"],
            sector_percentile=result.sector_comparison["sector_percentile"],
            delta_from_sector_mean=result.sector_comparison["delta_from_sector_mean"],
        )

    return UpCapTRScoreResponse(
        tenant_id=req.tenant_id,
        employee_id=req.employee_id,
        assessment_id=req.assessment_id,
        scale_code="upcap_tr",
        scale_version=UPCAP_TR_V1_VERSION,
        composite_score=result.composite_score,
        factors=result.factors,
        factor_breakdown=[
            UpCapTRFactorScore(
                factor=b.factor,  # type: ignore[arg-type]
                raw_mean=b.raw_mean,
                items_count=b.items_count,
            )
            for b in result.factor_breakdown
        ],
        percentile=result.percentile,
        t_score=result.t_score,
        interpretation=result.interpretation,
        sector_comparison=sector_block,
        validated=result.validated,
        disclaimer=result.disclaimer,
        scored_at=result.scored_at,
    )


@router.get(
    "/score/upcap-tr/norms",
    response_model=UpCapTRSectorNormsResponse,
    summary="UpCap-TR norm bundle + sector + age-band reference distributions",
)
async def upcap_tr_norms_endpoint() -> UpCapTRSectorNormsResponse:
    norms = load_upcap_tr_norms()
    disclaimer = (
        "UpCap-TR v1.0 bilimsel doğrulama sürecindedir. "
        "Norm değerleri provisional (N=0 pilot başlangıcı) — güncellemeler pilot "
        "veri toplama tamamlandığında yayınlanacak. Performans kararlarında "
        "belirleyici olarak kullanılamaz."
        if not norms.get("validated", False)
        else "UpCap-TR v1.0 Türkiye'de doğrulandı. Peer-review yayın referansı için 'doi' alanına bakın."
    )

    return UpCapTRSectorNormsResponse(
        scale_code="upcap_tr",
        scale_version=UPCAP_TR_V1_VERSION,
        validated=bool(norms.get("validated", False)),
        overall=get_overall_norm(),
        sectors=get_all_sectors(),
        age_bands=get_all_age_bands(),
        disclaimer=disclaimer,
    )


@router.post(
    "/research/upcap-pilot",
    response_model=UpCapPilotResponseAck,
    summary="Anonymous academic pilot submission (KVKK Madde 6 açık rıza)",
    description=(
        "Anonim pilot veri toplama endpoint'i. PII kabul edilmez. "
        "participant_token client-side UUID'dir; aynı token ile 2. dalga "
        "(test-retest) yanıt gönderilebilir."
    ),
)
async def upcap_pilot_endpoint(
    req: UpCapPilotResponseRequest,
    request: Request,
) -> UpCapPilotResponseAck:
    if not req.consent.consent_given:
        raise HTTPException(
            status_code=400,
            detail=(
                "Consent not granted. Pilot submissions require explicit "
                "informed consent (KVKK Madde 6 açık rıza)."
            ),
        )

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    try:
        consent_id, response_id = await persist_pilot_submission(
            participant_token=req.participant_token,
            consent_given=req.consent.consent_given,
            consent_version=req.consent.consent_version,
            ethics_board=req.consent.ethics_board,
            ethics_protocol=req.consent.ethics_protocol,
            locale=req.consent.locale,
            ip_raw=client_ip,
            user_agent_raw=user_agent,
            scale_code="upcap_tr",
            scale_version=UPCAP_TR_V1_VERSION,
            wave=req.wave,
            responses=req.responses,
            sector=req.sector,
            age_band=req.age_band,
            gender=req.gender,
            tenure_years=req.tenure_years,
            convergent_bat12=req.convergent_bat12,
            convergent_uwes9=req.convergent_uwes9,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("pilot_persist_failed", error=str(exc))
        raise HTTPException(status_code=500, detail="Pilot submission failed") from exc

    logger.info(
        "pilot_submission_accepted",
        consent_id=consent_id,
        wave=req.wave,
        sector=req.sector,
    )

    return UpCapPilotResponseAck(
        accepted=True,
        consent_id=consent_id,
        response_id=response_id,
        wave=req.wave,
        message=(
            "Katılımınız için teşekkürler. Anonim yanıtınız akademik validasyon "
            "havuzuna eklendi · pilot tamamlandığında CFA + Cronbach α raporu "
            "docs/bilim/ altında yayınlanacak."
        ),
    )
