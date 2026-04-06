"""Thompson sampling for intervention effectiveness learning.

Maintains Beta-Binomial posteriors per (intervention_id, tenant_segment,
burnout_band) tuple. Uses conjugate Beta(alpha, beta) priors updated
on each observed outcome.

Thompson (1933), Chapelle & Li (2011): "An Empirical Evaluation of
Thompson Sampling"

Model type: heuristic_v0.1 (Bayesian online learning, no heuristic override needed)
"""

from __future__ import annotations

import numpy as np
import structlog
from scipy import stats

logger = structlog.get_logger()


def sample_posterior(alpha: float, beta: float) -> float:
    """Draw a single sample from Beta(alpha, beta) posterior.

    Args:
        alpha: Success count + prior alpha.
        beta: Failure count + prior beta.

    Returns:
        Single sample from Beta distribution in [0, 1].
    """
    return float(np.random.beta(alpha, beta))


def sample_batch(posteriors: list[tuple[float, float]]) -> list[float]:
    """Draw samples from multiple Beta posteriors simultaneously.

    Args:
        posteriors: List of (alpha, beta) tuples.

    Returns:
        List of samples, one per posterior.
    """
    return [float(np.random.beta(a, b)) for a, b in posteriors]


def posterior_mean(alpha: float, beta: float) -> float:
    """Compute posterior mean of Beta(alpha, beta).

    E[X] = alpha / (alpha + beta)
    """
    total = alpha + beta
    if total == 0:
        return 0.5
    return alpha / total


def credible_interval(
    alpha: float,
    beta: float,
    level: float = 0.95,
) -> tuple[float, float]:
    """Compute credible interval for Beta(alpha, beta).

    Args:
        alpha: Alpha parameter.
        beta: Beta parameter.
        level: Credible interval level (default 0.95).

    Returns:
        Tuple of (lower, upper) bounds.
    """
    tail = (1 - level) / 2
    lower = float(stats.beta.ppf(tail, alpha, beta))
    upper = float(stats.beta.ppf(1 - tail, alpha, beta))
    return (lower, upper)


def select_top_k_thompson(
    candidates: list[dict],
    posteriors: dict[str, tuple[float, float]],
    k: int = 5,
) -> list[dict]:
    """Select top-K candidates using Thompson sampling.

    For each candidate, draw from its posterior and rank by sampled value.
    This balances exploration (uncertain interventions) and exploitation
    (known-effective ones).

    Args:
        candidates: List of candidate dicts with 'intervention_id'.
        posteriors: Dict of intervention_id -> (alpha, beta).
        k: Number to select.

    Returns:
        Top-K candidates sorted by Thompson sample (descending).
    """
    scored: list[tuple[float, dict]] = []

    for candidate in candidates:
        iid = str(candidate.get("intervention_id", ""))
        ab = posteriors.get(iid, (1.0, 1.0))  # Default prior
        sample = sample_posterior(ab[0], ab[1])
        scored.append((sample, candidate))

    scored.sort(key=lambda x: x[0], reverse=True)

    return [item[1] | {"thompson_sample": item[0]} for item in scored[:k]]


def update_posterior(
    alpha: float,
    beta: float,
    success: bool,
) -> tuple[float, float]:
    """Update Beta posterior with a new observation.

    Conjugate update:
    - Success: alpha += 1
    - Failure: beta += 1

    Args:
        alpha: Current alpha.
        beta: Current beta.
        success: Whether the intervention was successful.

    Returns:
        Updated (alpha, beta) tuple.
    """
    if success:
        return (alpha + 1.0, beta)
    else:
        return (alpha, beta + 1.0)


def compute_effectiveness_summary(
    alpha: float,
    beta: float,
) -> dict[str, float]:
    """Compute summary statistics for an intervention's effectiveness.

    Returns:
        Dict with mean, ci_lower, ci_upper, variance, total_observations.
    """
    mean = posterior_mean(alpha, beta)
    ci = credible_interval(alpha, beta)
    total = alpha + beta - 2  # Subtract prior (1,1)
    variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1))

    return {
        "mean": round(mean, 4),
        "ci_lower": round(ci[0], 4),
        "ci_upper": round(ci[1], 4),
        "variance": round(float(variance), 6),
        "total_observations": max(0, int(total)),
    }
