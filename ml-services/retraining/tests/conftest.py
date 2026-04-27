"""Shared pytest fixtures for the retraining service tests."""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure the package under test is importable when pytest is invoked from the repo root.
_HERE = Path(__file__).resolve().parent.parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))
