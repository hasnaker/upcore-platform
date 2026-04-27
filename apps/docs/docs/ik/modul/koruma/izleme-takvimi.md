---
id: izleme-takvimi
title: İzleme takvimi
sidebar_position: 9
---

# İzleme takvimi

Müdahale süresince yapılan düzenli kontrollerin detayı.

## Takvim yapısı

Müdahale uzunluğuna göre:

### 4 haftalık müdahale

| Check-in | Zaman | Ne yapılır? |
|---|---|---|
| Week 0 | Başlangıç | Baseline BAT ölçümü |
| Week 2 | Orta | Mini pulse (3 madde) |
| Week 4 | Kapanış | BAT + UWES + memnuniyet |

### 8 haftalık müdahale

| Check-in | Zaman | Ne yapılır? |
|---|---|---|
| Week 0 | Başlangıç | Baseline |
| Week 2 | Orta | Mini pulse |
| Week 4 | Yarı | BAT ara ölçüm |
| Week 6 | Geç orta | Mini pulse |
| Week 8 | Kapanış | Tam ölçüm |

### 12 haftalık müdahale

Week 0, 2, 4, 6, 8, 10, 12 check-in'leri.

## Follow-up (müdahale sonrası)

- **3 ay sonra:** Persistent effect ölçümü
- **6 ay sonra:** Uzun vadeli takip
- **12 ay sonra:** Kalıcılık kontrolü

## Otomasyon

Sistem otomatik:
- E-posta + in-app bildirim check-in öncesinde
- Pulse anketi oluşturma
- Sağlayıcı takvimine etkinlik ekleme
- Eksik yanıt halinde hatırlatıcı

## Erken eskalasyon tetikleyici

Check-in sırasında sistem uyarır:
- BAT skorunda **kötüleşme** (d < -0.2)
- Sağlayıcı "endişe" notu
- Çalışan mini pulse'a **cevap vermiyor** (3 ardışık kez)
- Hastalık izin günü artışı

Bu durumda İK'ya hemen alarm gider (1 saat SLA).

## Sağlayıcı rapor standart

Her check-in sonrası sağlayıcının yazdığı "İK görünür" özet:
- Bu dönemdeki odak (1 cümle)
- İlerleme — %0-100 subjektif skor
- Endişe var mı? (evet/hayır)
- Bir sonraki dönem önerisi

Detaylı klinik not **ayrı** sistemde (hekim-danışan gizliliği).

## Yönetici gözlem

Yöneticiden 1 kez sorulur (Week 4 ve Week 12):
- "Son dönemde gözlemlediğin değişim?" (5 seçenek)
- Serbest not alanı (opsiyonel)

Yönetici cevabı da izleme verisine girer ama **hakim rolde değildir**.
