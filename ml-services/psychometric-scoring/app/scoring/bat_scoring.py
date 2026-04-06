"""BAT-12-TR deterministic scorer.

Subscales (Kocak, Gencay & Schaufeli 2022):
  - Exhaustion:            items bat_01 - bat_03
  - Mental Distance:       items bat_04 - bat_06
  - Cognitive Impairment:  items bat_07 - bat_09
  - Emotional Impairment:  items bat_10 - bat_12
  - Total = mean of 4 subscale means

Cut-offs (European provisional, Schaufeli 2020):
  GREEN  <= 2.58
  AMBER  2.59 - 3.01
  RED    >= 3.02
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from statistics import mean
from typing import Literal

import numpy as np

from app import __version__
from app.core.exceptions import InvalidResponseError
from app.psychometrics.classifiers import classify_traffic_light
from app.psychometrics.percentiles import empirical_percentile
from app.reliability.cronbach import cronbach_alpha, interpret_alpha
from app.schemas.bat import (
    BAT_ITEM_KEYS,
    BATClassifications,
    BATPercentiles,
    BATScoreResponse,
    BATSubscaleScores,
)
from app.schemas.common import (
    CalibrationStatus,
    ConfidenceLevel,
    ReliabilityInfo,
    ScoringMetadata,
    TrafficLight,
)

_SUBSCALE_MAP: dict[str, list[str]] = {
    "exhaustion": ["bat_01", "bat_02", "bat_03"],
    "mental_distance": ["bat_04", "bat_05", "bat_06"],
    "cognitive_impairment": ["bat_07", "bat_08", "bat_09"],
    "emotional_impairment": ["bat_10", "bat_11", "bat_12"],
}

_NORMS_CACHE: dict[str, dict[str, object]] | None = None


def _load_norms(data_dir: str = "data") -> dict[str, object]:
    global _NORMS_CACHE
    if _NORMS_CACHE is not None:
        return _NORMS_CACHE
    norms_path = Path(data_dir) / "european_norms.json"
    if norms_path.exists():
        with open(norms_path) as f:
            _NORMS_CACHE = json.load(f)
            return _NORMS_CACHE
    return {}


def impute_missing(
    responses: dict[str, int],
    max_missing: int = 2,
    allow_imputation: bool = True,
) -> tuple[dict[str, int], list[str]]:
    """Impute up to max_missing items with subscale mean.

    Returns (imputed_responses, list_of_imputed_keys).
    Raises InvalidResponseError when too many items are missing.
    """
    provided = {k for k in BAT_ITEM_KEYS if k in responses}
    missing = [k for k in BAT_ITEM_KEYS if k not in responses]

    if len(missing) > max_missing:
        raise InvalidResponseError(
            f"Too many missing BAT items ({len(missing)} > {max_missing}). "
            f"Missing: {missing}",
            details={"missing_items": missing, "max_allowed": max_missing},
        )

    if not missing:
        return dict(responses), []

    if not allow_imputation:
        raise InvalidResponseError(
            f"Missing BAT items {missing} and imputation disabled.",
            details={"missing_items": missing},
        )

    imputed = dict(responses)
    imputed_keys: list[str] = []

    for item_key in missing:
        subscale = _find_subscale(item_key)
        subscale_items = _SUBSCALE_MAP[subscale]
        present_values = [responses[k] for k in subscale_items if k in responses]
        if not present_values:
            raise InvalidResponseError(
                f"Cannot impute {item_key}: no items present in subscale {subscale}.",
                details={"item": item_key, "subscale": subscale},
            )
        imputed[item_key] = round(mean(present_values))
        imputed_keys.append(item_key)

    return imputed, imputed_keys


def _find_subscale(item_key: str) -> str:
    for subscale, items in _SUBSCALE_MAP.items():
        if item_key in items:
            return subscale
    raise InvalidResponseError(f"Unknown BAT item key: {item_key}")


def compute_subscale_means(responses: dict[str, int]) -> dict[str, float]:
    """Compute arithmetic mean for each subscale."""
    scores: dict[str, float] = {}
    for subscale, items in _SUBSCALE_MAP.items():
        values = [float(responses[k]) for k in items]
        scores[subscale] = mean(values)
    return scores


def compute_total(subscale_scores: dict[str, float]) -> float:
    """Total BAT score = mean of 4 subscale means."""
    return mean(subscale_scores.values())


def classify_bat_subscale(score: float, cutoffs: dict[str, float]) -> TrafficLight:
    """Classify a BAT subscale score using provided cutoffs."""
    return classify_traffic_light(score, cutoffs)


def compute_bat_percentile(
    score: float, subscale: str, data_dir: str = "data"
) -> int:
    """Look up empirical percentile from norm distribution."""
    norms = _load_norms(data_dir)
    distributions = norms.get("percentile_distributions", {})
    dist = distributions.get(subscale)
    if not dist:
        return 50  # default when norms unavailable
    return empirical_percentile(score, np.array(dist, dtype=float))


def score_bat12(
    responses: dict[str, int],
    norm_version: str = "bat12-tr-provisional-v0.1",
    allow_imputation: bool = True,
    data_dir: str = "data",
) -> tuple[dict[str, object], list[str]]:
    """Score BAT-12-TR responses.

    Returns (result_dict, imputed_items).
    The result_dict contains all fields needed for BATScoreResponse construction.
    """
    norms = _load_norms(data_dir)
    cutoffs = norms.get("cutoffs", {})

    # Validate and impute
    clean, imputed_keys = impute_missing(
        responses, max_missing=2, allow_imputation=allow_imputation
    )

    # Compute subscale means
    subscale_scores = compute_subscale_means(clean)
    total = compute_total(subscale_scores)

    # Classify
    classifications: dict[str, TrafficLight] = {}
    for subscale, score in subscale_scores.items():
        sub_cutoffs = cutoffs.get(subscale, {})
        classifications[subscale] = classify_bat_subscale(score, sub_cutoffs)
    total_cutoffs = cutoffs.get("total", {})
    classifications["total"] = classify_bat_subscale(total, total_cutoffs)

    # Percentiles
    percentiles: dict[str, int] = {}
    for subscale, score in subscale_scores.items():
        percentiles[subscale] = compute_bat_percentile(score, subscale, data_dir)
    percentiles["total"] = compute_bat_percentile(total, "total", data_dir)

    # Reliability (single-respondent — alpha requires 2+ respondents)
    item_values = [float(clean[k]) for k in BAT_ITEM_KEYS]
    alpha = cronbach_alpha(np.array([item_values]))  # single row => None

    reliability = ReliabilityInfo(
        cronbach_alpha=alpha,
        n_items=12,
        interpretation=interpret_alpha(alpha),
        warning=alpha is not None and alpha < 0.70,
    )

    metadata = ScoringMetadata(
        service_version=__version__,
        scored_at=datetime.now(UTC),
        scorer="bat-12-tr",
        norm_version=norm_version,
        confidence=ConfidenceLevel.PROVISIONAL,
        calibration_status=CalibrationStatus.PROVISIONAL,
        notes="European provisional norms. Turkish norms pending N>=2000.",
    )

    return {
        "subscales": BATSubscaleScores(**subscale_scores),
        "total_score": total,
        "classifications": BATClassifications(**classifications),
        "percentiles": BATPercentiles(**percentiles),
        "reliability": reliability,
        "metadata": metadata,
    }, imputed_keys
