"""Data-drift detection for burnout prediction (skill: upc-ml-validation §5).

Implements the **Population Stability Index** (PSI), the industry-standard
metric for detecting covariate shift in credit-risk and HR-tech production
systems (Siddiqi 2006). PSI quantifies how much a production feature
distribution has drifted from its reference (training) distribution.

Interpretation rules (per skill spec §5):
* ``PSI < 0.10`` — no significant change, model remains valid.
* ``0.10 ≤ PSI < 0.20`` — moderate drift, log and monitor.
* ``PSI ≥ 0.20`` — **significant drift**, trigger retraining.

Additionally includes a :class:`DriftMonitor` that aggregates PSI across the
full feature vector and produces the JSON payload served at
``GET /audit/drift``.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Literal

import numpy as np
import structlog

logger = structlog.get_logger()


_EPS = 1e-6

DriftSeverity = Literal["none", "moderate", "significant"]

# Thresholds per skill spec §5
PSI_THRESHOLD_MODERATE = 0.10
PSI_THRESHOLD_SIGNIFICANT = 0.20


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


@dataclass
class FeatureDrift:
    feature_name: str
    psi: float
    severity: DriftSeverity
    triggers_retrain: bool
    n_reference: int
    n_current: int


@dataclass
class DriftReport:
    model_version: str
    overall_psi: float
    overall_severity: DriftSeverity
    triggers_retrain: bool
    features: list[FeatureDrift] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            **asdict(self),
            "features": [asdict(f) for f in self.features],
        }


# ---------------------------------------------------------------------------
# PSI
# ---------------------------------------------------------------------------


def _quantile_bins(reference: np.ndarray, n_bins: int) -> np.ndarray:
    """Return bin edges based on quantiles of the reference distribution."""
    if reference.size == 0:
        return np.linspace(0.0, 1.0, n_bins + 1)
    quantiles = np.linspace(0.0, 1.0, n_bins + 1)
    edges = np.unique(np.quantile(reference, quantiles))
    # ensure at least 2 edges for np.histogram
    if edges.size < 2:
        edges = np.array([float(np.min(reference) - _EPS), float(np.max(reference) + _EPS)])
    # widen outer edges so out-of-range current values still land in a bin
    edges[0] = edges[0] - _EPS
    edges[-1] = edges[-1] + _EPS
    return edges


def compute_psi(
    reference: np.ndarray,
    current: np.ndarray,
    n_bins: int = 10,
) -> float:
    """Population Stability Index between two 1-D distributions.

    PSI = sum_i (p_current_i - p_reference_i) * ln(p_current_i / p_reference_i)

    Small epsilon is added to empty bins for numerical stability.
    """
    reference = np.asarray(reference, dtype=np.float64).ravel()
    current = np.asarray(current, dtype=np.float64).ravel()
    if reference.size == 0 or current.size == 0:
        return 0.0

    edges = _quantile_bins(reference, n_bins)
    ref_counts, _ = np.histogram(reference, bins=edges)
    cur_counts, _ = np.histogram(current, bins=edges)

    ref_pct = ref_counts / max(int(reference.size), 1)
    cur_pct = cur_counts / max(int(current.size), 1)

    # Laplace smoothing for empty bins
    ref_pct = np.where(ref_pct == 0, _EPS, ref_pct)
    cur_pct = np.where(cur_pct == 0, _EPS, cur_pct)

    psi = float(np.sum((cur_pct - ref_pct) * np.log(cur_pct / ref_pct)))
    return max(psi, 0.0)


def classify_severity(psi: float) -> DriftSeverity:
    if psi >= PSI_THRESHOLD_SIGNIFICANT:
        return "significant"
    if psi >= PSI_THRESHOLD_MODERATE:
        return "moderate"
    return "none"


# ---------------------------------------------------------------------------
# DriftMonitor
# ---------------------------------------------------------------------------


class DriftMonitor:
    """Stateful drift monitor — holds the reference distribution per feature."""

    def __init__(
        self,
        model_version: str,
        *,
        n_bins: int = 10,
        significant_threshold: float = PSI_THRESHOLD_SIGNIFICANT,
    ) -> None:
        self.model_version = model_version
        self.n_bins = n_bins
        self.significant_threshold = significant_threshold
        self._reference: dict[str, np.ndarray] = {}

    def fit(self, reference_frame: dict[str, np.ndarray]) -> "DriftMonitor":
        """Store the reference (training) distributions per feature."""
        self._reference = {
            name: np.asarray(values, dtype=np.float64).ravel()
            for name, values in reference_frame.items()
        }
        logger.info(
            "drift_monitor_fitted",
            model_version=self.model_version,
            features=len(self._reference),
        )
        return self

    def compute(self, current_frame: dict[str, np.ndarray]) -> DriftReport:
        """Compute PSI for each tracked feature."""
        features: list[FeatureDrift] = []
        for name, ref_values in self._reference.items():
            if name not in current_frame:
                continue
            cur_values = np.asarray(current_frame[name], dtype=np.float64).ravel()
            psi = compute_psi(ref_values, cur_values, n_bins=self.n_bins)
            severity = classify_severity(psi)
            features.append(
                FeatureDrift(
                    feature_name=name,
                    psi=float(psi),
                    severity=severity,
                    triggers_retrain=bool(psi >= self.significant_threshold),
                    n_reference=int(ref_values.size),
                    n_current=int(cur_values.size),
                )
            )

        # Overall = max PSI across features (most conservative)
        if features:
            overall = max(f.psi for f in features)
        else:
            overall = 0.0
        overall_severity = classify_severity(overall)
        triggers = overall >= self.significant_threshold

        report = DriftReport(
            model_version=self.model_version,
            overall_psi=float(overall),
            overall_severity=overall_severity,
            triggers_retrain=bool(triggers),
            features=features,
        )
        logger.info(
            "drift_report_computed",
            model_version=self.model_version,
            overall_psi=overall,
            severity=overall_severity,
            triggers=triggers,
        )
        return report

    def should_retrain(self, current_frame: dict[str, np.ndarray]) -> bool:
        """Convenience: returns ``True`` iff overall PSI exceeds the threshold."""
        return self.compute(current_frame).triggers_retrain


__all__ = [
    "DriftMonitor",
    "DriftReport",
    "DriftSeverity",
    "FeatureDrift",
    "PSI_THRESHOLD_MODERATE",
    "PSI_THRESHOLD_SIGNIFICANT",
    "classify_severity",
    "compute_psi",
]
