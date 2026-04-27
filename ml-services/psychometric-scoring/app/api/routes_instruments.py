"""Instrument catalog endpoint — peer-reviewed ölçek listesi + item bankası.

Türkçe UI'ın dinamik form kurması için kullanılır. Her instrument için:
item code'ları, Türkçe soru metinleri, Likert skala sınırları ve dimension
(JD-R boyutu veya BAT alt-skalası) döner.
"""

from __future__ import annotations

from typing import Literal

import structlog
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/score/instruments", tags=["instruments"])


class Item(BaseModel):
    code: str
    order_index: int
    question_tr: str
    question_en: str | None = None
    scale_min: int = 1
    scale_max: int = 5
    dimension: str | None = None
    reverse_scored: bool = False


class Instrument(BaseModel):
    code: str
    name_tr: str
    name_en: str | None = None
    description_tr: str
    citation: str
    item_count: int
    estimated_duration_min: int
    language: Literal["tr-TR", "en-US"] = "tr-TR"
    scale_type: Literal["likert_5", "likert_7", "frequency_5"] = "likert_5"
    items: list[Item] = Field(default_factory=list)


# ─── BAT-12-TR (Koçak, Gençay & Schaufeli 2022) ──────────────────────────────
BAT12_TR = Instrument(
    code="bat12_tr",
    name_tr="BAT-12-TR (Tükenmişlik Kısa Form)",
    name_en="Burnout Assessment Tool 12-item Turkish",
    description_tr=(
        "12 soruluk, 4 alt-boyutlu (Tükenmişlik, Zihinsel Uzaklaşma, Bilişsel "
        "Bozulma, Duygusal Bozulma) tükenmişlik ölçeği. 1 dakikada tamamlanır."
    ),
    citation="Koçak, G., Gençay, S., & Schaufeli, W. B. (2022). Work & Stress.",
    item_count=12,
    estimated_duration_min=2,
    scale_type="frequency_5",
    items=[
        Item(code="BAT_EX1", order_index=1, question_tr="İşimi yaparken kendimi zihinsel olarak tükenmiş hissediyorum.", dimension="exhaustion"),
        Item(code="BAT_EX2", order_index=2, question_tr="Sabah uyandığımda işe gitmek için yeterince enerjim olmuyor.", dimension="exhaustion"),
        Item(code="BAT_EX3", order_index=3, question_tr="Bir iş günü sonunda bedenen ve zihnen yorgun hissediyorum.", dimension="exhaustion"),
        Item(code="BAT_MD1", order_index=4, question_tr="İşime karşı güçlü bir isteksizlik duyuyorum.", dimension="mental_distance"),
        Item(code="BAT_MD2", order_index=5, question_tr="İşimle kendimi duygusal olarak bağlantısız hissediyorum.", dimension="mental_distance"),
        Item(code="BAT_MD3", order_index=6, question_tr="İşimde kendimi mecburmuş gibi hissediyorum.", dimension="mental_distance"),
        Item(code="BAT_CI1", order_index=7, question_tr="İşimde dikkatimi toplamakta zorlanıyorum.", dimension="cognitive"),
        Item(code="BAT_CI2", order_index=8, question_tr="İşimde basit hatalar yapıyorum.", dimension="cognitive"),
        Item(code="BAT_CI3", order_index=9, question_tr="Berrak düşünmekte zorluk yaşıyorum.", dimension="cognitive"),
        Item(code="BAT_EI1", order_index=10, question_tr="Kolayca üzülüyorum.", dimension="emotional"),
        Item(code="BAT_EI2", order_index=11, question_tr="Duygularımı kontrol etmekte zorlanıyorum.", dimension="emotional"),
        Item(code="BAT_EI3", order_index=12, question_tr="İşte hayal kırıklığına uğrarsam duygusal olarak tepki veriyorum.", dimension="emotional"),
    ],
)

