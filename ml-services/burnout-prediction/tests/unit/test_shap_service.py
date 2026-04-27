"""Tests for the SHAP explanation service (app/shap_service.py)."""

from __future__ import annotations

import numpy as np

from app.shap_service import compute_global_importance, explain_single


def _linear_predict_fn(weights: dict[str, float]):
    """Return a deterministic linear + sigmoid predict function."""

    def fn(features: dict[str, float]) -> float:
        score = sum(weights.get(k, 0.0) * v for k, v in features.items())
        # sigmoid
        if score >= 0:
            return float(1.0 / (1.0 + np.exp(-score)))
        ex = float(np.exp(score))
        return float(ex / (1.0 + ex))

    return fn


def test_explain_single_top_k_shape() -> None:
    weights = {"a": 2.0, "b": -1.5, "c": 0.5}
    predict = _linear_predict_fn(weights)
    feats = {"a": 1.0, "b": 1.0, "c": 1.0}
    ref = {"a": 0.0, "b": 0.0, "c": 0.0}

    exp = explain_single(
        predict_fn=predict,
        feature_values=feats,
        reference_values=ref,
        k=3,
        n_samples=20,
    )

    assert len(exp.top_k) == 3
    for c in exp.top_k:
        assert c.feature in weights
        assert c.abs_shap >= 0
        assert c.direction in {"positive", "negative"}
    assert 0.0 <= exp.prediction <= 1.0
    # Top feature should be 'a' (largest |weight|)
    assert exp.top_k[0].feature == "a"


def test_explain_single_produces_counterfactuals() -> None:
    weights = {"a": 2.0, "b": -1.5}
    predict = _linear_predict_fn(weights)
    feats = {"a": 1.0, "b": 1.0}
    ref = {"a": 0.0, "b": 0.0}

    exp = explain_single(
        predict_fn=predict,
        feature_values=feats,
        reference_values=ref,
        k=2,
        n_samples=15,
        counterfactual_targets=2,
    )
    assert len(exp.counterfactuals) == 2
    # Each counterfactual should record a delta (possibly 0 but well defined)
    for cf in exp.counterfactuals:
        assert isinstance(cf.delta, float)
        assert cf.feature in weights


def test_global_importance_aggregates() -> None:
    weights = {"a": 3.0, "b": 1.0, "c": 0.0}
    predict = _linear_predict_fn(weights)
    cohort = [
        {"a": 1.0, "b": 1.0, "c": 1.0},
        {"a": 0.5, "b": 0.2, "c": 0.8},
        {"a": 0.9, "b": -0.5, "c": 0.3},
    ]
    gi = compute_global_importance(
        predict_fn=predict,
        cohort=cohort,
        reference_values={"a": 0.0, "b": 0.0, "c": 0.0},
        model_version="v2-test",
        n_samples_per_row=10,
        top_n=3,
    )
    assert gi.model_version == "v2-test"
    assert gi.n_samples == 3
    # 'a' should dominate since its weight is largest
    assert gi.features[0]["feature"] == "a"


def test_explain_single_returns_serialisable_dict() -> None:
    predict = _linear_predict_fn({"a": 1.0})
    exp = explain_single(
        predict_fn=predict,
        feature_values={"a": 0.5},
        reference_values={"a": 0.0},
        k=1,
        n_samples=5,
    )
    payload = exp.as_dict()
    assert "top_k" in payload
    assert "counterfactuals" in payload
    assert payload["prediction"] == exp.prediction
