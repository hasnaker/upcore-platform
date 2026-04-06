"""Catalog entry validation rules."""

from __future__ import annotations

import structlog

logger = structlog.get_logger()


def validate_intervention(data: dict) -> list[str]:
    """Validate intervention data against catalog rules.

    Rules:
    - Required fields: title_tr, title_en
    - Evidence tier A must have at least 1 citation
    - Bilingual text must be present
    - Effect size must be positive

    Returns:
        List of validation error messages (empty if valid).
    """
    errors: list[str] = []

    if not data.get("title_tr"):
        errors.append("title_tr is required")
    if not data.get("title_en"):
        errors.append("title_en is required")

    tier = data.get("evidence_tier", "C")
    if tier not in ("A", "B", "C"):
        errors.append(f"Invalid evidence_tier: {tier}. Must be A, B, or C.")

    if tier == "A" and not data.get("citations"):
        errors.append("Evidence tier A interventions must include at least 1 citation.")

    effect = data.get("expected_effect_size", 0.0)
    if effect < 0:
        errors.append("expected_effect_size must be non-negative.")

    return errors