# ─── COPSOQ-III-TR (Şahan et al. 2019 — seçili boyutlar) ────────────────────
COPSOQ_III_TR = Instrument(
    code="copsoq_iii_tr",
    name_tr="COPSOQ-III-TR (JD-R Kısa Form)",
    name_en="Copenhagen Psychosocial Questionnaire v3 Turkish — Short",
    description_tr=(
        "JD-R modeline göre 6 talep (iş yükü, zaman baskısı, bilişsel talep, "
        "duygusal talep, rol çatışması, rol belirsizliği) ve 6 kaynak (özerklik, "
        "geri bildirim, sosyal destek, gelişim, beceri çeşitliliği, görev önemi). "
        "12 soru, 2-3 dakika."
    ),
    citation="Şahan et al. (2019). Safety and Health at Work 10(3).",
    item_count=12,
    estimated_duration_min=3,
    scale_type="frequency_5",
    items=[
        # Demands (6)
        Item(code="JDR_WL", order_index=1, question_tr="İşim beni aşırı derecede yoruyor.", dimension="demand_workload"),
        Item(code="JDR_TP", order_index=2, question_tr="İşimi zamanında yetiştirmek için koşturmak zorunda kalıyorum.", dimension="demand_time_pressure"),
        Item(code="JDR_CD", order_index=3, question_tr="İşim yüksek düzeyde dikkat ve konsantrasyon gerektiriyor.", dimension="demand_cognitive"),
        Item(code="JDR_ED", order_index=4, question_tr="İşimde duygusal olarak talepkar durumlarla karşılaşıyorum.", dimension="demand_emotional"),
        Item(code="JDR_RC", order_index=5, question_tr="Benden birbiriyle çelişen taleplerde bulunuluyor.", dimension="demand_role_conflict"),
        Item(code="JDR_RA", order_index=6, question_tr="Rolümün tam olarak ne olduğu konusunda belirsizlik yaşıyorum.", dimension="demand_role_ambiguity"),
        # Resources (6) — reverse scored, yüksek skor = düşük kaynak
        Item(code="JDR_AU", order_index=7, question_tr="İşimi nasıl yapacağımı kendim belirleyebiliyorum.", dimension="resource_autonomy", reverse_scored=True),
        Item(code="JDR_FB", order_index=8, question_tr="Yöneticimden işim hakkında düzenli geri bildirim alıyorum.", dimension="resource_feedback", reverse_scored=True),
        Item(code="JDR_SS", order_index=9, question_tr="İhtiyacım olduğunda ekip arkadaşlarımdan destek alıyorum.", dimension="resource_social_support", reverse_scored=True),
        Item(code="JDR_DV", order_index=10, question_tr="İşim bana gelişim fırsatları sunuyor.", dimension="resource_development", reverse_scored=True),
        Item(code="JDR_SV", order_index=11, question_tr="İşim çeşitli beceriler kullanmamı gerektiriyor.", dimension="resource_skill_variety", reverse_scored=True),
        Item(code="JDR_TI", order_index=12, question_tr="Yaptığım işin anlamlı ve önemli olduğuna inanıyorum.", dimension="resource_task_importance", reverse_scored=True),
    ],
)

# ─── UWES-9 (Schaufeli et al. 2006) ─────────────────────────────────────────
UWES_9 = Instrument(
    code="uwes9",
    name_tr="UWES-9 (İşe Bağlılık)",
    name_en="Utrecht Work Engagement Scale 9-item",
    description_tr=(
        "3 boyutta (Dinçlik, Adanmışlık, Yoğunlaşma) 9 soruluk bağlılık ölçeği. "
        "Yüksek skor = yüksek engagement."
    ),
    citation="Schaufeli, W. B., Bakker, A. B., & Salanova, M. (2006). EAPA.",
    item_count=9,
    estimated_duration_min=2,
    scale_type="frequency_5",
    items=[
        Item(code="UWES_VI1", order_index=1, question_tr="İşimde kendimi enerji dolu hissediyorum.", dimension="vigor"),
        Item(code="UWES_VI2", order_index=2, question_tr="İşimde kendimi güçlü ve dinç hissediyorum.", dimension="vigor"),
        Item(code="UWES_VI3", order_index=3, question_tr="Sabah uyanınca işe gitmekten mutluyum.", dimension="vigor"),
        Item(code="UWES_DE1", order_index=4, question_tr="İşime karşı hevesliyim.", dimension="dedication"),
        Item(code="UWES_DE2", order_index=5, question_tr="İşim bana ilham veriyor.", dimension="dedication"),
        Item(code="UWES_DE3", order_index=6, question_tr="İşimle gurur duyuyorum.", dimension="dedication"),
        Item(code="UWES_AB1", order_index=7, question_tr="Çalışırken zaman nasıl geçiyor farkına varmıyorum.", dimension="absorption"),
        Item(code="UWES_AB2", order_index=8, question_tr="İşim beni tamamen içine çekiyor.", dimension="absorption"),
        Item(code="UWES_AB3", order_index=9, question_tr="Çalışırken kendimi işe kaptırıyorum.", dimension="absorption"),
    ],
)

CATALOG: dict[str, Instrument] = {
    "bat12_tr": BAT12_TR,
    "copsoq_iii_tr": COPSOQ_III_TR,
    "uwes9": UWES_9,
}


@router.get("/", response_model=list[Instrument])
async def list_instruments() -> list[Instrument]:
    """Kullanılabilir tüm ölçekler. Item bankası boş döner (özet liste)."""
    return [
        inst.model_copy(update={"items": []}) for inst in CATALOG.values()
    ]


@router.get("/{code}", response_model=Instrument)
async def get_instrument(code: str) -> Instrument:
    """Bir instrument'ın tam item bankası (anket form render'ı için)."""
    if code not in CATALOG:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instrument '{code}' bulunamadı. Geçerli: {list(CATALOG.keys())}",
        )
    return CATALOG[code]
