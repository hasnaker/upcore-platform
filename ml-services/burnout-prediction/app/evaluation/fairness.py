"""Fairness evaluation metrics for burnout prediction.

Measures demographic parity, equal opportunity, and predictive parity
across protected groups (gender, tenure band, department tier).

Tolerance: demographic parity difference <= 0.10.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import structlog

logger = structlog.get_logger()


@dataclass
class GroupMetrics:
    """Metrics for a single demographic group."""

    group_name: str
    group_value: str
    auroc: float
    positive_rate: float
    true_positive_rate: float
    sample_count: int


def compute_demographic_parity(
    predictions: np.ndarray,
    group_labels: np.ndarray,
    threshold: float = 0.5,
) -> dict[str, float]:
    """Compute demographic parity (positive prediction rate per group).

    Demographic parity requires equal positive prediction rates across groups.

    Args:
        predictions: Predicted probabilities, shape (n,).
        group_labels: Group membership labels, shape (n,).
        threshold: Classification threshold.

    Returns:
        Dict of group label to positive prediction rate.
    """
    binary_preds = (predictions >= threshold).astype(int)
    unique_groups = np.unique(group_labels)

    rates: dict[str, float] = {}
    for group in unique_groups:
        mask = group_labels == group
        group_preds = binary_preds[mask]
        rate = float(np.mean(group_preds)) if len(group_preds) > 0 else 0.0
        rates[str(group)] = rate

    return rates


def compute_equal_opportunity(
    predictions: np.ndarray,
    labels: np.ndarray,
    group_labels: np.ndarray,
    threshold: float = 0.5,
) -> dict[str, float]:
    """Compute equal opportunity (TPR per group among positive cases).

    Equal opportunity requires equal true positive rates across groups.

    Args:
        predictions: Predicted probabilities.
        labels: True binary labels.
        group_labels: Group membership labels.
        threshold: Classification threshold.

    Returns:
        Dict of group label to true positive rate.
    """
    binary_preds = (predictions >= threshold).astype(int)
    unique_groups = np.unique(group_labels)

    tpr_per_group: dict[str, float] = {}
    for group in unique_groups:
        mask = (group_labels == group) & (labels == 1)
        if np.sum(mask) == 0:
            tpr_per_group[str(group)] = 0.0
            continue
        tp = np.sum(binary_preds[mask] == 1)
        tpr_per_group[str(group)] = float(tp / np.sum(mask))

    return tpr_per_group


def compute_per_group_auroc(
    predictions: np.ndarray,
    labels: np.ndarray,
    group_labels: np.ndarray,
) -> dict[str, float]:
    """Compute AUROC per demographic group.

    Args:
        predictions: Predicted probabilities.
        labels: True binary labels.
        group_labels: Group membership labels.

    Returns:
        Dict of group label to AUROC.
    """
    from app.evaluation.metrics import compute_auroc

    unique_groups = np.unique(group_labels)
    auroc_per_group: dict[str, float] = {}

    for group in unique_groups:
        mask = group_labels == group
        group_preds = predictions[mask]
        group_labels_sub = labels[mask]

        if len(np.unique(group_labels_sub)) < 2:
            auroc_per_group[str(group)] = 0.0
            continue

        auroc_per_group[str(group)] = compute_auroc(group_labels_sub, group_preds)

    return auroc_per_group


def generate_fairness_report(
    predictions: np.ndarray,
    labels: np.ndarray,
    groups: dict[str, np.ndarray],
    tolerance: float = 0.10,
) -> dict:
    """Generate comprehensive fairness report across all group dimensions.

    Args:
        predictions: Predicted probabilities.
        labels: True binary labels.
        groups: Dict of group dimension name to group labels array.
        tolerance: Maximum allowed demographic parity difference.

    Returns:
        Full fairness report dict.
    """
    report: dict = {
        "group_results": [],
        "max_parity_diff": 0.0,
        "passes_gate": True,
    }

    for group_name, group_labels in groups.items():
        parity = compute_demographic_parity(predictions, group_labels)
        opportunity = compute_equal_opportunity(predictions, labels, group_labels)
        aurocs = compute_per_group_auroc(predictions, labels, group_labels)

        rates = list(parity.values())
        parity_diff = max(rates) - min(rates) if rates else 0.0

        if parity_diff > report["max_parity_diff"]:
            report["max_parity_diff"] = parity_diff

        if parity_diff > tolerance:
            report["passes_gate"] = False

        for group_val in parity:
            report["group_results"].append({
                "group_name": group_name,
                "group_value": group_val,
                "positive_rate": parity[group_val],
                "tpr": opportunity.get(group_val, 0.0),
                "auroc": aurocs.get(group_val, 0.0),
            })

    logger.info(
        "fairness_report_generated",
        max_parity_diff=report["max_parity_diff"],
        passes_gate=report["passes_gate"],
    )

    return report
