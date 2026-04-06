"""Action candidate builder from signal bundles.

Converts SignalBundles into ActionCandidates based on action-type templates.
Each signal pattern maps to one or more potential actions.
"""

from __future__ import annotations

from app.schemas.actions import ActionCandidate, ActionType, SignalBundle
from app.utils.pii_masking import mask_name


def build_candidates(bundles: list[SignalBundle]) -> list[ActionCandidate]:
    """Convert signal bundles to action candidates.

    Applies rule-based candidate generation per action type.

    Args:
        bundles: Aggregated signal bundles per employee.

    Returns:
        List of action candidates across all employees.
    """
    candidates: list[ActionCandidate] = []

    for bundle in bundles:
        masked_name = bundle.target_name or mask_name("")

        # SCHEDULE_1ON1: triggered by high burnout or no recent 1:1
        if bundle.burnout_band in ("RED", "AMBER") or bundle.days_since_1on1 > 21:
            candidates.append(_build_1on1_candidate(bundle, masked_name))

        # WORKLOAD_REVIEW: triggered by high overtime or workload drivers
        if bundle.overtime_hours_30d > 20 or "copsoq_workload_mean" in bundle.top_drivers:
            candidates.append(_build_workload_review_candidate(bundle, masked_name))

        # RECOGNITION: triggered by low engagement and no recent recognition
        if bundle.engagement_score < 0.4:
            candidates.append(_build_recognition_candidate(bundle, masked_name))

        # WELLBEING_CHECKIN: triggered by RED band or rapid worsening
        if bundle.burnout_band == "RED" or bundle.bat_exhaustion_slope > 0.5:
            candidates.append(_build_wellbeing_checkin_candidate(bundle, masked_name))

        # TRAINING_NUDGE: for AMBER employees with development potential
        if bundle.burnout_band == "AMBER" and bundle.engagement_score > 0.3:
            candidates.append(_build_training_nudge_candidate(bundle, masked_name))

        # ESCALATE_TO_HR: RED band with multiple risk factors
        if bundle.burnout_band == "RED" and bundle.bat_exhaustion_slope > 0.5:
            candidates.append(_build_escalate_candidate(bundle, masked_name))

    return candidates


def _build_1on1_candidate(bundle: SignalBundle, masked_name: str) -> ActionCandidate:
    return ActionCandidate(
        action_type=ActionType.SCHEDULE_1ON1,
        target_id=bundle.target_id,
        target_name_masked=masked_name,
        title_tr=f"{masked_name} ile 1:1 gorusme planla",
        title_en=f"Schedule 1:1 with {masked_name}",
        severity_band=bundle.burnout_band,
        days_until_horizon=30,
        trend_slope=bundle.bat_exhaustion_slope,
        effect_size=0.35,
        n_affected=1,
        time_required_hours=0.5,
        authority_level="self",
        budget_tier="free",
        supporting_signals=[
            f"burnout_30d={bundle.burnout_30d:.2f}",
            f"days_since_1on1={bundle.days_since_1on1}",
        ],
        cta_href=f"/team/{bundle.target_id}/1on1/new",
    )


def _build_workload_review_candidate(bundle: SignalBundle, masked_name: str) -> ActionCandidate:
    return ActionCandidate(
        action_type=ActionType.WORKLOAD_REVIEW,
        target_id=bundle.target_id,
        target_name_masked=masked_name,
        title_tr=f"{masked_name} icin is yuku degerlendirmesi",
        title_en=f"Workload review for {masked_name}",
        severity_band=bundle.burnout_band,
        days_until_horizon=30,
        trend_slope=bundle.bat_exhaustion_slope,
        effect_size=0.40,
        n_affected=1,
        time_required_hours=1.0,
        authority_level="team_lead",
        budget_tier="free",
        supporting_signals=[
            f"overtime={bundle.overtime_hours_30d:.0f}h",
            f"burnout_30d={bundle.burnout_30d:.2f}",
        ],
        cta_href=f"/team/{bundle.target_id}/workload",
    )


def _build_recognition_candidate(bundle: SignalBundle, masked_name: str) -> ActionCandidate:
    return ActionCandidate(
        action_type=ActionType.RECOGNITION,
        target_id=bundle.target_id,
        target_name_masked=masked_name,
        title_tr=f"{masked_name} icin takdir goster",
        title_en=f"Recognize {masked_name}",
        severity_band=bundle.burnout_band,
        days_until_horizon=60,
        trend_slope=0.0,
        effect_size=0.20,
        n_affected=1,
        time_required_hours=0.25,
        authority_level="self",
        budget_tier="free",
        supporting_signals=[f"engagement={bundle.engagement_score:.2f}"],
        cta_href=f"/recognition/new?employee={bundle.target_id}",
    )


def _build_wellbeing_checkin_candidate(bundle: SignalBundle, masked_name: str) -> ActionCandidate:
    return ActionCandidate(
        action_type=ActionType.WELLBEING_CHECKIN,
        target_id=bundle.target_id,
        target_name_masked=masked_name,
        title_tr=f"{masked_name} ile iyilik hali kontrolu",
        title_en=f"Wellbeing check-in with {masked_name}",
        severity_band=bundle.burnout_band,
        days_until_horizon=14,
        trend_slope=bundle.bat_exhaustion_slope,
        effect_size=0.30,
        n_affected=1,
        time_required_hours=0.5,
        authority_level="self",
        budget_tier="free",
        supporting_signals=[
            f"burnout_30d={bundle.burnout_30d:.2f}",
            f"slope={bundle.bat_exhaustion_slope:.2f}",
        ],
        cta_href=f"/team/{bundle.target_id}/wellbeing",
    )


def _build_training_nudge_candidate(bundle: SignalBundle, masked_name: str) -> ActionCandidate:
    return ActionCandidate(
        action_type=ActionType.TRAINING_NUDGE,
        target_id=bundle.target_id,
        target_name_masked=masked_name,
        title_tr=f"{masked_name} icin gelisim onerisi",
        title_en=f"Training suggestion for {masked_name}",
        severity_band=bundle.burnout_band,
        days_until_horizon=60,
        trend_slope=0.0,
        effect_size=0.25,
        n_affected=1,
        time_required_hours=2.0,
        authority_level="self",
        budget_tier="low",
        supporting_signals=[f"engagement={bundle.engagement_score:.2f}"],
        cta_href=f"/training/recommend?employee={bundle.target_id}",
    )


def _build_escalate_candidate(bundle: SignalBundle, masked_name: str) -> ActionCandidate:
    return ActionCandidate(
        action_type=ActionType.ESCALATE_TO_HR,
        target_id=bundle.target_id,
        target_name_masked=masked_name,
        title_tr=f"{masked_name} icin HR yonlendirmesi",
        title_en=f"Escalate {masked_name} to HR",
        severity_band="RED",
        days_until_horizon=7,
        trend_slope=bundle.bat_exhaustion_slope,
        effect_size=0.50,
        n_affected=1,
        time_required_hours=0.5,
        authority_level="hr",
        budget_tier="free",
        supporting_signals=[
            f"burnout_30d={bundle.burnout_30d:.2f}",
            f"slope={bundle.bat_exhaustion_slope:.2f}",
            f"band={bundle.burnout_band}",
        ],
        cta_href=f"/hr/escalate/{bundle.target_id}",
    )
