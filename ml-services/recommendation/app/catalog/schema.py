"""Catalog schema definitions."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class InterventionRecord(BaseModel):
    """Database record for an intervention."""

    id: UUID
    title_tr: str
    title_en: str
    description_tr: str = ""
    description_en: str = ""
    evidence_tier: Literal["A", "B", "C"] = "C"
    target_drivers: list[str] = Field(default_factory=list)
    target_burnout_band: list[str] = Field(default_factory=list)
    delivery_mode: str = "async"
    expected_effect_size: float = 0.0
    time_to_effect_weeks: int = 4
    cost_tier: str = "low"
    citations: list[str] = Field(default_factory=list)
    active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None
