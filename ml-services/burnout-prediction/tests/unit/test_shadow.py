"""Tests for the shadow-mode router + prospective AUC helpers."""

from __future__ import annotations

from uuid import UUID, uuid4

import numpy as np
import pytest

from app.shadow import (
    ShadowJoinedRecord,
    ShadowRouter,
    compute_shadow_auc,
)


@pytest.mark.asyncio
async def test_shadow_router_returns_production_only() -> None:
    async def prod_fn(features):
        return {"probability": 0.3, "model": "prod"}

    async def shadow_fn(features):
        return {"probability": 0.7, "model": "challenger"}

    router = ShadowRouter(
        prod_fn=prod_fn,
        shadow_fn=shadow_fn,
        challenger_model_version="v2.0-xgb",
    )
    out = await router.run(
        tenant_id=uuid4(),
        user_id=uuid4(),
        features={"bat_exhaustion_mean": 3.1},
    )
    # The user never sees the shadow prediction
    assert out["model"] == "prod"
    assert out["probability"] == 0.3


@pytest.mark.asyncio
async def test_shadow_router_survives_challenger_exception() -> None:
    async def prod_fn(_):
        return {"probability": 0.5}

    async def shadow_fn(_):
        raise RuntimeError("challenger crashed")

    router = ShadowRouter(prod_fn=prod_fn, shadow_fn=shadow_fn, challenger_model_version="v2")
    # Should not raise — shadow failure must never break the user request.
    out = await router.run(tenant_id=uuid4(), user_id=uuid4(), features={})
    assert out["probability"] == 0.5


def test_compute_shadow_auc_empty_returns_none() -> None:
    assert compute_shadow_auc([]) is None


def test_compute_shadow_auc_perfect_separation() -> None:
    records = [
        ShadowJoinedRecord(
            prediction_id=UUID(int=i),
            model_version="v2",
            predicted_probability=p,
            outcome_actual=y,
            days_to_outcome=90,
        )
        for i, (p, y) in enumerate(
            [(0.1, 0), (0.2, 0), (0.3, 0), (0.7, 1), (0.8, 1), (0.9, 1)]
        )
    ]
    metrics = compute_shadow_auc(records)
    assert metrics is not None
    assert metrics.auroc == pytest.approx(1.0)


def test_compute_shadow_auc_random_is_half() -> None:
    rng = np.random.default_rng(0)
    records = [
        ShadowJoinedRecord(
            prediction_id=UUID(int=i),
            model_version="v2",
            predicted_probability=float(rng.random()),
            outcome_actual=int(rng.integers(0, 2)),
            days_to_outcome=90,
        )
        for i in range(400)
    ]
    metrics = compute_shadow_auc(records)
    assert metrics is not None
    assert 0.3 <= metrics.auroc <= 0.7
