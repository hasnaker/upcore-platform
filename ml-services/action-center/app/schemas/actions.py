"""Action type definitions and internal data models."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Literal
from uuid import UUID


class ActionType(str, Enum):
    """Supported action types in the action center."""

    SCHEDULE_1ON1 = "SCHEDULE_1ON1"
    WORKLOAD_REVIEW = "WORKLOAD_REVIEW"
    RECOGNITION = "RECOGNITION"
    TRAINING_NUDGE = "TRAINING_NUDGE"
    WELLBEING_CHECKIN = "WELLBEING_CHECKIN"
    TEAM_PULSE = "TEAM_PULSE"
    POLICY_REVIEW = "POLICY_REVIEW"
    ESCALATE_TO_HR = "ESCALATE_TO_HR"


@dataclass
class SignalBundle:
    """Aggregated signals for a single target (employee/team)."""

    target_id: UUID
    target_name: str = ""
    burnout_30d: float = 0.0
    burnout_60d: float = 0.0
    burnout_90d: float = 0.0
    burnout_band: str = "GREEN"
    top_drivers: list[str] = field(default_factory=list)
    bat_exhaustion_slope: float = 0.0
    engagement_score: float = 0.5
    absence_days_30d: int = 0
    overtime_hours_30d: float = 0.0
    days_since_1on1: int = 14
    recommendation_ids: list[str] = field(default_factory=list)


@dataclass
class ActionCandidate:
    """An action candidate before scoring and filtering."""

    action_type: ActionType
    target_id: UUID
    target_name_masked: str  # PII-masked name, e.g. "A. Y."
    title_tr: str
    title_en: str
    severity_band: str  # GREEN, AMBER, RED
    days_until_horizon: int = 30
    trend_slope: float = 0.0
    effect_size: float = 0.3
    n_affected: int = 1
    time_required_hours: float = 0.5
    authority_level: str = "self"  # self, team_lead, hr
    budget_tier: str = "free"
    supporting_signals: list[str] = field(default_factory=list)
    cta_href: str = ""


@dataclass
class RankedAction:
    """Action with computed priority scores."""

    candidate: ActionCandidate
    urgency: float = 0.0
    impact: float = 0.0
    actionability: float = 0.0
    user_relevance: float = 1.0
    priority_score: float = 0.0
    rationale_tr: str = ""


@dataclass
class SafetyResult:
    """Result of LLM rationale safety check."""

    passed: bool
    issues: list[str] = field(default_factory=list)
    original_text: str = ""
    sanitized_text: str = ""


@dataclass
class UserHistory:
    """User interaction history for relevance computation."""

    dismiss_count_30d: int = 0
    complete_count_30d: int = 0
    snooze_count_30d: int = 0
    last_dismissed_action_types: list[str] = field(default_factory=list)
