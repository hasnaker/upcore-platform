"""Tests for PSI-based drift monitoring (app/drift.py)."""

from __future__ import annotations

import numpy as np
import pytest

from app.drift import (
    PSI_THRESHOLD_SIGNIFICANT,
    DriftMonitor,
    classify_severity,
    compute_psi,
)


def test_psi_zero_on_identical_distribution() -> None:
    rng = np.random.default_rng(0)
    x = rng.normal(0, 1, size=1000)
    psi = compute_psi(x, x)
    assert psi == pytest.approx(0.0, abs=1e-3)


def test_psi_large_on_strong_shift() -> None:
    rng = np.random.default_rng(1)
    ref = rng.normal(0, 1, size=1000)
    cur = rng.normal(3, 1, size=1000)  # big shift
    psi = compute_psi(ref, cur)
    assert psi > PSI_THRESHOLD_SIGNIFICANT


def test_psi_non_negative() -> None:
    rng = np.random.default_rng(2)
    ref = rng.normal(0, 1, size=500)
    cur = rng.normal(0.5, 1, size=500)
    assert compute_psi(ref, cur) >= 0.0


def test_classify_severity_thresholds() -> None:
    assert classify_severity(0.05) == "none"
    assert classify_severity(0.12) == "moderate"
    assert classify_severity(0.30) == "significant"


def test_drift_monitor_overall_and_trigger() -> None:
    rng = np.random.default_rng(3)
    ref = {
        "bat_exhaustion_mean": rng.normal(2.5, 0.5, 500),
        "workload": rng.normal(50.0, 15, 500),
    }
    cur = {
        "bat_exhaustion_mean": rng.normal(2.5, 0.5, 500),  # stable
        "workload": rng.normal(90.0, 15, 500),  # drifted
    }
    monitor = DriftMonitor(model_version="v2").fit(ref)
    report = monitor.compute(cur)
    assert report.triggers_retrain is True
    features_by_name = {f.feature_name: f for f in report.features}
    assert features_by_name["workload"].severity in {"moderate", "significant"}
    # Should retrain when at least one feature is significant
    assert monitor.should_retrain(cur) is True


def test_drift_monitor_handles_missing_feature() -> None:
    rng = np.random.default_rng(4)
    ref = {"a": rng.normal(0, 1, 200), "b": rng.normal(0, 1, 200)}
    cur = {"a": rng.normal(0, 1, 200)}  # no 'b'
    monitor = DriftMonitor(model_version="v2").fit(ref)
    report = monitor.compute(cur)
    assert len(report.features) == 1  # only 'a' joined
