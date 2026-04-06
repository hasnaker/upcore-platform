"""Model card registry re-export.

The authoritative model card definitions live in app.reliability.model_card.
This module re-exports them under the manifest-specified path.
"""

from __future__ import annotations

from app.reliability.model_card import (
    get_bat_model_card,
    get_copsoq_model_card,
    get_jdr_model_card,
    get_model_card,
    get_upcap_model_card,
    list_instruments,
)

# Add strengths model card
from app.schemas.common import ModelCard


def get_strengths_model_card() -> ModelCard:
    return ModelCard(
        instrument="Strengths-TR",
        version="0.1",
        intended_use=(
            "24-item custom Turkish strengths inventory for identifying "
            "employee top-5 character strengths in workplace context."
        ),
        limitations=(
            "Upcore custom instrument — NOT VIA-IS, NOT Gallup. "
            "No external validation yet. Norms pending N>=500."
        ),
        citations=[
            "Upcore internal development (2025). Turkish workplace strengths inventory v0.1.",
        ],
        reliability={
            "cronbach_alpha_reference": None,
            "note": "Pending validation. Target alpha >= 0.75 per domain.",
        },
        norms={
            "source": "Upcore internal (pending)",
            "n": 0,
            "turkish_norms_status": "calibration_in_progress",
        },
        turkish_validation_status="provisional_development",
        known_biases=[
            "No psychometric validation completed.",
            "Item content developed from Turkish workplace interviews, not adapted from English.",
        ],
        fairness_notes="Fairness analysis deferred until validation completes.",
        scoring_method="Domain means (3 items each), rank-ordered, top-5 returned.",
        license="Proprietary (Upcore).",
    )


__all__ = [
    "get_bat_model_card",
    "get_copsoq_model_card",
    "get_jdr_model_card",
    "get_model_card",
    "get_strengths_model_card",
    "get_upcap_model_card",
    "list_instruments",
]
