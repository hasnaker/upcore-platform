"""LSTM-based burnout prediction model (placeholder for V1).

Architecture: 2-layer BiLSTM -> LayerNorm -> MultiHeadAttention -> FC -> 3 horizon heads
This module defines the full model architecture. For V1 (heuristic_v0.1),
the model is not used at inference — the heuristic predictor is used instead.
The LSTM will be activated when sufficient training data is available.

Model type: heuristic_v0.1 (LSTM architecture defined, not trained)
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import structlog

logger = structlog.get_logger()


@dataclass
class LSTMConfig:
    """Configuration for the BurnoutLSTM model."""

    input_dim: int = 42
    hidden_dim: int = 128
    num_layers: int = 2
    num_heads: int = 4
    dropout: float = 0.2
    horizons: list[int] | None = None

    def __post_init__(self) -> None:
        if self.horizons is None:
            self.horizons = [30, 60, 90]


# NOTE: Full PyTorch nn.Module implementation will be activated when
# torch is available and training data exists. For V1, the heuristic
# predictor in inference/predict.py is used instead.
#
# The architecture specification is:
# - Encoder: BiLSTM(input=42, hidden=128, layers=2, bidirectional=True)
# - LayerNorm(256)  # 128*2 for bidirectional
# - MultiHeadAttention(embed_dim=256, num_heads=4)
# - FC: 256 -> 128 -> 64 -> 32
# - Horizon heads: 3x FC(32 -> 1) + Sigmoid
# - MC-Dropout(p=0.2) on LSTM and FC layers


class HeuristicBurnoutPredictor:
    """Rule-based burnout predictor for V1 (heuristic_v0.1).

    Uses weighted scoring of key risk factors based on JD-R model
    and established burnout research (Maslach & Leiter, 2016;
    Schaufeli et al., 2020). Weights are manually calibrated and
    will be replaced by learned parameters when training data exists.
    """

    MODEL_TYPE = "heuristic_v0.1"

    # Feature weights (heuristic v0.1) — based on meta-analysis effect sizes
    # from burnout literature. Will be replaced by learned LSTM weights.
    WEIGHTS: dict[str, float] = {
        "bat_exhaustion_mean": 0.18,         # Primary burnout indicator
        "bat_exhaustion_slope_30d": 0.12,     # Trend matters more than level
        "bat_composite": 0.10,                # Overall BAT score
        "copsoq_workload_mean": 0.10,         # Job demands (JD-R)
        "jdr_balance_ratio": -0.08,           # Resources buffer (negative = protective)
        "engagement_score": -0.07,            # Protective factor
        "overtime_hours_30d": 0.06,           # Workload proxy
        "absence_days_30d": 0.05,             # Behavioral signal
        "psycap_composite": -0.06,            # Psychological capital (protective)
        "manager_1on1_days_since": 0.04,      # Support absence
        "after_hours_activity": 0.04,         # Work-life boundary erosion
        "recognition_events_30d": -0.03,      # Protective factor
        "negative_events_90d": 0.04,          # Stressor events
        "tenure_months": 0.02,                # Weak positive (longer tenure, more risk)
        "meeting_load_hours_week": 0.03,      # Cognitive load
        "survey_response_latency": 0.02,      # Disengagement signal
    }

    # Horizon adjustment factors: further horizons have more uncertainty
    HORIZON_FACTORS: dict[int, float] = {
        30: 1.0,
        60: 0.88,
        90: 0.78,
    }

    # Confidence interval width multipliers per horizon
    CI_WIDTHS: dict[int, float] = {
        30: 0.08,
        60: 0.12,
        90: 0.18,
    }

    def predict(
        self,
        features: dict[str, float],
        horizons: list[int] | None = None,
        n_samples: int = 30,
    ) -> dict[int, dict[str, float]]:
        """Predict burnout probability for given horizons.

        Heuristic v0.1: weighted linear combination of risk factors,
        passed through a sigmoid-like squashing function. MC-Dropout
        is simulated via small Gaussian perturbations.

        Args:
            features: Dict of feature name to float value.
            horizons: List of horizon days (default [30, 60, 90]).
            n_samples: Number of MC samples for confidence intervals.

        Returns:
            Dict of horizon -> {probability, ci_lower, ci_upper}.
        """
        if horizons is None:
            horizons = [30, 60, 90]

        # Compute base risk score from weighted features
        base_score = self._compute_base_score(features)

        results: dict[int, dict[str, float]] = {}

        for horizon in horizons:
            factor = self.HORIZON_FACTORS.get(horizon, 0.85)
            ci_width = self.CI_WIDTHS.get(horizon, 0.15)

            # MC-Dropout simulation: perturb base score
            samples = self._mc_simulate(base_score, factor, n_samples)

            mean_prob = float(np.clip(np.mean(samples), 0.0, 1.0))
            ci_lower = float(np.clip(np.percentile(samples, 2.5), 0.0, 1.0))
            ci_upper = float(np.clip(np.percentile(samples, 97.5), 0.0, 1.0))

            # Ensure minimum CI width for honesty about uncertainty
            if ci_upper - ci_lower < ci_width:
                ci_lower = max(0.0, mean_prob - ci_width / 2)
                ci_upper = min(1.0, mean_prob + ci_width / 2)

            results[horizon] = {
                "probability": round(mean_prob, 4),
                "ci_lower": round(ci_lower, 4),
                "ci_upper": round(ci_upper, 4),
            }

        return results

    def _compute_base_score(self, features: dict[str, float]) -> float:
        """Compute raw risk score from weighted feature combination.

        Heuristic v0.1 formula:
        score = sigmoid(sum(w_i * normalize(x_i)) + bias)

        Normalization uses feature spec ranges to map to [0, 1].
        """
        raw_score = 0.0

        for feature_name, weight in self.WEIGHTS.items():
            value = features.get(feature_name, 0.0)
            normalized = self._normalize_feature(feature_name, value)
            raw_score += weight * normalized

        # Bias toward slight pessimism for safety (heuristic v0.1)
        raw_score += 0.05

        # Squash through modified sigmoid
        return self._sigmoid(raw_score * 5.0)  # Scale factor for sensitivity

    def _normalize_feature(self, name: str, value: float) -> float:
        """Normalize feature value to [0, 1] range using spec bounds."""
        from app.features.feature_spec import FEATURE_SPEC

        spec_map = {f.name: f for f in FEATURE_SPEC}
        if name not in spec_map:
            return value

        spec = spec_map[name]
        range_size = spec.max_value - spec.min_value
        if range_size == 0:
            return 0.5

        normalized = (value - spec.min_value) / range_size
        return float(np.clip(normalized, 0.0, 1.0))

    def _mc_simulate(self, base_score: float, horizon_factor: float, n_samples: int) -> np.ndarray:
        """Simulate MC-Dropout via Gaussian perturbation.

        Heuristic v0.1: adds noise proportional to uncertainty.
        This approximates what MC-Dropout would provide with a trained model.
        """
        adjusted = base_score * horizon_factor
        # Noise std proportional to distance from extremes (more uncertain in middle)
        noise_std = 0.05 * (1.0 - abs(2 * adjusted - 1))
        noise_std = max(noise_std, 0.02)  # Minimum uncertainty

        samples = np.random.normal(adjusted, noise_std, size=n_samples)
        return np.clip(samples, 0.0, 1.0)

    @staticmethod
    def _sigmoid(x: float) -> float:
        """Numerically stable sigmoid."""
        if x >= 0:
            return 1.0 / (1.0 + np.exp(-x))
        else:
            exp_x = np.exp(x)
            return exp_x / (1.0 + exp_x)

    def compute_top_drivers(
        self,
        features: dict[str, float],
        k: int = 5,
    ) -> list[dict[str, float | str]]:
        """Compute top-K feature contributions (pseudo-SHAP).

        Heuristic v0.1: uses weight * normalized_value as contribution proxy.
        Will be replaced by SHAP DeepExplainer when LSTM is active.
        """
        from app.features.feature_spec import FEATURE_LABELS_TR

        contributions: list[tuple[str, float]] = []

        for feature_name, weight in self.WEIGHTS.items():
            value = features.get(feature_name, 0.0)
            normalized = self._normalize_feature(feature_name, value)
            contribution = weight * normalized
            contributions.append((feature_name, contribution))

        # Sort by absolute contribution
        contributions.sort(key=lambda x: abs(x[1]), reverse=True)

        return [
            {
                "feature": name,
                "shap": round(abs(contrib), 4),
                "direction": "positive" if contrib > 0 else "negative",
                "label_tr": FEATURE_LABELS_TR.get(name, name),
            }
            for name, contrib in contributions[:k]
        ]
