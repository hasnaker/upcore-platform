---
id: pulse-nedir
title: Pulse anketi nedir?
sidebar_position: 1
---

# Pulse anketi nedir?

UpCore'un pulse anketleri, yıllık değerlendirme yerine **2 haftada bir 3–8 soru** ile çalışan bağlılık
ve tükenmişlik eğilimlerini takip eder.

## Neden yıllık anket yerine pulse?

Yıllık anketlerin iki sorunu vardır:
- **Hafıza yanlılığı:** Son 2 haftanın olayları tüm yılı temsil eder gibi cevaplanır
- **Yavaş geri bildirim:** Problemi fark ettiğinizde 11 ay geçmiş olur

Pulse, **JD-R modeli** (Demerouti & Bakker, 2001) ve **BAT-TR** (Koçak, 2022) üzerine kuruludur.
Türkiye için geçerlilik çalışması yapılmış, akademik olarak onaylanmış ölçeklerdir.

## Sorular nasıl seçilir?

UpCore'un soru bankası:
- **BAT-12-TR** — 12 maddelik kısa form (Koçak 2022)
- **UWES-9** — iş bağlılığı (Schaufeli et al. 2006)
- **COPSOQ-III-TR** — psikososyal iş ortamı (Şahan 2019)
- **Özel sorular** — İK'nızın ekleyebileceği şirkete özel ifadeler

Her pulse anketi rastgele 3–8 soru çeker — böylece **test-retest yorgunluğu** engellenir.

## Cevap sisteminizin güvenliği

- Cevaplarınız **uçtan uca şifrelenir** (AES-256-GCM)
- Agrega yapılırken **en az 5 kişilik grup** eşiği zorlanır (daha küçükse sonuç gizlenir)
- Yöneticiniz bireysel cevabınızı **görememektedir** — sadece departman agregası görülür
- 7 yıl sonra otomatik **anonimleştirme** (TCKN-bağı silinir, arşiv kalır)
