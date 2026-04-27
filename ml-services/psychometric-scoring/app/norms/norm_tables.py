"""Norm table data structures and percentile lookup.

Norm tables are loaded from JSON at startup and cached in memory
(with optional Redis backing for multi-instance deployments).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np
from numpy.typing import NDArray

# In-memory norm table registry
_REGISTRY: dict[str, NormTable] = {}


@dataclass
class NormTable:
    """Holds norm distribution data for a single instrument version."""

    instrument: str
    version: str
    n: int
    percentile_distributions: dict[str, list[float]] = field(default_factory=dict)
    subscale_means: dict[str, float] = field(default_factory=dict)
    subscale_sds: dict[str, float] = field(default_factory=dict)
    cutoffs: dict[str, dict[str, float]] = field(default_factory=dict)
    collected_at: str | None = None
    citation: str = ""
    license: str = ""
    extra: dict[str, Any] = field(default_factory=dict)

    @property
    def key(self) -> str:
        return f"{self.instrument}:{self.version}"


def register_norm_table(table: NormTable) -> None:
    """Register a norm table in the in-memory registry."""
    _REGISTRY[table.key] = table


def get_norm_table(instrument: str, version: str) -> NormTable | None:
    """Retrieve a registered norm table by instrument and version."""
    key = f"{instrument}:{version}"
    return _REGISTRY.get(key)


def list_norm_tables() -> list[NormTable]:
    """Return all registered norm tables."""
    return list(_REGISTRY.values())


def compute_percentile_rank(
    score: float,
    distribution: list[float] | NDArray[np.floating],
) -> int:
    """Compute empirical percentile rank of score within distribution.

    Uses the "percentage at or below" method.
    """
    dist = np.asarray(distribution, dtype=float)
    dist = dist[~np.isnan(dist)]
    n = len(dist)
    if n == 0:
        return 50

    count_below = int(np.sum(dist < score))
    count_equal = int(np.sum(dist == score))

    percentile = (count_below + 0.5 * count_equal) / n * 100.0
    return max(0, min(100, round(percentile)))


async def get_norm_table_async(instrument: str, version: str) -> NormTable | None:
    """Async wrapper (for future Redis-backed lookup)."""
    return get_norm_table(instrument, version)


async def refresh_norms() -> None:
    """Refresh all norm tables from source (placeholder for Redis sync)."""
    # In production, this would reload from Redis or re-read JSON files
    pass
