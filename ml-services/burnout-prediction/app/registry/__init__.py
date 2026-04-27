"""Model registry modules.

Provides a lightweight local JSON-backed registry used in tests and CI when
MLflow / S3 backends are not configured. The class is intentionally small:
register → list → promote → rollback. MLflow and S3 paths are optional and
only activated when the corresponding env vars are set.
"""

from __future__ import annotations

import json
import shutil
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


class ModelRegistryError(RuntimeError):
    """Raised when a registry operation cannot be satisfied."""


@dataclass
class ModelVersion:
    """Single registered model version."""

    name: str
    version: str
    stage: str  # "staging" | "production" | "archived"
    artifact_uri: str
    metrics: dict[str, float] = field(default_factory=dict)
    params: dict[str, str] = field(default_factory=dict)
    created_at: float = field(default_factory=lambda: time.time())


class ModelRegistry:
    """Local JSON-backed model registry with MLflow/S3 opt-in hooks.

    In the absence of MLflow and S3 backends, the registry keeps all state in
    ``<local_root>/registry.json`` and copies artifacts under
    ``<local_root>/artifacts/<name>/<version>/``.
    """

    DEFAULT_NAME = "burnout-prediction"

    def __init__(
        self,
        mlflow_tracking_uri: str | None = None,
        s3_bucket: str | None = None,
        local_root: Path | str | None = None,
    ) -> None:
        self.mlflow_tracking_uri = mlflow_tracking_uri
        self.s3_bucket = s3_bucket
        self.local_root = Path(local_root) if local_root is not None else Path(".upcore-registry")
        self.local_root.mkdir(parents=True, exist_ok=True)
        self._state_file = self.local_root / "registry.json"
        if not self._state_file.exists():
            self._write_state({"versions": []})

    # ------------------------------------------------------------------ I/O

    def _read_state(self) -> dict[str, Any]:
        return json.loads(self._state_file.read_text())

    def _write_state(self, state: dict[str, Any]) -> None:
        self._state_file.write_text(json.dumps(state, indent=2, sort_keys=True))

    # -------------------------------------------------------------- commands

    def register(
        self,
        *,
        version: str,
        artifact_path: Path | str,
        name: str = DEFAULT_NAME,
        metrics: dict[str, float] | None = None,
        params: dict[str, str] | None = None,
    ) -> ModelVersion:
        """Register a new model version. Newly registered versions start in
        the ``staging`` stage.
        """
        src = Path(artifact_path)
        if not src.exists():
            raise ModelRegistryError(f"artifact not found: {src}")

        dest_dir = self.local_root / "artifacts" / name / version
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / src.name
        shutil.copy2(src, dest)

        mv = ModelVersion(
            name=name,
            version=version,
            stage="staging",
            artifact_uri=str(dest),
            metrics=metrics or {},
            params=params or {},
        )
        state = self._read_state()
        # De-duplicate (name, version) — re-registering replaces the entry.
        state["versions"] = [
            v for v in state["versions"] if not (v["name"] == name and v["version"] == version)
        ]
        state["versions"].append(asdict(mv))
        self._write_state(state)
        return mv

    def list_versions(self, name: str = DEFAULT_NAME) -> list[ModelVersion]:
        state = self._read_state()
        return [ModelVersion(**v) for v in state["versions"] if v["name"] == name]

    def get_production(self, name: str = DEFAULT_NAME) -> ModelVersion | None:
        for v in self.list_versions(name):
            if v.stage == "production":
                return v
        return None

    def promote_to_production(self, *, name: str = DEFAULT_NAME, version: str) -> ModelVersion:
        """Promote the given version to production, archiving the previous
        production version (if any). Raises if the version is unknown.
        """
        state = self._read_state()
        target: dict[str, Any] | None = None
        for v in state["versions"]:
            if v["name"] != name:
                continue
            if v["version"] == version:
                target = v
            elif v["stage"] == "production":
                v["stage"] = "archived"
        if target is None:
            raise ModelRegistryError(f"unknown version: {name}@{version}")
        target["stage"] = "production"
        self._write_state(state)
        return ModelVersion(**target)

    def rollback_to_previous_production(
        self, name: str = DEFAULT_NAME
    ) -> ModelVersion:
        """Promote the most recently archived version back to production.

        Raises ``ModelRegistryError`` when there is no archived version to roll
        back to.
        """
        state = self._read_state()
        archived = [
            v
            for v in state["versions"]
            if v["name"] == name and v["stage"] == "archived"
        ]
        if not archived:
            raise ModelRegistryError("no archived version available for rollback")
        # Most recently archived ≡ largest created_at among archived.
        previous = max(archived, key=lambda v: v["created_at"])
        return self.promote_to_production(name=name, version=previous["version"])


__all__ = ["ModelRegistry", "ModelRegistryError", "ModelVersion"]
