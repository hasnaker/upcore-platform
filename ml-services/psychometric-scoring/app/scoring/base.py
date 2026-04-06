"""Abstract base scorer providing shared infrastructure for all instruments."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from app.schemas.common import (
    CalibrationStatus,
    ConfidenceLevel,
    ReliabilityInfo,
    ScoringMetadata,
    TrafficLight,
)


@dataclass
class ScoringResult:
    """Generic container for scoring output, used internally before mapping to Pydantic."""

    instrument: str
    subscale_scores: dict[str, float]
    total_score: float | None = None
    classifications: dict[str, TrafficLight] = field(default_factory=dict)
    percentiles: dict[str, int] = field(default_factory=dict)
    reliability: ReliabilityInfo | None = None
    extra: dict[str, Any] = field(default_factory=dict)
    scored_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class BaseScorer(ABC):
    """Template scorer — subclass per instrument."""

    instrument_id: str
    n_items: int
    min_val: int
    max_val: int

    @abstractmethod
    def validate_responses(self, responses: dict[str, int]) -> dict[str, int]:
        """Validate and optionally impute missing items. Raises InvalidResponseError."""
        ...

    @abstractmethod
    def compute_subscales(self, responses: dict[str, int]) -> dict[str, float]:
        """Return subscale scores from validated responses."""
        ...

    @abstractmethod
    def classify(
        self, subscale_scores: dict[str, float], cutoffs: dict[str, dict[str, float]]
    ) -> dict[str, TrafficLight]:
        """Return traffic-light classification per subscale."""
        ...

    def build_metadata(
        self,
        norm_version: str,
        confidence: ConfidenceLevel,
        calibration_status: CalibrationStatus,
        notes: str | None = None,
    ) -> ScoringMetadata:
        """Construct scoring metadata block."""
        from app import __version__

        return ScoringMetadata(
            service_version=__version__,
            scored_at=datetime.now(UTC),
            scorer=self.instrument_id,
            norm_version=norm_version,
            confidence=confidence,
            calibration_status=calibration_status,
            notes=notes,
        )
