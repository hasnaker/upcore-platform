"""Tests for the model registry + artifact store + rollback path.

Focuses on the local JSON registry path used in CI. MLflow / S3 are exercised
only when the corresponding env vars are set (boto3 + mlflow import guarded).
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.registry import ModelRegistry, ModelRegistryError


def _make_registry(tmp_path: Path) -> ModelRegistry:
    return ModelRegistry(mlflow_tracking_uri=None, s3_bucket=None, local_root=tmp_path)


def _write_fake_artifact(tmp_path: Path) -> Path:
    p = tmp_path / "model.bin"
    p.write_bytes(b"fake-xgb-bytes")
    return p


def test_register_then_list(tmp_path: Path) -> None:
    registry = _make_registry(tmp_path)
    artifact = _write_fake_artifact(tmp_path)
    mv = registry.register(
        version="v2.0",
        artifact_path=artifact,
        metrics={"auroc": 0.81},
        params={"max_depth": "6"},
    )
    assert mv.stage == "staging"
    assert mv.version == "v2.0"
    versions = registry.list_versions()
    assert len(versions) == 1


def test_promote_and_get_production(tmp_path: Path) -> None:
    registry = _make_registry(tmp_path)
    a = _write_fake_artifact(tmp_path)
    registry.register(version="v1", artifact_path=a, metrics={"auroc": 0.75})
    registry.register(version="v2", artifact_path=a, metrics={"auroc": 0.82})

    registry.promote_to_production(name=ModelRegistry.DEFAULT_NAME, version="v2")
    prod = registry.get_production()
    assert prod is not None and prod.version == "v2"
    assert prod.stage == "production"


def test_rollback_restores_previous_production(tmp_path: Path) -> None:
    registry = _make_registry(tmp_path)
    a = _write_fake_artifact(tmp_path)
    registry.register(version="v1", artifact_path=a, metrics={"auroc": 0.75})
    registry.register(version="v2", artifact_path=a, metrics={"auroc": 0.82})

    registry.promote_to_production(name=ModelRegistry.DEFAULT_NAME, version="v1")
    registry.promote_to_production(name=ModelRegistry.DEFAULT_NAME, version="v2")
    # Now v2 is prod, v1 is archived.
    rolled = registry.rollback_to_previous_production()
    assert rolled.version == "v1"
    prod = registry.get_production()
    assert prod is not None and prod.version == "v1"


def test_rollback_errors_when_no_history(tmp_path: Path) -> None:
    registry = _make_registry(tmp_path)
    a = _write_fake_artifact(tmp_path)
    registry.register(version="v1", artifact_path=a)
    registry.promote_to_production(name=ModelRegistry.DEFAULT_NAME, version="v1")
    with pytest.raises(ModelRegistryError):
        registry.rollback_to_previous_production()
