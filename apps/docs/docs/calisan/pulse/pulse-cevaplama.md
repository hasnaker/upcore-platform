---
id: pulse-cevaplama
title: Pulse anketini cevaplama
sidebar_position: 2
---

# Pulse anketini cevaplama

Pulse anketi tipik olarak **2 dakika** alır.

## Adımlar

1. E-posta / Slack bildirimine tıklayın
2. Her soruyu **1–5 Likert ölçeği** ile puanlayın (1 = Hiç katılmıyorum, 5 = Tamamen katılıyorum)
3. Dilerseniz serbest metin alanına kısa yorum ekleyin (opsiyonel)
4. **Gönder** butonu — cevaplarınız anında şifrelenerek kaydedilir

:::tip
Cevapları değiştiremezsiniz; bu, **veri güvenilirliği** için kasıtlı bir tasarım seçimidir. Eklemek istediğiniz bir şey varsa serbest metin alanını kullanın.
:::

## Serbest metin yorumu

- Otomatik **NLP duygu analizi** çalıştırılır (ama ilk geçiş olumlu/olumsuz sınıflama ile sınırlıdır)
- Şirkete özel bilgiler (müşteri adı, proje kodu) otomatik **maskelenir**
- İK, yorumu **orijinal halde görür** ama yöneticiye **özet** döner

## Anonimlik garantisi

| Senaryo | Cevap görünür mü? |
|---|---|
| Departmanda 10 kişi cevap verdi | Evet, agrega olarak |
| Departmanda 4 kişi cevap verdi | Hayır, "yetersiz veri" gösterilir |
| Tek kişilik "departman" | Hiçbir zaman gösterilmez |

## Cevap vermemek

- İlk hatırlatıcı: 3 gün sonra
- İkinci hatırlatıcı: 7 gün sonra
- Sonra susar — cevap zorunlu değildir
- Cevap vermeme oranı İK tarafında izlenir ama kimin cevap verdiği/vermediği **hiçbir zaman görünmez** (agrega %)
