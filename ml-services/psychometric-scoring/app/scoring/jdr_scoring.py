"""JD-R balance scorer v0.1.

Implements the Job Demands-Resources model using meta-analytic weights
from Crawford et al. (2010) and Lesener et al. (2019).

Equations:
  Engagement = w1*Resources_z + w2*PersonalResources_z
    w1 = 0.48 (Crawford 2010), w2 = 0.39 (Lesener 2019)

  Strain = w3*Demands_z - w4*Resources_z
    w3 = 0.51 (Crawford 2010), w4 = -0.32 (Crawford 2010, negative effect)

  Interaction = beta * Demands_z * Resources_z
    beta = -0.05 (weakly supported, Van Veldhoven 2020)

  Balance = Resources_z - Demands_z (simple index)

  Burnout probability (heuristic):
    logit = 0.42*demands_z - 0.35*resources_z + beta_interaction
    p = sigmoid(logit)
"""

from __future__ import annotations

import math
from datetime import UTC, datetime

from app import __version__
from app.schemas.common import CalibrationStatus, ConfidenceLevel, ScoringMetadata

# Crawford (2010) meta-analytic weights
W_RESOURCES_ENGAGEMENT: float = 0.48
W_PERSONAL_RESOURCES_ENGAGEMENT: float = 0.39
W_DEMANDS_STRAIN: float = 0.51
W_RESOURCES_STRAIN: float = -0.32

# Burnout probability logistic coefficients (heuristic v0.1)
BETA_DEMANDS: float = 0.42
BETA_RESOURCES: float = -0.35
BETA_INTERACTION: float = -0.05

MODEL_VERSION: str = "jdr-v0.1"


def compute_engagement(resources_z: float, personal_resources_z: float | None) -> float:
    """Compute engagement score from resources z-scores.

    Engagement = 0.48 * resources_z + 0.39 * personal_resources_z
    When personal_resources_z is None, uses resources_z only.
    """
    pr = personal_resources_z if personal_resources_z is not None else 0.0
    return W_RESOURCES_ENGAGEMENT * resources_z + W_PERSONAL_RESOURCES_ENGAGEMENT * pr


def compute_strain(demands_z: float, resources_z: float) -> float:
    """Compute strain score.

    Strain = 0.51 * demands_z + (-0.32) * resources_z
    Higher strain = worse.
    """
    return W_DEMANDS_STRAIN * demands_z + W_RESOURCES_STRAIN * resources_z


def compute_interaction(demands_z: float, resources_z: float) -> float:
    """Compute demand x resource interaction effect.

    Weakly supported (beta=-0.05). Flagged as heuristic.
    """
    return BETA_INTERACTION * demands_z * resources_z


def compute_balance_ratio(demands_z: float, resources_z: float) -> float:
    """Simple balance index = resources_z - demands_z.

    Positive values indicate favorable balance.
    """
    return resources_z - demands_z


def _sigmoid(x: float) -> float:
    """Numerically stable sigmoid function."""
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def compute_burnout_probability(
    demands_z: float,
    resources_z: float,
    personal_resources_z: float | None = None,
) -> float:
    """Heuristic burnout probability via logistic model.

    logit = 0.42*demands_z - 0.35*resources_z - 0.05*(demands_z*resources_z)
    p = sigmoid(logit)

    When personal_resources_z is provided, it contributes to the resources
    effect: effective_resources = resources_z + 0.3*personal_resources_z.
    """
    eff_resources = resources_z
    if personal_resources_z is not None:
        eff_resources = resources_z + 0.3 * personal_resources_z

    logit = (
        BETA_DEMANDS * demands_z
        + BETA_RESOURCES * eff_resources
        + BETA_INTERACTION * demands_z * eff_resources
    )
    return _sigmoid(logit)


def score_jdr(
    demands_z: float,
    resources_z: float,
    personal_resources_z: float | None = None,
    norm_version: str = "jdr-meta-analytic-v0.1",
) -> dict[str, object]:
    """Score JD-R balance.

    All inputs are z-scored values relative to norms.

    Returns dict with all fields for JDRScoreResponse construction.
    """
    engagement = compute_engagement(resources_z, personal_resources_z)
    strain = compute_strain(demands_z, resources_z)
    interaction = compute_interaction(demands_z, resources_z)
    balance = compute_balance_ratio(demands_z, resources_z)
    burnout_prob = compute_burnout_probability(
        demands_z, resources_z, personal_resources_z
    )

    coefficients = {
        "w_resources_engagement": W_RESOURCES_ENGAGEMENT,
        "w_personal_resources_engagement": W_PERSONAL_RESOURCES_ENGAGEMENT,
        "w_demands_strain": W_DEMANDS_STRAIN,
        "w_resources_strain": W_RESOURCES_STRAIN,
        "beta_demands": BETA_DEMANDS,
        "beta_resources": BETA_RESOURCES,
        "beta_interaction": BETA_INTERACTION,
    }

    metadata = ScoringMetadata(
        service_version=__version__,
        scored_at=datetime.now(UTC),
        scorer="jd-r-v0.1",
        norm_version=norm_version,
        confidence=ConfidenceLevel.HEURISTIC,
        calibration_status=CalibrationStatus.HEURISTIC_V01,
        notes=(
            "v0.1 heuristic. Coefficients from Crawford (2010) meta-analysis. "
            "Interaction beta=-0.05 weakly supported. NOT calibrated on Turkish population."
        ),
    )

    return {
        "burnout_probability": round(burnout_prob, 6),
        "balance_index": round(balance, 4),
        "engagement_score": round(engagement, 4),
        "strain_score": round(strain, 4),
        "interaction_effect": round(interaction, 6),
        "calibration_status": CalibrationStatus.HEURISTIC_V01,
        "coefficients": coefficients,
        "metadata": metadata,
    }
