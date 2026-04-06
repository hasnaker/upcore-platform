"""Model card registry (Mitchell et al. 2019).

Every instrument exposes a model card with citations, limitations,
fairness notes, and Turkish validation status.
"""

from __future__ import annotations

from app.schemas.common import ModelCard


def get_bat_model_card() -> ModelCard:
    return ModelCard(
        instrument="BAT-12-TR",
        version="1.0",
        intended_use=(
            "Deterministic scoring of the 12-item Burnout Assessment Tool, Turkish adaptation, "
            "for employee burnout screening in occupational health workflows."
        ),
        limitations=(
            "Provisional European norms (Schaufeli 2020 7-country N=15633). "
            "Turkish population norms pending — target N>=2000 customer data. "
            "Not a clinical diagnostic instrument; screening only."
        ),
        citations=[
            "Kocak, O. E., Gencay, F., & Schaufeli, W. B. (2022). Psikoloji Calismalari, 42(3), 509-549.",
            "Schaufeli, W. B., De Witte, H., & Desart, S. (2020). Manual BAT - Version 2.0. KU Leuven.",
            "Schaufeli, W. B., Desart, S., & De Witte, H. (2023). Burnout Assessment Tool: Factorial validity and measurement invariance.",
        ],
        reliability={
            "cronbach_alpha_reference": 0.87,
            "note": "Kocak 2022 Turkish sample alpha=0.87. Per-tenant alpha computed from N>=100 responses.",
        },
        norms={
            "source": "European provisional (Schaufeli 2020)",
            "n": 15633,
            "turkish_norms_status": "pending_n2000",
        },
        turkish_validation_status="validated_factor_structure_provisional_norms",
        known_biases=[
            "European sample norms may over/under-estimate Turkish baseline.",
            "Self-report instrument subject to social desirability.",
        ],
        fairness_notes=(
            "No gender/age differential item functioning validated in Turkish sample. "
            "Upcore will monitor tenant-level fairness as N grows."
        ),
        scoring_method="Subscale arithmetic means, total = mean of 4 subscales, cut-off classification.",
        license="Free commercial use, citation required (Schaufeli et al. 2020).",
    )


def get_upcap_model_card() -> ModelCard:
    return ModelCard(
        instrument="UpCap-TR",
        version="0.1",
        intended_use=(
            "Deterministic scoring of the Upcore 12-item PsyCap instrument "
            "(Hope, Efficacy, Resilience, Optimism), Turkish adaptation of CPC-12."
        ),
        limitations=(
            "Turkish validation ongoing (target N=1000 by Q2 2027). "
            "Reliability warning emitted on every response until validation completes. "
            "Do not use for high-stakes personnel decisions."
        ),
        citations=[
            "Lorenz, T., Beer, C., Putz, J., & Heinitz, K. (2016). CPC-12. PLOS ONE, 11(4): e0152892.",
            "Luthans, F., Avolio, B. J., Avey, J. B., & Norman, S. M. (2007). PsyCap construct.",
        ],
        reliability={
            "cronbach_alpha_reference": None,
            "note": "Original CPC-12 alpha~0.84. Turkish alpha pending.",
        },
        norms={
            "source": "Upcore internal snapshot",
            "n": 0,
            "turkish_norms_status": "calibration_in_progress",
        },
        turkish_validation_status="provisional_adaptation",
        known_biases=[
            "Provisional scoring pending Turkish factor analysis.",
            "Reverse-coded items 5, 8, 11 may have differential interpretation.",
        ],
        fairness_notes="Fairness audit deferred until Turkish validation completes.",
        scoring_method="Reverse-code items 5/8/11, compute subscale means, composite = mean.",
        license="CC-BY 4.0 (CPC-12 base). Upcore adaptation: internal.",
    )


def get_copsoq_model_card() -> ModelCard:
    return ModelCard(
        instrument="COPSOQ-III-TR",
        version="1.0",
        intended_use=(
            "Workplace psychosocial factor assessment via COPSOQ-III (40-item short form), "
            "Turkish validation. Feeds JD-R demands/resources indices."
        ),
        limitations=(
            "Turkish validation completed for factor structure (CFI=0.98); "
            "population norms collected from Upcore customer base."
        ),
        citations=[
            "Sahan, C., Baydur, H., & Demiral, Y. (2019). COPSOQ-III Turkish validation.",
            "Burr, H., Berthelsen, H., Moncada, S., et al. (2019). COPSOQ-III international.",
        ],
        reliability={
            "cronbach_alpha_reference": 0.82,
            "note": "Mean subscale alpha from Sahan 2019 Turkish sample.",
        },
        norms={
            "source": "Sahan et al. 2019 Turkish sample + Upcore customer norms",
            "turkish_norms_status": "validated",
        },
        turkish_validation_status="validated",
        known_biases=[
            "Sahan 2019 sample skews toward healthcare/service sectors.",
        ],
        fairness_notes="Cross-sector invariance testing pending Upcore dataset growth.",
        scoring_method="Per-subscale linear transform to 0-100 scale, demands/resources indices.",
        license="CC-BY (COPSOQ International Network).",
    )


def get_jdr_model_card() -> ModelCard:
    return ModelCard(
        instrument="JD-R-v0.1",
        version="0.1",
        intended_use=(
            "Heuristic burnout-risk probability from JD-R demands/resources z-scores. "
            "Feeds downstream recommendation services, not a clinical prediction."
        ),
        limitations=(
            "v0.1 heuristic coefficients from meta-analyses (Crawford 2010, Lesener 2019). "
            "NOT calibrated on Turkish population. Pending calibration Q2-Q3 2026."
        ),
        citations=[
            "Bakker, A. B., & Demerouti, E. (2007). JD-R model.",
            "Crawford, E. R., LePine, J. A., & Rich, B. L. (2010). JD-R meta-analysis. J. Appl. Psych.",
            "Lesener, T., Gusy, B., & Wolter, C. (2019). Work & Stress longitudinal meta-analysis.",
            "Van Veldhoven et al. (2020). Demand x resource interaction review.",
        ],
        reliability={
            "cronbach_alpha_reference": None,
            "note": "Not applicable — computed index, not multi-item scale.",
        },
        norms={
            "source": "Meta-analytic coefficients",
            "turkish_norms_status": "pending_calibration",
        },
        turkish_validation_status="heuristic_v0.1",
        known_biases=[
            "Meta-analytic weights derived from Western samples; may over-/under-estimate Turkish effect sizes.",
            "Interaction coefficient weakly supported (beta=-0.05).",
        ],
        fairness_notes="No fairness claims until Turkish calibration completes.",
        scoring_method=(
            "logit = 0.42*demands_z - 0.35*resources_z - 0.05*(demands_z*resources_z); "
            "p = sigmoid(logit)"
        ),
        license="Proprietary Upcore model definition (citations open-access).",
    )


_REGISTRY: dict[str, ModelCard] = {
    "bat": get_bat_model_card(),
    "bat-12-tr": get_bat_model_card(),
    "upcap": get_upcap_model_card(),
    "upcap-tr": get_upcap_model_card(),
    "copsoq": get_copsoq_model_card(),
    "copsoq-iii-tr": get_copsoq_model_card(),
    "jdr": get_jdr_model_card(),
    "jd-r": get_jdr_model_card(),
}


def get_model_card(instrument: str) -> ModelCard | None:
    """Return model card for instrument (case-insensitive)."""
    return _REGISTRY.get(instrument.lower())


def list_instruments() -> list[str]:
    """Return canonical instrument identifiers."""
    return ["bat-12-tr", "upcap-tr", "copsoq-iii-tr", "jd-r-v0.1"]
