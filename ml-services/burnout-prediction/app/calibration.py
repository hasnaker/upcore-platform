"""Probability calibration for burnout prediction (skill: upc-ml-validation §2).

This module is the **V2 production calibration pipeline**. The older
``app/inference/calibration.py`` contains the temperature-scaling helpers used
by the heuristic V1 model — we deliberately keep that path untouched to avoid
regressing the consent pipeline. This module adds the two industry-standard
methods required for the XGBoost retrain:

* **Platt scaling** — logistic regression on the model scores (Platt 1999).
* **Isotonic regression** — nonparametric monotonic fit (Zadrozny & Elkan 2002).

Acceptance gates (SKILL.md §2):

* Brier score < 0.15
* Expected Calibration Error (ECE) < 0.05
* Reliability diagram JSON export for the audit dashboard

The classes are dependency-light (``scikit-learn`` only). They are safe to load
without the ``gpu`` extra; ``sklearn`` is a base dependency of the service.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Literal

import numpy as np
import structlog
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression

logger = structlog.get_logger()


_EPS = 1e-7


CalibrationMethod = Literal["platt", "isotonic"]


@dataclass
class CalibrationBin:
    """A single bin on the reliability diagram."""

    bin_lower: float
    bin_upper: float
    bin_center: float
    predicted_mean: float
    observed_fraction: float
    count: int


@dataclass
class CalibrationReport:
    """Full calibration report — serialisable for the `/audit/calibration` endpoint."""

    model_version: str
    method: CalibrationMethod
    n_samples: int
    brier_score: float
    ece: float
    mce: float  # Maximum calibration error
    log_loss: float
    passes_brier_gate: bool  # Brier < 0.15
    passes_ece_gate: bool  # ECE < 0.05
    bins: list[CalibrationBin] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            **asdict(self),
            "bins": [asdict(b) for b in self.bins],
        }


class PlattScalingCalibrator:
    """Platt scaling (sigmoid) calibrator.

    Fits ``P(y=1|x) = sigmoid(a * score + b)`` on a held-out calibration set.
    Appropriate when the base model output is already roughly sigmoid-shaped
    (XGBoost / LightGBM / LSTM).
    """

    def __init__(self) -> None:
        self._lr: LogisticRegression | None = None

    def fit(self, scores: np.ndarray, labels: np.ndarray) -> "PlattScalingCalibrator":
        scores = np.asarray(scores, dtype=np.float64).reshape(-1, 1)
        labels = np.asarray(labels, dtype=np.int64).ravel()
        if scores.shape[0] != labels.shape[0]:
            raise ValueError("scores and labels must have the same length")
        if scores.shape[0] < 10:
            raise ValueError("need at least 10 samples to fit Platt scaling")

        self._lr = LogisticRegression(solver="lbfgs", max_iter=200)
        self._lr.fit(scores, labels)
        logger.info(
            "platt_fitted",
            coef=float(self._lr.coef_[0, 0]),
            intercept=float(self._lr.intercept_[0]),
            n=int(scores.shape[0]),
        )
        return self

    def predict_proba(self, scores: np.ndarray) -> np.ndarray:
        if self._lr is None:
            raise RuntimeError("calibrator not fitted")
        scores = np.asarray(scores, dtype=np.float64).reshape(-1, 1)
        probs = self._lr.predict_proba(scores)[:, 1]
        return np.clip(probs, 0.0, 1.0)


class IsotonicCalibrator:
    """Isotonic regression calibrator (nonparametric monotonic mapping)."""

    def __init__(self) -> None:
        self._ir: IsotonicRegression | None = None

    def fit(self, scores: np.ndarray, labels: np.ndarray) -> "IsotonicCalibrator":
        scores = np.asarray(scores, dtype=np.float64).ravel()
        labels = np.asarray(labels, dtype=np.float64).ravel()
        if scores.shape[0] != labels.shape[0]:
            raise ValueError("scores and labels must have the same length")
        if scores.shape[0] < 10:
            raise ValueError("need at least 10 samples to fit isotonic regression")

        self._ir = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        self._ir.fit(scores, labels)
        logger.info("isotonic_fitted", n=int(scores.shape[0]))
        return self

    def predict_proba(self, scores: np.ndarray) -> np.ndarray:
        if self._ir is None:
            raise RuntimeError("calibrator not fitted")
        scores = np.asarray(scores, dtype=np.float64).ravel()
        probs = self._ir.transform(scores)
        return np.clip(probs, 0.0, 1.0)


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------


def brier_score(probs: np.ndarray, labels: np.ndarray) -> float:
    """Brier score: mean squared error between predicted prob and label."""
    probs = np.asarray(probs, dtype=np.float64).ravel()
    labels = np.asarray(labels, dtype=np.float64).ravel()
    if probs.size == 0:
        return 0.0
    return float(np.mean((probs - labels) ** 2))


def expected_calibration_error(
    probs: np.ndarray,
    labels: np.ndarray,
    n_bins: int = 15,
) -> float:
    """Expected Calibration Error with equal-width bins."""
    probs = np.asarray(probs, dtype=np.float64).ravel()
    labels = np.asarray(labels, dtype=np.float64).ravel()
    if probs.size == 0:
        return 0.0

    edges = np.linspace(0.0, 1.0, n_bins + 1)
    total = 0.0
    n = len(probs)
    for i in range(n_bins):
        lo, hi = edges[i], edges[i + 1]
        if i == 0:
            mask = (probs >= lo) & (probs <= hi)
        else:
            mask = (probs > lo) & (probs <= hi)
        if not np.any(mask):
            continue
        acc = float(np.mean(labels[mask]))
        conf = float(np.mean(probs[mask]))
        weight = float(np.sum(mask)) / n
        total += weight * abs(acc - conf)
    return float(total)


def maximum_calibration_error(
    probs: np.ndarray,
    labels: np.ndarray,
    n_bins: int = 15,
) -> float:
    """Maximum Calibration Error (MCE) — worst single bin."""
    probs = np.asarray(probs, dtype=np.float64).ravel()
    labels = np.asarray(labels, dtype=np.float64).ravel()
    if probs.size == 0:
        return 0.0

    edges = np.linspace(0.0, 1.0, n_bins + 1)
    worst = 0.0
    for i in range(n_bins):
        lo, hi = edges[i], edges[i + 1]
        if i == 0:
            mask = (probs >= lo) & (probs <= hi)
        else:
            mask = (probs > lo) & (probs <= hi)
        if not np.any(mask):
            continue
        acc = float(np.mean(labels[mask]))
        conf = float(np.mean(probs[mask]))
        worst = max(worst, abs(acc - conf))
    return float(worst)


def binary_log_loss(probs: np.ndarray, labels: np.ndarray) -> float:
    """Binary cross-entropy loss (numerically stable)."""
    probs = np.asarray(probs, dtype=np.float64).ravel()
    labels = np.asarray(labels, dtype=np.float64).ravel()
    if probs.size == 0:
        return 0.0
    p = np.clip(probs, _EPS, 1 - _EPS)
    loss = -(labels * np.log(p) + (1 - labels) * np.log(1 - p))
    return float(np.mean(loss))


def build_reliability_bins(
    probs: np.ndarray,
    labels: np.ndarray,
    n_bins: int = 15,
) -> list[CalibrationBin]:
    """Compute per-bin data for the reliability diagram JSON export."""
    probs = np.asarray(probs, dtype=np.float64).ravel()
    labels = np.asarray(labels, dtype=np.float64).ravel()

    edges = np.linspace(0.0, 1.0, n_bins + 1)
    bins: list[CalibrationBin] = []

    for i in range(n_bins):
        lo, hi = float(edges[i]), float(edges[i + 1])
        if i == 0:
            mask = (probs >= lo) & (probs <= hi)
        else:
            mask = (probs > lo) & (probs <= hi)
        count = int(np.sum(mask))
        if count == 0:
            bins.append(
                CalibrationBin(
                    bin_lower=lo,
                    bin_upper=hi,
                    bin_center=(lo + hi) / 2,
                    predicted_mean=(lo + hi) / 2,
                    observed_fraction=0.0,
                    count=0,
                )
            )
            continue
        bins.append(
            CalibrationBin(
                bin_lower=lo,
                bin_upper=hi,
                bin_center=(lo + hi) / 2,
                predicted_mean=float(np.mean(probs[mask])),
                observed_fraction=float(np.mean(labels[mask])),
                count=count,
            )
        )
    return bins


def build_calibration_report(
    probs: np.ndarray,
    labels: np.ndarray,
    model_version: str,
    method: CalibrationMethod,
    n_bins: int = 15,
    brier_threshold: float = 0.15,
    ece_threshold: float = 0.05,
) -> CalibrationReport:
    """End-to-end: compute all metrics and bins and return a serialisable report."""
    probs_arr = np.asarray(probs, dtype=np.float64).ravel()
    labels_arr = np.asarray(labels, dtype=np.float64).ravel()

    brier = brier_score(probs_arr, labels_arr)
    ece = expected_calibration_error(probs_arr, labels_arr, n_bins=n_bins)
    mce = maximum_calibration_error(probs_arr, labels_arr, n_bins=n_bins)
    logloss = binary_log_loss(probs_arr, labels_arr)
    bins = build_reliability_bins(probs_arr, labels_arr, n_bins=n_bins)

    report = CalibrationReport(
        model_version=model_version,
        method=method,
        n_samples=int(probs_arr.size),
        brier_score=float(brier),
        ece=float(ece),
        mce=float(mce),
        log_loss=float(logloss),
        passes_brier_gate=bool(brier < brier_threshold),
        passes_ece_gate=bool(ece < ece_threshold),
        bins=bins,
    )
    logger.info(
        "calibration_report_built",
        model_version=model_version,
        method=method,
        brier=brier,
        ece=ece,
        passes=report.passes_brier_gate and report.passes_ece_gate,
    )
    return report


def calibration_plot_payload(report: CalibrationReport) -> dict:
    """JSON payload for the frontend calibration plot (see SKILL.md §2)."""
    return {
        "model_version": report.model_version,
        "method": report.method,
        "ece": report.ece,
        "brier_score": report.brier_score,
        "passes_gate": report.passes_brier_gate and report.passes_ece_gate,
        "points": [
            {
                "x": b.predicted_mean,
                "y": b.observed_fraction,
                "count": b.count,
                "bin_lower": b.bin_lower,
                "bin_upper": b.bin_upper,
            }
            for b in report.bins
        ],
        "diagonal": [{"x": 0.0, "y": 0.0}, {"x": 1.0, "y": 1.0}],
    }


__all__ = [
    "CalibrationBin",
    "CalibrationMethod",
    "CalibrationReport",
    "IsotonicCalibrator",
    "PlattScalingCalibrator",
    "binary_log_loss",
    "brier_score",
    "build_calibration_report",
    "build_reliability_bins",
    "calibration_plot_payload",
    "expected_calibration_error",
    "maximum_calibration_error",
]
