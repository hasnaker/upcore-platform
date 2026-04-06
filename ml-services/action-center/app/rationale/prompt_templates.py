"""Jinja2 prompt templates for LLM rationale generation.

Each action type has a specific template that generates a
structured 3-sentence Turkish rationale.

Guardrails:
- No invented facts
- No clinical claims
- 3 sentences max
- Turkish language only
"""

from __future__ import annotations

from app.schemas.actions import ActionCandidate, ActionType

# System instruction for all rationale generation
SYSTEM_INSTRUCTION = """Sen Upcore platformunun aksiyon asistanisin.
Gorevi: Verilen veriye dayanarak 3 cumlede Turkce bir gerekce yaz.
Kurallar:
1. Tam olarak 3 cumle yaz.
2. Sadece verilen verilere dayanarak yaz, bilgi uydurma.
3. Tibbi teshis, hastalik veya tedavi onerisinde bulunma.
4. Calisan isimlerini tam olarak kullanma, sadece baş harfler kullan.
5. Turkce yaz."""


# Per-action-type prompt templates
TEMPLATES: dict[str, str] = {
    ActionType.SCHEDULE_1ON1.value: (
        "{system}\n\n"
        "Aksiyon: {target_name} ile 1:1 gorusme planla.\n"
        "Veri: Tukenmislik skoru {burnout_score}, {trend_description}. "
        "Ana faktorler: {drivers}. Son 1:1 gorusme {days_since_1on1} gun once.\n"
        "3 cumlede gerekce yaz."
    ),
    ActionType.WORKLOAD_REVIEW.value: (
        "{system}\n\n"
        "Aksiyon: {target_name} icin is yuku gozden gecirmesi.\n"
        "Veri: Fazla mesai {overtime_hours} saat/ay, is yuku skoru {workload_score}. "
        "{trend_description}.\n"
        "3 cumlede gerekce yaz."
    ),
    ActionType.RECOGNITION.value: (
        "{system}\n\n"
        "Aksiyon: {target_name} icin takim icinde takdir.\n"
        "Veri: Son 30 gunde {recognition_count} takdir olayi. "
        "Baglilik skoru {engagement_score}.\n"
        "3 cumlede gerekce yaz."
    ),
    ActionType.TRAINING_NUDGE.value: (
        "{system}\n\n"
        "Aksiyon: {target_name} icin egitim onerisi.\n"
        "Veri: Gelisim alani: {development_area}. "
        "PsyCap skoru {psycap_score}.\n"
        "3 cumlede gerekce yaz."
    ),
    ActionType.WELLBEING_CHECKIN.value: (
        "{system}\n\n"
        "Aksiyon: {target_name} ile iyilik hali kontrolu.\n"
        "Veri: Tukenmislik trendi {trend_description}. "
        "Devamsizlik {absence_days} gun/ay.\n"
        "3 cumlede gerekce yaz."
    ),
    ActionType.TEAM_PULSE.value: (
        "{system}\n\n"
        "Aksiyon: Takim nabiz anketi.\n"
        "Veri: Takim ortalama risk {team_avg_risk}. "
        "{high_risk_count} kisi yuksek riskli.\n"
        "3 cumlede gerekce yaz."
    ),
    ActionType.POLICY_REVIEW.value: (
        "{system}\n\n"
        "Aksiyon: Politika gozden gecirmesi.\n"
        "Veri: {policy_area} alaninda {issue_count} sorun tespit edildi.\n"
        "3 cumlede gerekce yaz."
    ),
    ActionType.ESCALATE_TO_HR.value: (
        "{system}\n\n"
        "Aksiyon: HR'a yonlendirme.\n"
        "Veri: {target_name} {severity} risk grubunda. "
        "Tukenmislik skoru {burnout_score}. {reason}.\n"
        "3 cumlede gerekce yaz."
    ),
}


