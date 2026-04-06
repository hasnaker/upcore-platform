"""SHAP-based explanation module for burnout predictions.

For V1 (heuristic_v0.1): uses weight-based pseudo-SHAP.
When LSTM is active: will use SHAP DeepExplainer.

Model type: heuristic_v0.1 (pseudo-SHAP via feature weights)
"""

from __future__ import annotations

import structlog

from app.features.feature_spec import FEATURE_LABELS_TR

logger = structlog.get_logger()


def explain_single(
    feature_values: dict[str, float],
    feature_contributions: list[dict[str, float | str]],
    k: int = 5,
) -> list[dict[str, str | float]]:
    """Generate human-readable explanation for a single prediction.

    Args:
        feature_values: Actual feature values for this employee.
        feature_contributions: Pre-computed contributions (from predictor).
        k: Number of top features to include.

    Returns:
        List of explanation dicts with feature, shap, direction, label_tr, value.
    """
    explanations: list[dict[str, str | float]] = []

    for contrib in feature_contributions[:k]:
        feature_name = str(contrib["feature"])
        explanations.append({
            "feature": feature_name,
            "shap": contrib["shap"],
            "direction": contrib["direction"],
            "label_tr": FEATURE_LABELS_TR.get(feature_name, feature_name),
            "actual_value": feature_values.get(feature_name, 0.0),
        })

    return explanations


def generate_explanation_text_tr(
    explanations: list[dict[str, str | float]],
    probability: float,
    horizon: int,
) -> str:
    """Generate Turkish-language explanation text.

    Heuristic v0.1: template-based explanation generation.

    Args:
        explanations: Top feature explanations.
        probability: Predicted burnout probability.
        horizon: Prediction horizon in days.

    Returns:
        Turkish explanation text.
    """
    if not explanations:
        return f"{horizon} gunluk tukenmislik riski: %{probability * 100:.0f}."

    top_feature = explanations[0]
    label = top_feature.get("label_tr", top_feature["feature"])
    direction = top_feature["direction"]

    direction_text = "artiran" if direction == "positive" else "azaltan"

    lines = [
        f"{horizon} gunluk tukenmislik riski: %{probability * 100:.0f}.",
        f"En onemli faktor: {label} (riski {direction_text}).",
    ]

    if len(explanations) >= 2:
        second = explanations[1]
        second_label = second.get("label_tr", second["feature"])
        lines.append(f"Ikinci faktor: {second_label}.")

    return " ".join(lines)


def build_explanation_cache_key(tenant_id: str, employee_id: str) -> str:
    """Build Redis cache key for stored explanations."""
    return f"explain:{tenant_id}:{employee_id}:latest"
