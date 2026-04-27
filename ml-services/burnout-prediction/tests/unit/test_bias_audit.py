"""Tests for the bias audit pipeline (app/bias_audit.py)."""

from __future__ import annotations

import numpy as np
import pytest

from app.bias_audit import (
    age_to_band,
    build_sensitive_feature_matrix,
    demographic_parity,
    equal_opportunity,
    four_fifths_rule,
    predictive_parity,
    run_bias_audit,
)


def test_age_to_band_ranges() -> None:
    assert age_to_band(25) == "under_30"
    assert age_to_band(30) == "30_44"
    assert age_to_band(44) == "30_44"
    assert age_to_band(45) == "45_plus"
    assert age_to_band(60) == "45_plus"
    assert age_to_band(None) == "unknown"
    assert age_to_band("abc") == "unknown"


def test_build_sensitive_feature_matrix_shape() -> None:
    mat = build_sensitive_feature_matrix(
        genders=["kadın", "erkek", None],
        ages=[28, 40, 52],
        departments=["IK", "Muhendislik", None],
    )
    assert set(mat.keys()) == {"gender", "age_band", "department"}
    assert mat["age_band"].tolist() == ["under_30", "30_44", "45_plus"]
    assert mat["gender"].tolist() == ["kadın", "erkek", "unknown"]


def test_demographic_parity_perfectly_equal() -> None:
    probs = np.array([0.2, 0.2, 0.9, 0.9])
    group = np.array(["A", "B", "A", "B"])
    rates = demographic_parity(probs, group, threshold=0.5)
    assert rates == {"A": 0.5, "B": 0.5}


def test_four_fifths_rule_pass_and_fail() -> None:
    ratio, ok = four_fifths_rule({"A": 0.5, "B": 0.45})
    assert ok is True
    ratio, ok = four_fifths_rule({"A": 0.5, "B": 0.2})
    assert ok is False
    assert ratio == pytest.approx(0.4)


def test_equal_opportunity_tpr_by_group() -> None:
    probs = np.array([0.9, 0.1, 0.9, 0.1, 0.9, 0.1])
    labels = np.array([1, 1, 1, 0, 1, 0])
    group = np.array(["A", "A", "A", "B", "B", "B"])
    tpr = equal_opportunity(probs, labels, group, threshold=0.5)
    assert tpr["A"] == pytest.approx(2 / 3)
    assert tpr["B"] == pytest.approx(1.0)


def test_predictive_parity_precision() -> None:
    probs = np.array([0.9, 0.9, 0.9, 0.9])
    labels = np.array([1, 0, 1, 1])
    group = np.array(["A", "A", "B", "B"])
    pp = predictive_parity(probs, labels, group, threshold=0.5)
    assert pp["A"] == pytest.approx(0.5)
    assert pp["B"] == pytest.approx(1.0)


def test_run_bias_audit_end_to_end() -> None:
    rng = np.random.default_rng(0)
    n = 400
    probs = rng.beta(2, 5, size=n)
    labels = (rng.random(n) < probs).astype(int)
    genders = rng.choice(["kadın", "erkek"], size=n)
    ages = rng.integers(22, 60, size=n)
    depts = rng.choice(["muhendislik", "ik", "satis"], size=n)

    sensitive = build_sensitive_feature_matrix(genders=genders, ages=ages, departments=depts)
    report = run_bias_audit(
        probs=probs,
        labels=labels,
        sensitive_features=sensitive,
        model_version="v2-test",
    )
    assert report.n_samples == n
    assert len(report.attribute_audits) == 3
    for audit in report.attribute_audits:
        assert audit.attribute in {"gender", "age_band", "department"}
        assert all(0 <= g.positive_prediction_rate <= 1 for g in audit.groups)
    # Report structure should be JSON-serialisable via dataclass asdict
    assert isinstance(report.as_dict(), dict)


def test_run_bias_audit_rejects_length_mismatch() -> None:
    with pytest.raises(ValueError):
        run_bias_audit(
            probs=np.array([0.1, 0.5, 0.9]),
            labels=np.array([0, 1, 1]),
            sensitive_features={"gender": np.array(["a", "b"])},
            model_version="v2-test",
        )
