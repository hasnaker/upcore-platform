"""Temperature scaling calibration for burnout predictions.

Implements post-hoc calibration using temperature scaling
(Guo et al. 2017: "On Calibration of Modern Neural Networks").

Model type: Not active in heuristic_v0.1. Will be applied post-LSTM training.
"""

from __future__ import annotations

import numpy as np
import structlog

logger = structlog.get_logger()


def fit_temperature(
    logits: np.ndarray,
    labels: np.ndarray,
    lr: float = 0.01,
    max_iter: int = 100,
) -> float:
    """Fit optimal temperature parameter via NLL minimization.

    Uses simple grid search for V1. Will use scipy.optimize when
    full training pipeline is active.

    Args:
        logits: Raw model logits, shape (n,).
        labels: Binary labels, shape (n,).
        lr: Learning rate (unused in grid search).
        max_iter: Number of temperature candidates.

    Returns:
        Optimal temperature value.
    """
    if len(logits) == 0:
        return 1.0

    best_temp = 1.0
    best_nll = float("inf")

    for t_candidate in np.linspace(0.1, 5.0, max_iter):
        scaled_probs = _sigmoid(logits / t_candidate)
        nll = _negative_log_likelihood(scaled_probs, labels)
        if nll < best_nll:
            best_nll = nll
            best_temp = t_candidate

    logger.info("temperature_fit", optimal_temperature=round(best_temp, 4), best_nll=round(best_nll, 6))
    return float(best_temp)


def apply_temperature(logits: np.ndarray, temperature: float) -> np.ndarray:
    """Apply temperature scaling to logits.

    Args:
        logits: Raw logits, shape (n,).
        temperature: Temperature parameter (T > 1 softens, T < 1 sharpens).

    Returns:
        Calibrated probabilities, shape (n,).
    """
    if temperature <= 0:
        raise ValueError(f"Temperature must be positive, got {temperature}")
    return _sigmoid(logits / temperature)


def compute_ece(
    probs: np.ndarray,
    labels: np.ndarray,
    n_bins: int = 15,
) -> float:
    """Compute Expected Calibration Error (ECE).

    ECE = sum_b (|B_b| / n) * |acc(B_b) - conf(B_b)|

    Args:
        probs: Predicted probabilities, shape (n,).
        labels: Binary labels, shape (n,).
        n_bins: Number of calibration bins.

    Returns:
        ECE value in [0, 1].
    """
    if len(probs) == 0:
        return 0.0

    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0

    for i in range(n_bins):
        mask = (probs > bin_edges[i]) & (probs <= bin_edges[i + 1])
        if not np.any(mask):
            continue

        bin_probs = probs[mask]
        bin_labels = labels[mask]
        bin_size = len(bin_probs)

        avg_confidence = np.mean(bin_probs)
        avg_accuracy = np.mean(bin_labels)
        ece += (bin_size / len(probs)) * abs(avg_accuracy - avg_confidence)

    return float(ece)


def compute_brier(probs: np.ndarray, labels: np.ndarray) -> float:
    """Compute Brier score.

    Brier = (1/n) * sum((p_i - y_i)^2)

    Args:
        probs: Predicted probabilities, shape (n,).
        labels: Binary labels, shape (n,).

    Returns:
        Brier score in [0, 1]. Lower is better.
    """
    if len(probs) == 0:
        return 0.0
    return float(np.mean((probs - labels) ** 2))


def reliability_diagram(
    probs: np.ndarray,
    labels: np.ndarray,
    n_bins: int = 15,
) -> list[dict[str, float]]:
    """Compute reliability diagram data.

    Args:
        probs: Predicted probabilities.
        labels: Binary labels.
        n_bins: Number of bins.

    Returns:
        List of bin dicts with center, predicted_mean, observed_fraction, count.
    """
    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    bins: list[dict[str, float]] = []

    for i in range(n_bins):
        mask = (probs > bin_edges[i]) & (probs <= bin_edges[i + 1])
        bin_center = (bin_edges[i] + bin_edges[i + 1]) / 2

        if not np.any(mask):
            bins.append({
                "bin_center": float(bin_center),
                "predicted_mean": float(bin_center),
                "observed_fraction": 0.0,
                "count": 0,
            })
            continue

        bins.append({
            "bin_center": float(bin_center),
            "predicted_mean": float(np.mean(probs[mask])),
            "observed_fraction": float(np.mean(labels[mask])),
            "count": int(np.sum(mask)),
        })

    return bins


def _sigmoid(x: np.ndarray) -> np.ndarray:
    """Numerically stable sigmoid."""
    return np.where(
        x >= 0,
        1.0 / (1.0 + np.exp(-x)),
        np.exp(x) / (1.0 + np.exp(x)),
    )


def _negative_log_likelihood(probs: np.ndarray, labels: np.ndarray) -> float:
    """Compute negative log-likelihood (binary cross-entropy)."""
    eps = 1e-7
    probs_clipped = np.clip(probs, eps, 1 - eps)
    nll = -np.mean(labels * np.log(probs_clipped) + (1 - labels) * np.log(1 - probs_clipped))
    return float(nll)
