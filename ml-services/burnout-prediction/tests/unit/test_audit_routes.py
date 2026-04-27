"""Integration-style tests for the /audit/* endpoints.

Uses FastAPI's TestClient (no live Postgres). Verifies the empty-report
fallback, then populates the in-memory cache and asserts round-trip fidelity.
"""

from __future__ import annotations

import numpy as np
from fastapi.testclient import TestClient

from app.api.routes_audit import get_report_cache
from app.bias_audit import build_sensitive_feature_matrix, run_bias_audit
from app.calibration import build_calibration_report
from app.drift import DriftMonitor
from app.main import app


def _seed_cache() -> None:
    cache = get_report_cache()
    # Calibration
    rng = np.random.default_rng(1)
    probs = rng.uniform(0, 1, size=300)
    labels = (rng.uniform(0, 1, size=300) < probs).astype(float)
    cache.set_calibration(
        build_calibration_report(
            probs=probs,
            labels=labels,
            model_version="v2.0-xgb",
            method="isotonic",
        )
    )
    # Bias
    sensitive = build_sensitive_feature_matrix(
        genders=rng.choice(["kadın", "erkek"], size=300),
        ages=rng.integers(22, 60, size=300),
        departments=rng.choice(["muhendislik", "ik", "satis"], size=300),
    )
    cache.set_bias(
        run_bias_audit(
            probs=probs,
            labels=(labels >= 0.5).astype(int),
            sensitive_features=sensitive,
            model_version="v2.0-xgb",
        )
    )
    # Drift
    monitor = DriftMonitor(model_version="v2.0-xgb").fit(
        {"bat_exhaustion_mean": rng.normal(2.5, 0.5, 300)}
    )
    report = monitor.compute({"bat_exhaustion_mean": rng.normal(2.7, 0.5, 300)})
    cache.set_drift(report)


def test_audit_endpoints_return_empty_fallback() -> None:
    client = TestClient(app)
    # Reset in-memory cache (tests run in any order)
    cache = get_report_cache()
    cache._bias = None  # type: ignore[attr-defined]
    cache._calibration = None  # type: ignore[attr-defined]
    cache._drift = None  # type: ignore[attr-defined]

    r = client.get("/api/v1/burnout/audit/bias-report")
    assert r.status_code == 200
    body = r.json()
    assert body["overall_passes"] is True
    assert body["attribute_audits"] == []

    r = client.get("/api/v1/burnout/audit/calibration")
    assert r.status_code == 200
    assert "plot" in r.json()

    r = client.get("/api/v1/burnout/audit/drift")
    assert r.status_code == 200
    body = r.json()
    assert body["triggers_retrain"] is False


def test_audit_endpoints_return_seeded_reports() -> None:
    client = TestClient(app)
    _seed_cache()

    r = client.get("/api/v1/burnout/audit/calibration")
    assert r.status_code == 200
    body = r.json()
    assert body["model_version"] == "v2.0-xgb"
    assert body["method"] == "isotonic"
    assert "plot" in body
    assert len(body["plot"]["points"]) > 0

    r = client.get("/api/v1/burnout/audit/bias-report")
    assert r.status_code == 200
    body = r.json()
    assert body["model_version"] == "v2.0-xgb"
    assert len(body["attribute_audits"]) == 3

    r = client.get("/api/v1/burnout/audit/drift")
    assert r.status_code == 200
    body = r.json()
    assert body["model_version"] == "v2.0-xgb"
    assert body["overall_psi"] >= 0


def test_object_endpoint_404_without_db() -> None:
    """Without a DB pool, the objection endpoint short-circuits into the
    logging path and returns 200 with a ``received`` status — the actual row
    write is skipped. We assert the response shape here.
    """
    client = TestClient(app)
    payload = {
        "tenant_id": "11111111-1111-1111-1111-111111111111",
        "user_id": "22222222-2222-2222-2222-222222222222",
        "reason": "Bu tahmin benim durumumu yansıtmıyor.",
    }
    r = client.post(
        "/api/v1/burnout/predictions/33333333-3333-3333-3333-333333333333/object",
        json=payload,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "received"
    assert body["prediction_id"] == "33333333-3333-3333-3333-333333333333"
