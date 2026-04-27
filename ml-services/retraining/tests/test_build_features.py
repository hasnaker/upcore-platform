"""Unit tests for the burnout retraining feature builder.

We avoid importing the full `train_burnout` module at collection time so the
tests do not pull in TensorFlow (which is optional in CI).  The `build_features`
function itself only needs numpy + pandas.
"""
from __future__ import annotations

import importlib
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest


@pytest.fixture(scope="module")
def build_features():
    # Import lazily and by path so pytest can collect from a monorepo root.
    here = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(here))
    mod = importlib.import_module("train_burnout")
    return mod.build_features


def _frame(n: int = 4, extra: dict | None = None) -> pd.DataFrame:
    base = {
        "bat_exhaustion": [0.5] * n,
        "bat_cynicism": [0.3] * n,
        "bat_efficacy": [0.6] * n,
        "bat_overall": [0.55] * n,
        "copsoq_workload": [0.7] * n,
        "copsoq_conflict": [0.2] * n,
        "copsoq_support": [0.8] * n,
        "uwes_vigor": [0.6] * n,
        "uwes_dedication": [0.65] * n,
        "uwes_absorption": [0.55] * n,
        "overtime_ytd_hours": [120] * n,
        "leave_days_used": [8] * n,
        "risk_90d": [0.1, 0.8, 0.5, 0.95][:n],
    }
    if extra:
        base.update(extra)
    return pd.DataFrame(base)


def test_build_features_shape(build_features):
    df = _frame(n=4)
    X, y = build_features(df)
    assert X.shape == (4, 6, 12), f"unexpected tensor shape: {X.shape}"
    assert y.shape == (4,)


def test_build_features_label_threshold(build_features):
    df = _frame(n=4)
    _, y = build_features(df)
    # risk_90d threshold is 0.75; only rows 1 and 3 qualify.
    assert list(y) == [0, 1, 0, 1]


def test_build_features_raises_on_missing_column(build_features):
    df = _frame(n=2).drop(columns=["bat_exhaustion"])
    with pytest.raises(ValueError, match="Missing columns"):
        build_features(df)


def test_build_features_fills_nans(build_features):
    df = _frame(n=2)
    df.loc[0, "bat_exhaustion"] = np.nan
    X, _ = build_features(df)
    # The NaN in the first row's first feature must be replaced with 0 on all 6 timesteps.
    assert np.all(X[0, :, 0] == 0)