def render_prompt(action: ActionCandidate, context: dict) -> str:
    """Render a prompt template for an action.

    Args:
        action: The action candidate.
        context: Additional context variables for template.

    Returns:
        Rendered prompt string.
    """
    template = TEMPLATES.get(action.action_type.value, TEMPLATES[ActionType.WELLBEING_CHECKIN.value])

    # Build template variables
    variables = {
        "system": SYSTEM_INSTRUCTION,
        "target_name": action.target_name_masked,
        "burnout_score": context.get("burnout_score", "bilinmiyor"),
        "trend_description": context.get("trend_description", "stabil"),
        "drivers": ", ".join(context.get("drivers", [])),
        "days_since_1on1": context.get("days_since_1on1", "bilinmiyor"),
        "overtime_hours": context.get("overtime_hours", "bilinmiyor"),
        "workload_score": context.get("workload_score", "bilinmiyor"),
        "recognition_count": context.get("recognition_count", 0),
        "engagement_score": context.get("engagement_score", "bilinmiyor"),
        "development_area": context.get("development_area", "genel"),
        "psycap_score": context.get("psycap_score", "bilinmiyor"),
        "absence_days": context.get("absence_days", 0),
        "team_avg_risk": context.get("team_avg_risk", "bilinmiyor"),
        "high_risk_count": context.get("high_risk_count", 0),
        "policy_area": context.get("policy_area", "genel"),
        "issue_count": context.get("issue_count", 0),
        "severity": action.severity_band,
        "reason": context.get("reason", ""),
    }

    try:
        return template.format(**variables)
    except KeyError:
        return template.format_map({**variables, **{k: "" for k in template.split("{")[1:]}})


def templated_fallback(action: ActionCandidate) -> str:
    """Generate deterministic Turkish rationale (no LLM).

    Used when LLM is unavailable. Provides safe, generic rationale.

    Args:
        action: Action candidate.

    Returns:
        3-sentence Turkish rationale.
    """
    fallbacks: dict[str, str] = {
        ActionType.SCHEDULE_1ON1.value: (
            f"{action.target_name_masked} ile bir gorusme planlamaniz onerilmektedir. "
            f"Mevcut veriler potansiyel risk isaretleri gostermektedir. "
            f"Kisa bir gorusme erken mudahale imkani saglayabilir."
        ),
        ActionType.WORKLOAD_REVIEW.value: (
            f"{action.target_name_masked} icin is yuku degerlendirmesi yapilmasi onerilmektedir. "
            f"Is yuku gostergeleri dikkat gerektiren seviyelerde. "
            f"Yeniden dagitim calisani rahatlatabilir."
        ),
        ActionType.RECOGNITION.value: (
            f"{action.target_name_masked} icin takdir gostermek baglilik artirabilir. "
            f"Son donemde takdir oranı dusuk kalmistir. "
            f"Basit bir tesekkur bile olumlu etki yaratabilir."
        ),
        ActionType.TRAINING_NUDGE.value: (
            f"{action.target_name_masked} icin gelisim firsati mevcuttur. "
            f"Egitim programlari yetkinlik ve motivasyonu artirabilir. "
            f"Uygun egitim seceneklerini degerlendirmeniz onerilir."
        ),
        ActionType.WELLBEING_CHECKIN.value: (
            f"{action.target_name_masked} ile iyilik hali kontrolu yapilmasi onerilmektedir. "
            f"Erken mudahale potansiyel sorunlari onleyebilir. "
            f"Kisa bir sohbet destek ihtiyacini belirleyebilir."
        ),
        ActionType.TEAM_PULSE.value: (
            "Takim genelinde bir nabiz kontrolu yapilmasi onerilmektedir. "
            "Mevcut gostergeler takim dinamiklerinde dikkat edilmesi gereken noktalar olabilecegini isaret etmektedir. "
            "Kisa bir anket takim iklimini anlamaniza yardimci olabilir."
        ),
        ActionType.POLICY_REVIEW.value: (
            "Mevcut politikalarin gozden gecirilmesi onerilmektedir. "
            "Veriler iyilestirme firsatlarinin bulundugunu gostermektedir. "
            "Politika guncellemesi calisan deneyimini iyilestirebilir."
        ),
        ActionType.ESCALATE_TO_HR.value: (
            f"{action.target_name_masked} icin HR desteği alinmasi onerilmektedir. "
            f"Risk gostergeleri profesyonel destek gerektiren seviyelerde. "
            f"HR ekibi ile koordinasyon onemlidir."
        ),
    }

    return fallbacks.get(
        action.action_type.value,
        "Bu aksiyon mevcut verilere dayanarak onerilmektedir. "
        "Erken mudahale olumlu sonuclar doguabilir. "
        "Detaylar icin ilgili bolumu inceleyebilirsiniz."
    )
