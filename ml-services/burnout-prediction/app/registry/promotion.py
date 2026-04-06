"""Model promotion gate logic.

Enforces calibration, fairness, and baseline comparison gates
before a model can be promoted to production.
"""

from __future__ import annotations

import structlog

from app.config import settings
from app.schemas.internal import PromotionDecision
from app.utils.errors import CalibrationGateFailedError, FairnessGateFailedError

logger = structlog.get_logger()


def check_promotion_gates(
    lstm_auroc: float,
    lr_auroc: float,
    lgbm_auroc: float,
    ece: float,
    demographic_parity_diff: float,
    min_auroc_uplift: float = 0.02,
) -> PromotionDecision:
    """Run all promotion gates and return decision.

    Gates:
    1. AUROC uplift: LSTM must beat max(LR, LightGBM) by >= min_auroc_uplift
    2. Calibration: ECE <= target_ece (default 0.05)
    3. Fairness: demographic parity diff <= tolerance (default 0.10)

    Args:
        lstm_auroc: LSTM AUROC on test set.
        lr_auroc: Logistic regression AUROC.
        lgbm_auroc: LightGBM AUROC.
        ece: Expected Calibration Error.
        demographic_parity_diff: Max demographic parity difference.
        min_auroc_uplift: Required AUROC improvement over baselines.

    Returns:
        PromotionDecision with pass/fail and reasons.
    """
    reasons: list[str] = []
    metrics: dict[str, float] = {
        "lstm_auroc": lstm_auroc,
        "lr_auroc": lr_auroc,
        "lgbm_auroc": lgbm_auroc,
        "ece": ece,
        "demographic_parity_diff": demographic_parity_diff,
    }
    gates_passed = True

    # Gate 1: AUROC uplift
    best_baseline = max(lr_auroc, lgbm_auroc)
    if lstm_auroc < best_baseline + min_auroc_uplift:
        gates_passed = False
        reasons.append(
            f"AUROC gate FAILED: LSTM ({lstm_auroc:.4f}) < "
            f"best baseline ({best_baseline:.4f}) + uplift ({min_auroc_uplift})"
        )
    else:
        reasons.append(
            f"AUROC gate PASSED: LSTM ({lstm_auroc:.4f}) >= "
            f"best baseline ({best_baseline:.4f}) + uplift ({min_auroc_uplift})"
        )

    # Gate 2: Calibration
    if ece > settings.TARGET_ECE:
        gates_passed = False
        reasons.append(
            f"Calibration gate FAILED: ECE ({ece:.4f}) > target ({settings.TARGET_ECE})"
        )
    else:
        reasons.append(
            f"Calibration gate PASSED: ECE ({ece:.4f}) <= target ({settings.TARGET_ECE})"
        )

    # Gate 3: Fairness
    if demographic_parity_diff > settings.FAIRNESS_TOLERANCE:
        gates_passed = False
        reasons.append(
            f"Fairness gate FAILED: parity diff ({demographic_parity_diff:.4f}) > "
            f"tolerance ({settings.FAIRNESS_TOLERANCE})"
        )
    else:
        reasons.append(
            f"Fairness gate PASSED: parity diff ({demographic_parity_diff:.4f}) <= "
            f"tolerance ({settings.FAIRNESS_TOLERANCE})"
        )

    logger.info(
        "promotion_gates_checked",
        passed=gates_passed,
        reasons=reasons,
    )

    return PromotionDecision(
        allowed=gates_passed,
        reasons=reasons,
        metrics=metrics,
    )
