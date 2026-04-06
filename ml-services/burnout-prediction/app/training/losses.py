"""Loss functions for burnout prediction training.

Implements Focal Loss for class-imbalanced burnout detection
(~12% positive rate) and multi-horizon loss aggregation.

Lin et al. (2017): "Focal Loss for Dense Object Detection"
Adapted for binary classification in burnout context.
"""

from __future__ import annotations

import numpy as np
import structlog

logger = structlog.get_logger()


def focal_loss(
    y_pred: np.ndarray,
    y_true: np.ndarray,
    gamma: float = 2.0,
    alpha: float = 0.25,
) -> float:
    """Compute Focal Loss for binary classification.

    FL(p_t) = -alpha_t * (1 - p_t)^gamma * log(p_t)

    Where p_t = p if y=1, else 1-p.

    Args:
        y_pred: Predicted probabilities, shape (n,).
        y_true: Binary labels, shape (n,).
        gamma: Focusing parameter (higher = more focus on hard examples).
        alpha: Balancing factor for positive class.

    Returns:
        Mean focal loss value.
    """
    eps = 1e-7
    y_pred = np.clip(y_pred, eps, 1 - eps)

    # p_t: probability of the true class
    p_t = np.where(y_true == 1, y_pred, 1 - y_pred)
    alpha_t = np.where(y_true == 1, alpha, 1 - alpha)

    # Focal loss
    loss = -alpha_t * ((1 - p_t) ** gamma) * np.log(p_t)

    return float(np.mean(loss))


def multi_horizon_loss(
    predictions: dict[int, np.ndarray],
    targets: dict[int, np.ndarray],
    horizon_weights: dict[int, float] | None = None,
    gamma: float = 2.0,
    alpha: float = 0.25,
) -> float:
    """Compute weighted multi-horizon focal loss.

    Loss = sum_h (w_h * FocalLoss(pred_h, target_h))

    Default weights: {30: 1.0, 60: 0.8, 90: 0.6} — near-term
    predictions are weighted more heavily.

    Args:
        predictions: Dict of horizon -> predicted probabilities.
        targets: Dict of horizon -> binary labels.
        horizon_weights: Optional per-horizon weights.
        gamma: Focal loss gamma parameter.
        alpha: Focal loss alpha parameter.

    Returns:
        Weighted total loss.
    """
    if horizon_weights is None:
        horizon_weights = {30: 1.0, 60: 0.8, 90: 0.6}

    total_loss = 0.0
    total_weight = 0.0

    for horizon, pred in predictions.items():
        if horizon not in targets:
            continue

        weight = horizon_weights.get(horizon, 0.5)
        loss = focal_loss(pred, targets[horizon], gamma=gamma, alpha=alpha)
        total_loss += weight * loss
        total_weight += weight

    if total_weight == 0:
        return 0.0

    return total_loss / total_weight


def label_smoothed_bce(
    y_pred: np.ndarray,
    y_true: np.ndarray,
    smoothing: float = 0.1,
) -> float:
    """Compute label-smoothed binary cross-entropy loss.

    Fallback loss when focal loss causes training instability.

    Args:
        y_pred: Predicted probabilities.
        y_true: Binary labels.
        smoothing: Label smoothing factor.

    Returns:
        Mean smoothed BCE loss.
    """
    eps = 1e-7
    y_pred = np.clip(y_pred, eps, 1 - eps)

    # Smooth labels: y_smooth = y * (1 - smoothing) + smoothing / 2
    y_smooth = y_true * (1 - smoothing) + smoothing / 2

    loss = -(y_smooth * np.log(y_pred) + (1 - y_smooth) * np.log(1 - y_pred))
    return float(np.mean(loss))
