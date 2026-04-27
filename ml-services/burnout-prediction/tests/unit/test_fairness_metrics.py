"""Tests for fairness metrics."""

from __future__ import annotations

import numpy as np

from app.evaluation.fairness import (
    compute_demographic_parity,
    compute_equal_opportunity,
    generate_fairness_report,
)


class TestDemographicParity:
    """Tests for demographic parity computation."""

    def test_equal_rates(self) -> None:
        """Same prediction rate across groups should have zero diff."""
        preds = np.array([0.8, 0.8, 0.8, 0.8])
        groups = np.array(["A", "A", "B", "B"])
        rates = compute_demographic_parity(preds, groups, threshold=0.5)
        assert rates["A"] == rates["B"]

    def test_unequal_rates(self) -> None:
        """Different prediction rates should be detected."""
        preds = np.array([0.9, 0.9, 0.1, 0.1])
        groups = np.array(["A", "A", "B", "B"])
        rates = compute_demographic_parity(preds, groups, threshold=0.5)
        assert rates["A"] > rates["B"]

    def test_single_group(self) -> None:
        """Single group should return its rate."""
        preds = np.array([0.7, 0.3, 0.8])
        groups = np.array(["X", "X", "X"])
        rates = compute_demographic_parity(preds, groups, threshold=0.5)
        assert "X" in rates


class TestEqualOpportunity:
    """Tests for equal opportunity computation."""

    def test_perfect_tpr(self) -> None:
        """Perfect TP rate should be 1.0."""
        preds = np.array([0.9, 0.9, 0.9])
        labels = np.array([1, 1, 1])
        groups = np.array(["A", "A", "A"])
        tpr = compute_equal_opportunity(preds, labels, groups, threshold=0.5)
        assert tpr["A"] == 1.0

    def test_zero_tpr(self) -> None:
        """Missing all positives should give 0 TPR."""
        preds = np.array([0.1, 0.1])
        labels = np.array([1, 1])
        groups = np.array(["A", "A"])
        tpr = compute_equal_opportunity(preds, labels, groups, threshold=0.5)
        assert tpr["A"] == 0.0


class TestFairnessReport:
    """Tests for full fairness report generation."""

    def test_report_structure(self) -> None:
        """Report should contain required fields."""
        preds = np.random.uniform(0, 1, 100)
        labels = np.random.randint(0, 2, 100)
        groups = {"gender": np.random.choice(["M", "F"], 100)}
        report = generate_fairness_report(preds, labels, groups)
        assert "group_results" in report
        assert "max_parity_diff" in report
        assert "passes_gate" in report

    def test_passes_gate_when_equal(self) -> None:
        """Should pass gate when predictions are uniform across groups."""
        preds = np.full(100, 0.5)
        labels = np.random.randint(0, 2, 100)
        groups = {"gender": np.random.choice(["M", "F"], 100)}
        report = generate_fairness_report(preds, labels, groups)
        assert report["passes_gate"] is True

    def test_fails_gate_when_biased(self) -> None:
        """Should fail gate when one group has much higher positive rate."""
        preds = np.concatenate([np.full(50, 0.9), np.full(50, 0.1)])
        labels = np.random.randint(0, 2, 100)
        groups = {"gender": np.array(["M"] * 50 + ["F"] * 50)}
        report = generate_fairness_report(preds, labels, groups, tolerance=0.10)
        assert report["passes_gate"] is False
        assert report["max_parity_diff"] > 0.10
