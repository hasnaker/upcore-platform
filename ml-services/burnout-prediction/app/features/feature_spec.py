"""Canonical feature specification for burnout prediction model.

Defines the 42 engineered features, their types, valid ranges,
and source tables. The feature schema hash is embedded in every
model card for reproducibility.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class FeatureDefinition:
    """Definition of a single feature in the burnout model."""

    name: str
    dtype: Literal["float32", "int32", "bool"]
    min_value: float
    max_value: float
    source_table: str
    description_tr: str
    imputation_strategy: Literal["forward_fill", "tenant_median", "global_median", "zero"]


# Canonical list of 42 features used by the burnout LSTM model
FEATURE_SPEC: list[FeatureDefinition] = [
    FeatureDefinition("bat_exhaustion_mean", "float32", 1.0, 5.0, "bat_scores", "BAT tukenmislik ortalaması", "forward_fill"),
    FeatureDefinition("bat_exhaustion_slope_30d", "float32", -2.0, 2.0, "bat_scores", "BAT tukenmislik 30 gunluk egilimi", "zero"),
    FeatureDefinition("bat_exhaustion_volatility", "float32", 0.0, 3.0, "bat_scores", "BAT tukenmislik volatilitesi", "zero"),
    FeatureDefinition("bat_distance_mean", "float32", 1.0, 5.0, "bat_scores", "BAT mesafelesme ortalaması", "forward_fill"),
    FeatureDefinition("bat_distance_slope_30d", "float32", -2.0, 2.0, "bat_scores", "BAT mesafelesme 30 gunluk egilimi", "zero"),
    FeatureDefinition("bat_cognitive_mean", "float32", 1.0, 5.0, "bat_scores", "BAT bilissel bozulma ortalaması", "forward_fill"),
    FeatureDefinition("bat_emotional_mean", "float32", 1.0, 5.0, "bat_scores", "BAT duygusal bozulma ortalaması", "forward_fill"),
    FeatureDefinition("bat_composite", "float32", 1.0, 5.0, "bat_scores", "BAT bilesik skor", "forward_fill"),
    FeatureDefinition("copsoq_workload_mean", "float32", 0.0, 100.0, "copsoq_scores", "COPSOQ is yuku ortalaması", "tenant_median"),
    FeatureDefinition("copsoq_workload_slope_30d", "float32", -50.0, 50.0, "copsoq_scores", "COPSOQ is yuku egilimi", "zero"),
    FeatureDefinition("copsoq_autonomy_mean", "float32", 0.0, 100.0, "copsoq_scores", "COPSOQ ozerklik ortalaması", "tenant_median"),
    FeatureDefinition("copsoq_social_support", "float32", 0.0, 100.0, "copsoq_scores", "COPSOQ sosyal destek", "tenant_median"),
    FeatureDefinition("copsoq_recognition", "float32", 0.0, 100.0, "copsoq_scores", "COPSOQ tanınma skoru", "tenant_median"),
    FeatureDefinition("jdr_balance_ratio", "float32", 0.0, 5.0, "jdr_scores", "JD-R denge oranı (kaynaklar/talepler)", "tenant_median"),
    FeatureDefinition("jdr_demands_total", "float32", 0.0, 100.0, "jdr_scores", "JD-R toplam talepler", "tenant_median"),
    FeatureDefinition("jdr_resources_total", "float32", 0.0, 100.0, "jdr_scores", "JD-R toplam kaynaklar", "tenant_median"),
    FeatureDefinition("engagement_score", "float32", 0.0, 1.0, "engagement", "Baglilik skoru", "tenant_median"),
    FeatureDefinition("engagement_trend_30d", "float32", -1.0, 1.0, "engagement", "Baglilik 30 gunluk trend", "zero"),
    FeatureDefinition("absence_days_30d", "int32", 0, 30, "hr_attendance", "Son 30 gun devamsizlik", "zero"),
    FeatureDefinition("absence_days_90d", "int32", 0, 90, "hr_attendance", "Son 90 gun devamsizlik", "zero"),
    FeatureDefinition("overtime_hours_30d", "float32", 0.0, 200.0, "hr_attendance", "Son 30 gun fazla mesai (saat)", "zero"),
    FeatureDefinition("overtime_ratio", "float32", 0.0, 3.0, "hr_attendance", "Fazla mesai oranı", "zero"),
    FeatureDefinition("meeting_load_hours_week", "float32", 0.0, 60.0, "calendar_events", "Haftalik toplanti yuku (saat)", "tenant_median"),
    FeatureDefinition("after_hours_activity", "float32", 0.0, 1.0, "activity_logs", "Mesai disi aktivite oranı", "zero"),
    FeatureDefinition("manager_1on1_days_since", "int32", 0, 365, "meetings", "Son yonetici gorusmesinden bu yana gun", "global_median"),
    FeatureDefinition("peer_interaction_count", "int32", 0, 500, "interactions", "Akran etkilesim sayısı", "tenant_median"),
    FeatureDefinition("recognition_events_30d", "int32", 0, 50, "recognition", "Son 30 gun takdir olayı", "zero"),
    FeatureDefinition("role_change_flag", "bool", 0, 1, "hr_events", "Son 90 gunde rol degisikligi", "zero"),
    FeatureDefinition("tenure_months", "int32", 0, 600, "employees", "Kidem (ay)", "forward_fill"),
    FeatureDefinition("team_size", "int32", 1, 500, "teams", "Takım buyuklugu", "tenant_median"),
    FeatureDefinition("span_of_control", "int32", 0, 100, "org_structure", "Yonetim alani", "zero"),
    FeatureDefinition("survey_response_latency", "float32", 0.0, 168.0, "surveys", "Anket yanit suresi (saat)", "tenant_median"),
    FeatureDefinition("survey_completion_rate", "float32", 0.0, 1.0, "surveys", "Anket tamamlama oranı", "tenant_median"),
    FeatureDefinition("psycap_composite", "float32", 0.0, 1.0, "psycap_scores", "PsyCap bilesik skor", "tenant_median"),
    FeatureDefinition("psycap_efficacy", "float32", 0.0, 1.0, "psycap_scores", "PsyCap oz-yeterlilik", "tenant_median"),
    FeatureDefinition("psycap_resilience", "float32", 0.0, 1.0, "psycap_scores", "PsyCap dayaniklilik", "tenant_median"),
    FeatureDefinition("psycap_hope", "float32", 0.0, 1.0, "psycap_scores", "PsyCap umut", "tenant_median"),
    FeatureDefinition("psycap_optimism", "float32", 0.0, 1.0, "psycap_scores", "PsyCap iyimserlik", "tenant_median"),
    FeatureDefinition("leave_balance_ratio", "float32", 0.0, 2.0, "hr_leave", "Izin bakiyesi oranı", "tenant_median"),
    FeatureDefinition("training_hours_30d", "float32", 0.0, 80.0, "training", "Son 30 gun egitim saati", "zero"),
    FeatureDefinition("negative_events_90d", "int32", 0, 20, "hr_events", "Son 90 gun olumsuz olay", "zero"),
    FeatureDefinition("positive_events_90d", "int32", 0, 20, "hr_events", "Son 90 gun olumlu olay", "zero"),
]

FEATURE_NAMES: list[str] = [f.name for f in FEATURE_SPEC]
FEATURE_COUNT: int = len(FEATURE_SPEC)

# Turkish labels for SHAP explanations
FEATURE_LABELS_TR: dict[str, str] = {f.name: f.description_tr for f in FEATURE_SPEC}


def compute_schema_hash() -> str:
    """Compute deterministic hash of the feature schema for model card embedding."""
    schema_json = json.dumps(
        [{"name": f.name, "dtype": f.dtype, "min": f.min_value, "max": f.max_value} for f in FEATURE_SPEC],
        sort_keys=True,
    )
    return hashlib.sha256(schema_json.encode()).hexdigest()[:16]


def validate_feature_values(features: dict[str, float]) -> list[str]:
    """Validate feature values against spec ranges. Returns list of warnings."""
    warnings: list[str] = []
    spec_map = {f.name: f for f in FEATURE_SPEC}
    for name, value in features.items():
        if name in spec_map:
            spec = spec_map[name]
            if value < spec.min_value or value > spec.max_value:
                warnings.append(
                    f"Feature '{name}' value {value} outside range [{spec.min_value}, {spec.max_value}]"
                )
    return warnings
