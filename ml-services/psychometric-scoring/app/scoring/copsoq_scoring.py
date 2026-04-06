"""COPSOQ-III-TR 40-item scorer.

Turkish validation: Sahan, Baydur & Demiral (2019), CFI=0.98.

40 items across 13 subscales grouped into:
  - Demands (3 subscales)
  - Resources (7 subscales)
  - Outcomes (3 subscales, note: 2 in manifest but data has 3 including engagement)

Scoring: linear transform to 0-100 scale per subscale.
  score_0_100 = ((raw_mean - min_val) / (max_val - min_val)) * 100

Cut-offs (demands: higher=worse, resources/outcomes: higher=better):
  Demands:   GREEN <= 40, AMBER 40-60, RED > 60
  Resources: GREEN >= 60, AMBER 40-60, RED < 40
  Outcomes:  GREEN >= 60, AMBER 40-60, RED < 40
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from statistics import mean

import numpy as np

from app import __version__
from app.reliability.cronbach import cronbach_alpha, interpret_alpha
from app.schemas.common import (
    CalibrationStatus,
    ConfidenceLevel,
    ReliabilityInfo,
    ScoringMetadata,
    TrafficLight,
)
from app.schemas.copsoq import COPSOQ_ITEM_KEYS, COPSOQSubscaleScore

_ITEMS_CACHE: dict[str, object] | None = None


def _load_items(data_dir: str = "data") -> dict[str, object]:
    global _ITEMS_CACHE
    if _ITEMS_CACHE is not None:
        return _ITEMS_CACHE
    path = Path(data_dir) / "copsoq_items_tr.json"
    if path.exists():
        with open(path) as f:
            _ITEMS_CACHE = json.load(f)
            return _ITEMS_CACHE
    return {}


def transform_to_100(raw_mean: float, min_val: int = 1, max_val: int = 5) -> float:
    """Linear transform a raw subscale mean to 0-100 scale.

    score = ((raw_mean - min_val) / (max_val - min_val)) * 100
    """
    if max_val == min_val:
        return 0.0
    return ((raw_mean - min_val) / (max_val - min_val)) * 100.0


def _classify_demand(score_0_100: float) -> TrafficLight:
    """For demand subscales, higher scores = worse."""
    if score_0_100 <= 40.0:
        return TrafficLight.GREEN
    if score_0_100 <= 60.0:
        return TrafficLight.AMBER
    return TrafficLight.RED


def _classify_resource_or_outcome(score_0_100: float) -> TrafficLight:
    """For resource/outcome subscales, higher scores = better."""
    if score_0_100 >= 60.0:
        return TrafficLight.GREEN
    if score_0_100 >= 40.0:
        return TrafficLight.AMBER
    return TrafficLight.RED


def _classify_subscale(score_0_100: float, dimension: str) -> TrafficLight:
    if dimension == "demands":
        return _classify_demand(score_0_100)
    return _classify_resource_or_outcome(score_0_100)


def score_copsoq(
    responses: dict[str, int],
    norm_version: str = "copsoq-iii-tr-v1.0",
    data_dir: str = "data",
) -> dict[str, object]:
    """Score COPSOQ-III-TR responses.

    Returns dict with all fields for COPSOQScoreResponse construction.
    """
    items_data = _load_items(data_dir)
    subscales_def = items_data.get("subscales", {})

    subscale_results: list[COPSOQSubscaleScore] = []
    demand_scores: list[float] = []
    resource_scores: list[float] = []

    for subscale_id, subscale_info in subscales_def.items():
        items = subscale_info.get("items", [])
        dimension = subscale_info.get("dimension", "demands")
        name_tr = subscale_info.get("name_tr", subscale_id)

        # Collect values for this subscale
        values = [float(responses[k]) for k in items if k in responses]
        if not values:
            continue

        raw_mean = mean(values)
        score_100 = round(transform_to_100(raw_mean, 1, 5), 2)
        classification = _classify_subscale(score_100, dimension)

        subscale_results.append(
            COPSOQSubscaleScore(
                subscale_id=subscale_id,
                name_tr=name_tr,
                score_0_100=score_100,
                classification=classification,
                dimension=dimension,
            )
        )

        if dimension == "demands":
            demand_scores.append(score_100)
        elif dimension == "resources":
            resource_scores.append(score_100)

    # Aggregate indices
    demands_index = round(mean(demand_scores), 2) if demand_scores else 0.0
    resources_index = round(mean(resource_scores), 2) if resource_scores else 0.0

    # Reliability
    all_values = [float(responses.get(k, 0)) for k in COPSOQ_ITEM_KEYS]
    alpha = cronbach_alpha(np.array([all_values]))

    reliability = ReliabilityInfo(
        cronbach_alpha=alpha,
        n_items=len([k for k in COPSOQ_ITEM_KEYS if k in responses]),
        interpretation=interpret_alpha(alpha),
        warning=alpha is not None and alpha < 0.70,
    )

    metadata = ScoringMetadata(
        service_version=__version__,
        scored_at=datetime.now(UTC),
        scorer="copsoq-iii-tr",
        norm_version=norm_version,
        confidence=ConfidenceLevel.VALIDATED,
        calibration_status=CalibrationStatus.TURKISH_VALIDATED,
        notes="Turkish validation Sahan et al. 2019, CFI=0.98.",
    )

    return {
        "subscales": subscale_results,
        "demands_index": demands_index,
        "resources_index": resources_index,
        "reliability": reliability,
        "metadata": metadata,
    }
