"""Internal data models for recommendation service."""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID


@dataclass
class SearchHit:
    """Result from pgvector similarity search."""

    intervention_id: UUID
    similarity: float
    title_tr: str = ""
    title_en: str = ""
    evidence_tier: str = "C"
    metadata: dict = field(default_factory=dict)


@dataclass
class CaseHit:
    """A historical case retrieved via CBR."""

    case_id: UUID
    employee_embedding_similarity: float
    intervention_id: UUID
    outcome_success: bool | None = None
    pre_bat: float = 0.0
    post_bat: float = 0.0
    days_elapsed: int = 0


@dataclass
class HistoricalCase:
    """Full historical case record."""

    case_id: UUID
    tenant_id: UUID
    employee_id: UUID
    intervention_id: UUID
    burnout_band: str
    top_drivers: list[str]
    outcome_success: bool | None
    bat_delta: float = 0.0
    similarity: float = 0.0


@dataclass
class WeightedCase:
    """Case with outcome-weighted score."""

    case: HistoricalCase
    weight: float


@dataclass
class Candidate:
    """Intervention candidate before final ranking."""

    intervention_id: UUID
    title_tr: str
    title_en: str
    evidence_tier: str
    similarity: float
    thompson_sample: float
    cbr_score: float
    recency_factor: float
    expected_effect_size: float
    time_to_effect_weeks: int
    delivery_mode: str
    source_case_ids: list[str] = field(default_factory=list)
    rationale_tr: str = ""


@dataclass
class RankedRecommendation:
    """Final ranked recommendation."""

    candidate: Candidate
    final_score: float
