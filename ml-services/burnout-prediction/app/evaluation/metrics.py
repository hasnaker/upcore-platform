"""Evaluation metrics for burnout prediction models.

Comprehensive metrics suite used during training and promotion gates.
"""

from __future__ import annotations

import numpy as np
import structlog

logger = structlog.get_logger()


def compute_auroc(y_true: np.ndarray, y_scores: np.ndarray) -> float:
    """Compute Area Under the ROC Curve using the trapezoidal rule.

    Args:
        y_true: Binary labels, shape (n,).
        y_scores: Predicted probabilities, shape (n,).

    Returns:
        AUROC value in [0, 1].
    """
    if len(y_true) == 0:
        return 0.0

    # Sort by score descending
    sorted_indices = np.argsort(-y_scores)
    y_sorted = y_true[sorted_indices]

    n_pos = np.sum(y_true == 1)
    n_neg = np.sum(y_true == 0)

    if n_pos == 0 or n_neg == 0:
        return 0.0

    tpr_prev = 0.0
    fpr_prev = 0.0
    auc = 0.0
    tp = 0
    fp = 0

    for i in range(len(y_sorted)):
        if y_sorted[i] == 1:
            tp += 1
        else:
            fp += 1

        tpr = tp / n_pos
        fpr = fp / n_neg

        # Trapezoidal rule
        auc += (fpr - fpr_prev) * (tpr + tpr_prev) / 2
        tpr_prev = tpr
        fpr_prev = fpr

    return float(auc)


def compute_auprc(y_true: np.ndarray, y_scores: np.ndarray) -> float:
    """Compute Area Under the Precision-Recall Curve.

    Args:
        y_true: Binary labels.
        y_scores: Predicted probabilities.

    Returns:
        AUPRC value in [0, 1].
    """
    if len(y_true) == 0:
        return 0.0

    sorted_indices = np.argsort(-y_scores)
    y_sorted = y_true[sorted_indices]

    n_pos = np.sum(y_true == 1)
    if n_pos == 0:
        return 0.0

    tp = 0
    fp = 0
    precisions: list[float] = []
    recalls: list[float] = []

    for i in range(len(y_sorted)):
        if y_sorted[i] == 1:
            tp += 1
        else:
            fp += 1

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / n_pos

        precisions.append(precision)
        recalls.append(recall)

    # Compute area using trapezoidal rule
    auprc = 0.0
    for i in range(1, len(recalls)):
        auprc += (recalls[i] - recalls[i - 1]) * (precisions[i] + precisions[i - 1]) / 2

    return float(auprc)


def sensitivity_at_specificity(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    target_specificity: float = 0.90,
) -> float:
    """Compute sensitivity (recall) at a given specificity level.

    Args:
        y_true: Binary labels.
        y_scores: Predicted probabilities.
        target_specificity: Target specificity threshold.

    Returns:
        Sensitivity at the given specificity.
    """
    if len(y_true) == 0:
        return 0.0

    thresholds = np.linspace(0, 1, 1000)
    best_sensitivity = 0.0

    for threshold in thresholds:
        predicted = (y_scores >= threshold).astype(int)
        tp = np.sum((predicted == 1) & (y_true == 1))
        tn = np.sum((predicted == 0) & (y_true == 0))
        fp = np.sum((predicted == 1) & (y_true == 0))
        fn = np.sum((predicted == 0) & (y_true == 1))

        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0

        if specificity >= target_specificity:
            best_sensitivity = max(best_sensitivity, sensitivity)

    return best_sensitivity


def compute_all_metrics(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    horizon: int,
) -> dict[str, float]:
    """Compute all evaluation metrics for a single horizon.

    Args:
        y_true: Binary labels.
        y_scores: Predicted probabilities.
        horizon: Prediction horizon (for labeling).

    Returns:
        Dict of metric name to value.
    """
    from app.inference.calibration import compute_brier, compute_ece

    return {
        f"auroc_{horizon}d": compute_auroc(y_true, y_scores),
        f"auprc_{horizon}d": compute_auprc(y_true, y_scores),
        f"brier_{horizon}d": compute_brier(y_scores, y_true),
        f"ece_{horizon}d": compute_ece(y_scores, y_true),
        f"sensitivity_at_spec90_{horizon}d": sensitivity_at_specificity(y_true, y_scores, 0.90),
    }
