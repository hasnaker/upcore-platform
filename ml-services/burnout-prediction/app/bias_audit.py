"""Bias audit for burnout prediction (skill: upc-ml-validation §4).

Implements the three standard group-fairness metrics used in the Fairlearn
framework, plus the US EEOC "four-fifths rule" (1978) that is also referenced
by the Turkish KVKK Kurumu as a non-discrimination benchmark for automated
decision making (KVKK Madde 22).

Metrics
-------
* **Demographic parity** — P(Y_hat=1 | A=a) equal across groups.
* **Equal opportunity** — P(Y_hat=1 | Y=1, A=a) equal across groups.
* **Predictive parity** — P(Y=1 | Y_hat=1, A=a) equal across groups.

The "pass" criterion for demographic parity is the 4/5ths rule: the lowest
positive-rate group must be ≥ 80% of the highest positive-rate group.

Sensitive attributes (per skill spec):
* ``gender``            (kadın, erkek, diğer / belirtmemiş)
* ``age_band``          (<30, 30-45, 45+)
* ``department``        (string label)

This module is intentionally free of the ``fairlearn`` package dependency at
runtime — ``fairlearn`` is a soft optional (see ``pyproject.toml`` gpu extra).
When it is installed, the :class:`FairlearnBiasAuditor` adds mitigations
(ThresholdOptimizer) via ``fit_mitigation``. The core metrics work everywhere.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Iterable, Literal

import numpy as np
import structlog

logger = structlog.get_logger()


SensitiveAttribute = Literal["gender", "age_band", "department"]


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


@dataclass
class GroupResult:
    """Metrics for a single protected group (e.g. gender=kadın)."""

    attribute: str
    group_value: str
    n: int
    n_positive_label: int
    positive_prediction_rate: float  # demographic parity
    true_positive_rate: float  # equal opportunity (TPR)
    false_positive_rate: float
    precision: float  # predictive parity
    selection_ratio: float  # vs most-selected group, used for 4/5ths rule


@dataclass
class AttributeAudit:
    """Aggregated audit result for one sensitive attribute."""

    attribute: str
    groups: list[GroupResult] = field(default_factory=list)
    demographic_parity_diff: float = 0.0
    demographic_parity_ratio: float = 1.0
    equal_opportunity_diff: float = 0.0
    predictive_parity_diff: float = 0.0
    passes_four_fifths: bool = True
    passes_demographic_parity: bool = True
    passes_equal_opportunity: bool = True


@dataclass
class BiasReport:
    """Full bias audit report — serialisable for `/audit/bias-report` endpoint."""

    model_version: str
    n_samples: int
    threshold: float
    attribute_audits: list[AttributeAudit] = field(default_factory=list)
    overall_passes: bool = True
    mitigation_applied: str | None = None

    def as_dict(self) -> dict:
        return {
            **asdict(self),
            "attribute_audits": [asdict(a) for a in self.attribute_audits],
        }


# ---------------------------------------------------------------------------
# Core metrics
# ---------------------------------------------------------------------------


def _safe_div(num: float, den: float) -> float:
    return float(num) / float(den) if den > 0 else 0.0


def _binarize(probs: np.ndarray, threshold: float) -> np.ndarray:
    return (np.asarray(probs, dtype=np.float64) >= threshold).astype(np.int64)


def demographic_parity(
    probs: np.ndarray,
    group: np.ndarray,
    threshold: float = 0.5,
) -> dict[str, float]:
    """Positive prediction rate per group."""
    preds = _binarize(probs, threshold)
    out: dict[str, float] = {}
    for g in np.unique(group):
        mask = group == g
        out[str(g)] = float(np.mean(preds[mask])) if np.any(mask) else 0.0
    return out


def equal_opportunity(
    probs: np.ndarray,
    labels: np.ndarray,
    group: np.ndarray,
    threshold: float = 0.5,
) -> dict[str, float]:
    """TPR per group — P(Y_hat=1 | Y=1, A=a)."""
    preds = _binarize(probs, threshold)
    labels = np.asarray(labels, dtype=np.int64)
    out: dict[str, float] = {}
    for g in np.unique(group):
        mask = (group == g) & (labels == 1)
        if not np.any(mask):
            out[str(g)] = 0.0
            continue
        out[str(g)] = float(np.mean(preds[mask] == 1))
    return out


def predictive_parity(
    probs: np.ndarray,
    labels: np.ndarray,
    group: np.ndarray,
    threshold: float = 0.5,
) -> dict[str, float]:
    """Precision per group — P(Y=1 | Y_hat=1, A=a)."""
    preds = _binarize(probs, threshold)
    labels = np.asarray(labels, dtype=np.int64)
    out: dict[str, float] = {}
    for g in np.unique(group):
        mask = (group == g) & (preds == 1)
        if not np.any(mask):
            out[str(g)] = 0.0
            continue
        out[str(g)] = float(np.mean(labels[mask] == 1))
    return out


def four_fifths_rule(selection_rates: dict[str, float]) -> tuple[float, bool]:
    """Return (min/max ratio, passes) for the EEOC 4/5ths rule."""
    rates = [r for r in selection_rates.values() if r > 0]
    if not rates:
        return 1.0, True
    max_rate = max(selection_rates.values())
    if max_rate == 0:
        return 1.0, True
    min_rate = min(selection_rates.values())
    ratio = _safe_div(min_rate, max_rate)
    return ratio, ratio >= 0.80


# ---------------------------------------------------------------------------
# Audit runner
# ---------------------------------------------------------------------------


def _audit_single_attribute(
    attribute: str,
    probs: np.ndarray,
    labels: np.ndarray,
    group: np.ndarray,
    threshold: float,
    max_equal_opportunity_diff: float,
) -> AttributeAudit:
    dp = demographic_parity(probs, group, threshold)
    eo = equal_opportunity(probs, labels, group, threshold)
    pp = predictive_parity(probs, labels, group, threshold)

    preds = _binarize(probs, threshold)
    labels_arr = np.asarray(labels, dtype=np.int64)

    max_rate = max(dp.values()) if dp else 0.0

    groups: list[GroupResult] = []
    for g in np.unique(group):
        mask = group == g
        n = int(np.sum(mask))
        n_pos_label = int(np.sum(labels_arr[mask] == 1))
        # FPR = FP / N (label=0)
        neg_mask = mask & (labels_arr == 0)
        if np.any(neg_mask):
            fpr = float(np.mean(preds[neg_mask] == 1))
        else:
            fpr = 0.0
        selection_ratio = _safe_div(dp.get(str(g), 0.0), max_rate)
        groups.append(
            GroupResult(
                attribute=attribute,
                group_value=str(g),
                n=n,
                n_positive_label=n_pos_label,
                positive_prediction_rate=float(dp.get(str(g), 0.0)),
                true_positive_rate=float(eo.get(str(g), 0.0)),
                false_positive_rate=float(fpr),
                precision=float(pp.get(str(g), 0.0)),
                selection_ratio=float(selection_ratio),
            )
        )

    dp_ratio, passes_four_fifths = four_fifths_rule(dp)
    dp_diff = (max(dp.values()) - min(dp.values())) if dp else 0.0
    eo_diff = (max(eo.values()) - min(eo.values())) if eo else 0.0
    pp_diff = (max(pp.values()) - min(pp.values())) if pp else 0.0

    return AttributeAudit(
        attribute=attribute,
        groups=groups,
        demographic_parity_diff=float(dp_diff),
        demographic_parity_ratio=float(dp_ratio),
        equal_opportunity_diff=float(eo_diff),
        predictive_parity_diff=float(pp_diff),
        passes_four_fifths=bool(passes_four_fifths),
        passes_demographic_parity=bool(dp_diff <= 0.10),
        passes_equal_opportunity=bool(eo_diff <= max_equal_opportunity_diff),
    )


def run_bias_audit(
    *,
    probs: np.ndarray,
    labels: np.ndarray,
    sensitive_features: dict[str, np.ndarray],
    model_version: str,
    threshold: float = 0.5,
    max_equal_opportunity_diff: float = 0.10,
    mitigation_applied: str | None = None,
) -> BiasReport:
    """End-to-end bias audit.

    Args:
        probs: model output probabilities, shape (n,).
        labels: ground-truth binary labels, shape (n,).
        sensitive_features: mapping from attribute name → group labels.
            Expected attributes per spec: ``gender``, ``age_band``, ``department``.
        model_version: identifier written into the report.
        threshold: classification cutoff (default 0.5).
        max_equal_opportunity_diff: tolerance for TPR gap (default 0.10).
        mitigation_applied: human-readable tag if ThresholdOptimizer was used.
    """
    probs_arr = np.asarray(probs, dtype=np.float64).ravel()
    labels_arr = np.asarray(labels, dtype=np.int64).ravel()
    if probs_arr.shape[0] != labels_arr.shape[0]:
        raise ValueError("probs and labels length mismatch")

    audits: list[AttributeAudit] = []
    for attribute, group_values in sensitive_features.items():
        group_arr = np.asarray(group_values).ravel()
        if group_arr.shape[0] != probs_arr.shape[0]:
            raise ValueError(f"sensitive feature '{attribute}' length mismatch")
        audits.append(
            _audit_single_attribute(
                attribute=attribute,
                probs=probs_arr,
                labels=labels_arr,
                group=group_arr,
                threshold=threshold,
                max_equal_opportunity_diff=max_equal_opportunity_diff,
            )
        )

    overall = all(
        a.passes_four_fifths and a.passes_demographic_parity and a.passes_equal_opportunity
        for a in audits
    )

    report = BiasReport(
        model_version=model_version,
        n_samples=int(probs_arr.size),
        threshold=float(threshold),
        attribute_audits=audits,
        overall_passes=bool(overall),
        mitigation_applied=mitigation_applied,
    )
    logger.info(
        "bias_audit_completed",
        model_version=model_version,
        n=report.n_samples,
        overall_passes=report.overall_passes,
        attributes=list(sensitive_features.keys()),
    )
    return report


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def age_to_band(age: float | int | None) -> str:
    """Canonical age → age band mapping used across the platform."""
    if age is None:
        return "unknown"
    try:
        a = float(age)
    except (TypeError, ValueError):
        return "unknown"
    if a < 30:
        return "under_30"
    if a < 45:
        return "30_44"
    return "45_plus"


def build_sensitive_feature_matrix(
    genders: Iterable[str | None],
    ages: Iterable[float | int | None],
    departments: Iterable[str | None],
) -> dict[str, np.ndarray]:
    """Convenience helper — turn raw HR columns into the shape the auditor expects."""
    return {
        "gender": np.asarray([str(g) if g is not None else "unknown" for g in genders]),
        "age_band": np.asarray([age_to_band(a) for a in ages]),
        "department": np.asarray([str(d) if d is not None else "unknown" for d in departments]),
    }


# ---------------------------------------------------------------------------
# Optional Fairlearn integration
# ---------------------------------------------------------------------------


class FairlearnBiasAuditor:
    """Thin wrapper that delegates to ``fairlearn`` when it's installed.

    We keep the hard dependency optional so the inference container can ship
    without the ML training stack. Call :meth:`available` before using.
    """

    def __init__(self) -> None:
        try:
            import fairlearn  # noqa: F401
            self._available = True
        except ImportError:
            self._available = False

    @property
    def available(self) -> bool:
        return self._available

    def fit_threshold_optimizer(
        self,
        base_estimator,
        *,
        X,
        y,
        sensitive_features,
        constraint: str = "demographic_parity",
    ):
        """Fit fairlearn's ThresholdOptimizer as a post-processing mitigation."""
        if not self._available:
            raise RuntimeError("fairlearn is not installed (install with extras=[gpu])")
        from fairlearn.postprocessing import ThresholdOptimizer

        opt = ThresholdOptimizer(
            estimator=base_estimator,
            constraints=constraint,
            prefit=True,
            predict_method="predict_proba",
        )
        opt.fit(X, y, sensitive_features=sensitive_features)
        logger.info("threshold_optimizer_fitted", constraint=constraint)
        return opt


__all__ = [
    "AttributeAudit",
    "BiasReport",
    "FairlearnBiasAuditor",
    "GroupResult",
    "SensitiveAttribute",
    "age_to_band",
    "build_sensitive_feature_matrix",
    "demographic_parity",
    "equal_opportunity",
    "four_fifths_rule",
    "predictive_parity",
    "run_bias_audit",
]
