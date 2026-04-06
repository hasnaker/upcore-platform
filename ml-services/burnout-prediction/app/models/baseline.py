"""Baseline comparator models for burnout prediction.

Logistic regression and LightGBM baselines that must be outperformed
by the LSTM model on AUROC before promotion to production.

Model type: baseline comparators (not used in heuristic_v0.1 inference)
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import structlog

from app.schemas.internal import PromotionDecision

logger = structlog.get_logger()


@dataclass
class BaselineResult:
    """Result of baseline model evaluation."""

    model_name: str
    auroc: float
    auprc: float
    brier_score: float


def train_lr_baseline(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
) -> BaselineResult:
    """Train logistic regression baseline and evaluate.

    For V1 (heuristic_v0.1): returns placeholder metrics.
    Will use sklearn.linear_model.LogisticRegression when training data exists.

    Args:
        X_train: Training features.
        y_train: Training labels.
        X_val: Validation features.
        y_val: Validation labels.

    Returns:
        BaselineResult with evaluation metrics.
    """
    logger.info("training_lr_baseline", n_train=len(y_train), n_val=len(y_val))

    # Placeholder for V1 — actual training requires sufficient data
    return BaselineResult(
        model_name="logistic_regression",
        auroc=0.0,
        auprc=0.0,
        brier_score=1.0,
    )


def train_lgbm_baseline(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
) -> BaselineResult:
    """Train LightGBM baseline and evaluate.

    For V1 (heuristic_v0.1): returns placeholder metrics.
    Will use lightgbm.LGBMClassifier when training data exists.

    Args:
        X_train: Training features.
        y_train: Training labels.
        X_val: Validation features.
        y_val: Validation labels.

    Returns:
        BaselineResult with evaluation metrics.
    """
    logger.info("training_lgbm_baseline", n_train=len(y_train), n_val=len(y_val))

    # Placeholder for V1 — actual training requires sufficient data
    return BaselineResult(
        model_name="lightgbm",
        auroc=0.0,
        auprc=0.0,
        brier_score=1.0,
    )


def compare_vs_baseline(
    lstm_auroc: float,
    lr_auroc: float,
    lgbm_auroc: float,
    min_uplift: float = 0.02,
) -> PromotionDecision:
    """Compare LSTM AUROC against baselines for promotion gate.

    LSTM must outperform max(LR, LightGBM) by at least min_uplift
    on held-out test set.

    Args:
        lstm_auroc: LSTM model AUROC on test set.
        lr_auroc: Logistic regression AUROC on test set.
        lgbm_auroc: LightGBM AUROC on test set.
        min_uplift: Minimum required AUROC improvement.

    Returns:
        PromotionDecision with allowed flag and reasons.
    """
    best_baseline = max(lr_auroc, lgbm_auroc)
    uplift = lstm_auroc - best_baseline
    required = best_baseline + min_uplift

    reasons: list[str] = []
    metrics = {
        "lstm_auroc": lstm_auroc,
        "lr_auroc": lr_auroc,
        "lgbm_auroc": lgbm_auroc,
        "best_baseline_auroc": best_baseline,
        "uplift": uplift,
        "min_uplift_required": min_uplift,
    }

    if lstm_auroc < required:
        reasons.append(
            f"LSTM AUROC ({lstm_auroc:.4f}) does not exceed best baseline "
            f"({best_baseline:.4f}) + min_uplift ({min_uplift:.4f}) = {required:.4f}"
        )
        allowed = False
    else:
        reasons.append(
            f"LSTM AUROC ({lstm_auroc:.4f}) exceeds best baseline "
            f"({best_baseline:.4f}) by {uplift:.4f} (>= {min_uplift:.4f})"
        )
        allowed = True

    logger.info(
        "baseline_comparison",
        allowed=allowed,
        lstm_auroc=lstm_auroc,
        best_baseline=best_baseline,
        uplift=uplift,
    )

    return PromotionDecision(allowed=allowed, reasons=reasons, metrics=metrics)
