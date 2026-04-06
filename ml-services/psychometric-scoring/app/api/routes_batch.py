"""Batch scoring endpoint.

POST /v1/score/batch
Scores up to 500 assessments across instruments, returns aggregated results
with per-item error reporting.
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException

from app.schemas.bat import BATScoreRequest
from app.schemas.copsoq import COPSOQScoreRequest
from app.schemas.jdr import JDRScoreRequest
from app.schemas.requests import BatchScoreRequest
from app.schemas.responses import BatchResultItem, BatchScoreResponse
from app.schemas.strengths import StrengthsScoreRequest
from app.schemas.upcap import UpCapScoreRequest
from app.scoring.bat_scoring import score_bat12
from app.scoring.copsoq_scoring import score_copsoq
from app.scoring.jdr_scoring import score_jdr
from app.scoring.strengths_scoring import score_strengths
from app.scoring.upcap_scoring import score_upcap

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/v1/score", tags=["scoring"])


def _score_single(instrument: str, payload: dict[str, object]) -> dict[str, object]:
    """Dispatch scoring to the correct instrument scorer."""
    if instrument == "bat12":
        responses = {k: int(v) for k, v in payload.get("responses", {}).items()}
        norm_version = str(payload.get("norm_version", "bat12-tr-provisional-v0.1"))
        result, _ = score_bat12(responses=responses, norm_version=norm_version)
        return {k: str(v) if not isinstance(v, (int, float, str, bool, type(None))) else v
                for k, v in result.items()}

    if instrument == "jdr":
        result = score_jdr(
            demands_z=float(payload.get("demands_z", 0.0)),
            resources_z=float(payload.get("resources_z", 0.0)),
            personal_resources_z=(
                float(payload["personal_resources_z"])
                if payload.get("personal_resources_z") is not None
                else None
            ),
        )
        return {k: v for k, v in result.items() if k != "metadata"}

    if instrument == "upcap":
        responses = {k: int(v) for k, v in payload.get("responses", {}).items()}
        result = score_upcap(responses=responses)
        return {k: str(v) if not isinstance(v, (int, float, str, bool, type(None))) else v
                for k, v in result.items()}

    if instrument == "copsoq":
        responses = {k: int(v) for k, v in payload.get("responses", {}).items()}
        result = score_copsoq(responses=responses)
        return {k: str(v) if not isinstance(v, (int, float, str, bool, type(None))) else v
                for k, v in result.items()}

    if instrument == "strengths":
        responses = {k: int(v) for k, v in payload.get("responses", {}).items()}
        result = score_strengths(responses=responses)
        return {k: str(v) if not isinstance(v, (int, float, str, bool, type(None))) else v
                for k, v in result.items()}

    raise ValueError(f"Unknown instrument: {instrument}")


@router.post(
    "/batch",
    response_model=BatchScoreResponse,
    summary="Batch scoring across instruments",
    description=(
        "Score up to 500 assessments in a single request. "
        "Each assessment specifies its instrument type and payload. "
        "Results include per-item error reporting."
    ),
)
async def score_batch_endpoint(req: BatchScoreRequest) -> BatchScoreResponse:
    """Batch score multiple assessments."""
    if len(req.assessments) > 500:
        raise HTTPException(status_code=422, detail="Max batch size is 500.")

    logger.info(
        "batch_score_request",
        assessment_id=str(req.assessment_id),
        batch_size=len(req.assessments),
    )

    results: list[BatchResultItem] = []
    succeeded = 0
    failed = 0

    for idx, item in enumerate(req.assessments):
        try:
            result = _score_single(item.instrument, item.payload)
            results.append(
                BatchResultItem(
                    index=idx,
                    instrument=item.instrument,
                    success=True,
                    result=result,
                    error=None,
                )
            )
            succeeded += 1
        except Exception as exc:
            results.append(
                BatchResultItem(
                    index=idx,
                    instrument=item.instrument,
                    success=False,
                    result=None,
                    error=str(exc),
                )
            )
            failed += 1
            logger.warning(
                "batch_item_failed",
                index=idx,
                instrument=item.instrument,
                error=str(exc),
            )

    logger.info(
        "batch_score_complete",
        total=len(req.assessments),
        succeeded=succeeded,
        failed=failed,
    )

    return BatchScoreResponse(
        total=len(req.assessments),
        succeeded=succeeded,
        failed=failed,
        results=results,
    )
