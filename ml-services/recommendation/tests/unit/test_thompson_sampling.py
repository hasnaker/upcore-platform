"""Tests for Thompson sampling module."""

from __future__ import annotations

import numpy as np
import pytest

from app.effectiveness.thompson_sampling import (
    compute_effectiveness_summary,
    credible_interval,
    posterior_mean,
    sample_batch,
    sample_posterior,
    select_top_k_thompson,
    update_posterior,
)


class TestSamplePosterior:
    def test_sample_in_range(self) -> None:
        """Samples should be in [0, 1]."""
        for _ in range(100):
            s = sample_posterior(2.0, 3.0)
            assert 0.0 <= s <= 1.0

    def test_high_alpha_samples_high(self) -> None:
        """High alpha should produce samples closer to 1."""
        np.random.seed(42)
        samples = [sample_posterior(100.0, 1.0) for _ in range(100)]
        assert np.mean(samples) > 0.9

    def test_high_beta_samples_low(self) -> None:
        """High beta should produce samples closer to 0."""
        np.random.seed(42)
        samples = [sample_posterior(1.0, 100.0) for _ in range(100)]
        assert np.mean(samples) < 0.1


class TestPosteriorMean:
    def test_uniform_prior(self) -> None:
        """Beta(1,1) should have mean 0.5."""
        assert posterior_mean(1.0, 1.0) == pytest.approx(0.5)

    def test_computed_correctly(self) -> None:
        """Mean should be alpha/(alpha+beta)."""
        assert posterior_mean(3.0, 7.0) == pytest.approx(0.3)


class TestCredibleInterval:
    def test_ci_contains_mean(self) -> None:
        """95% CI should contain the posterior mean."""
        alpha, beta = 10.0, 5.0
        ci = credible_interval(alpha, beta, 0.95)
        mean = posterior_mean(alpha, beta)
        assert ci[0] <= mean <= ci[1]

    def test_wider_with_uncertainty(self) -> None:
        """Prior CI should be wider than posterior with observations."""
        ci_prior = credible_interval(1.0, 1.0)
        ci_informed = credible_interval(50.0, 50.0)
        assert (ci_prior[1] - ci_prior[0]) > (ci_informed[1] - ci_informed[0])


class TestUpdatePosterior:
    def test_success_increases_alpha(self) -> None:
        """Success should increment alpha."""
        new_a, new_b = update_posterior(1.0, 1.0, True)
        assert new_a == 2.0
        assert new_b == 1.0

    def test_failure_increases_beta(self) -> None:
        """Failure should increment beta."""
        new_a, new_b = update_posterior(1.0, 1.0, False)
        assert new_a == 1.0
        assert new_b == 2.0


class TestSampleBatch:
    def test_returns_correct_count(self) -> None:
        """Should return one sample per posterior."""
        posteriors = [(1.0, 1.0), (2.0, 3.0), (10.0, 2.0)]
        samples = sample_batch(posteriors)
        assert len(samples) == 3


class TestSelectTopKThompson:
    def test_returns_k_items(self) -> None:
        """Should return exactly k items."""
        candidates = [
            {"intervention_id": "a"},
            {"intervention_id": "b"},
            {"intervention_id": "c"},
        ]
        posteriors = {"a": (10.0, 1.0), "b": (1.0, 10.0), "c": (5.0, 5.0)}
        result = select_top_k_thompson(candidates, posteriors, k=2)
        assert len(result) == 2

    def test_thompson_sample_included(self) -> None:
        """Selected items should include thompson_sample field."""
        candidates = [{"intervention_id": "a"}]
        posteriors = {"a": (5.0, 5.0)}
        result = select_top_k_thompson(candidates, posteriors, k=1)
        assert "thompson_sample" in result[0]

    def test_convergence(self) -> None:
        """Over many trials, best arm should be selected most often."""
        np.random.seed(42)
        candidates = [
            {"intervention_id": "good"},
            {"intervention_id": "bad"},
        ]
        posteriors = {"good": (50.0, 5.0), "bad": (5.0, 50.0)}

        good_selected = 0
        trials = 1000
        for _ in range(trials):
            result = select_top_k_thompson(candidates, posteriors, k=1)
            if result[0]["intervention_id"] == "good":
                good_selected += 1

        assert good_selected / trials > 0.95


class TestEffectivenessSummary:
    def test_summary_structure(self) -> None:
        """Summary should contain expected fields."""
        summary = compute_effectiveness_summary(10.0, 5.0)
        assert "mean" in summary
        assert "ci_lower" in summary
        assert "ci_upper" in summary
        assert "variance" in summary
        assert "total_observations" in summary
