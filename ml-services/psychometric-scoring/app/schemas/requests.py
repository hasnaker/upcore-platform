"""Unified request schemas re-export.

Individual instrument request schemas live in their own modules;
this module re-exports them and defines the batch request.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.base import TenantScopedRequest
from app.schemas.bat import BATScoreRequest
from app.schemas.copsoq import COPSOQScoreRequest
from app.schemas.jdr import JDRScoreRequest
from app.schemas.strengths import StrengthsScoreRequest
from app.schemas.upcap import UpCapScoreRequest

InstrumentType = Literal["bat12", "jdr", "upcap", "copsoq", "strengths"]


class BatchAssessmentItem(BaseModel):
    """A single assessment within a batch request."""

    model_config = ConfigDict(extra="forbid")

    instrument: InstrumentType
    payload: dict[str, object] = Field(
        description="Instrument-specific request payload (validated per instrument)"
    )


class BatchScoreRequest(TenantScopedRequest):
    """Batch scoring request — up to 500 assessments."""

    assessments: list[BatchAssessmentItem] = Field(
        max_length=500,
        description="Array of assessments to score",
    )


__all__ = [
    "BATScoreRequest",
    "BatchAssessmentItem",
    "BatchScoreRequest",
    "COPSOQScoreRequest",
    "InstrumentType",
    "JDRScoreRequest",
    "StrengthsScoreRequest",
    "UpCapScoreRequest",
]
