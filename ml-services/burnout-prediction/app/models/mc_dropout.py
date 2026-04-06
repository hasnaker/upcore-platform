"""MC-Dropout inference utilities.

Implements Monte Carlo Dropout for uncertainty estimation.
At inference time, dropout layers remain active and multiple
forward passes produce a distribution over predictions.

Gal & Ghahramani (2016): "Dropout as a Bayesian Approximation"

Model type: Used by heuristic_v0.1 (simulated) and LSTM (native)
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import structlog

logger = structlog.get_logger()


@dataclass
class MCDropoutConfig:
    """Configuration for MC-Dropout inference."""

    n_samples: int = 30
    dropout_rate: float = 0.2
    confidence_level: float = 0.95


@dataclass
class MCDropoutResult:
    """Result of MC-Dropout inference for a single output."""

    mean: float
    ci_lower: float
    ci_upper: float
    std: float
    samples: list[float]


def mc_forward_n_times(
    predict_fn: callable,
    inputs: np.ndarray,
    n_samples: int = 30,
    dropout_rate: float = 0.2,
) -> np.ndarray:
    """Run N forward passes with dropout active.

    For heuristic_v0.1: simulates dropout by adding scaled noise.
    For LSTM: will call model.mc_predict() with actual dropout layers.

    Args:
        predict_fn: Function that takes inputs and returns predictions.
        inputs: Input array.
        n_samples: Number of MC samples.
        dropout_rate: Dropout probability.

    Returns:
        Array of shape (n_samples, *output_shape).
    """
    results = []

    for i in range(n_samples):
        # Apply dropout mask to input (heuristic simulation)
        mask = np.random.binomial(1, 1 - dropout_rate, size=inputs.shape).astype(np.float32)
        masked_input = inputs * mask / (1 - dropout_rate)  # Scale to maintain expectation

        prediction = predict_fn(masked_input)
        results.append(prediction)

    return np.array(results)


def compute_prediction_statistics(
    samples: np.ndarray,
    confidence_level: float = 0.95,
) -> MCDropoutResult:
    """Compute mean, CI, and std from MC samples.

    Args:
        samples: Array of shape (n_samples,) or (n_samples, 1).
        confidence_level: Confidence level for interval (default 0.95).

    Returns:
        MCDropoutResult with statistics.
    """
    samples_flat = samples.flatten()
    alpha = (1 - confidence_level) / 2

    lower_percentile = alpha * 100
    upper_percentile = (1 - alpha) * 100

    mean_val = float(np.mean(samples_flat))
    ci_lower = float(np.percentile(samples_flat, lower_percentile))
    ci_upper = float(np.percentile(samples_flat, upper_percentile))
    std_val = float(np.std(samples_flat))

    return MCDropoutResult(
        mean=mean_val,
        ci_lower=ci_lower,
        ci_upper=ci_upper,
        std=std_val,
        samples=samples_flat.tolist(),
    )


def validate_mc_results(result: MCDropoutResult) -> list[str]:
    """Validate MC-Dropout results for sanity.

    Returns:
        List of warning messages (empty if all checks pass).
    """
    warnings: list[str] = []

    if result.ci_upper <= result.ci_lower:
        warnings.append("CI upper bound is not greater than lower bound")

    if result.std == 0.0:
        warnings.append("Zero standard deviation — model may not have active dropout")

    if result.mean < result.ci_lower or result.mean > result.ci_upper:
        warnings.append("Mean falls outside confidence interval")

    if result.ci_upper - result.ci_lower > 0.8:
        warnings.append("Very wide confidence interval — prediction is highly uncertain")

    if len(result.samples) < 10:
        warnings.append(f"Only {len(result.samples)} MC samples — consider increasing n_samples")

    return warnings
