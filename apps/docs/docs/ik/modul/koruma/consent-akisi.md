---
id: consent-akisi
title: Consent (açık rıza) akışı
sidebar_position: 4
---

# Consent (açık rıza) akışı

Müdahale öncesi KVKK uyumlu açık rıza alma süreci.

## Neden açık rıza?

KVKK Madde 5/2:
- Meşru menfaat gerekçesi **yetmez** çünkü müdahale **özel nitelikli veri** (sağlık/mental iyi oluş) üretir
- Madde 6/2 özel nitelikli veriler için **açık rıza** şart
- Rızalı olmadan başlamak **idari para cezası** + müşteri güven kaybı

## Consent formu içeriği

Her müdahale için otomatik üretilir, içerik:

1. **Ne yapılacak?** Müdahale adı + detaylı özet (3 cümle)
2. **Neden bana önerildi?** "Pulse sinyallerinden yola çıkılarak..."
3. **Ne kadar sürecek?** 4/8/12 hafta
4. **Kim uygulayacak?** İç koç / dış koç / psikolog
5. **Benim sorumluluklarım?** Haftada X saat, Y check-in
6. **Riskler?** Duygusal yoğunluk, zaman yatırımı
7. **Faydalar?** Beklenen Cohen's d, iş tatmini artışı
8. **Red hakkı** "İstediğim zaman geri çekebilirim"
9. **Verilerim?** Kimler görecek, ne kadar saklanacak
10. **İletişim:** Sorular için kime?

## Yanıt seçenekleri

Çalışana 3 seçenek sunulur:

- ✅ **Onaylıyorum** — müdahale başlar
- ❌ **Reddediyorum** — vaka kapanır, **red için gerekçe sorulmaz**
- ❓ **Ek bilgi istiyorum** — İK ile 30 dk görüşme talep edilir

## Yanıt süresi

- Varsayılan: 5 iş günü
- 3 iş gününde hatırlatıcı
- Yanıt gelmezse: otomatik **dolaylı red** (KVKK açık rıza "hayır" varsayımı)

## Geri çekme (withdrawal)

Consent verdi → müdahale başladı → istediği zaman çekebilir:

1. Hesap > Müdahaleler > "Geri çek" butonu
2. Onay sonrası tüm toplantılar iptal
3. Veri silinmez ama işleme durur (KVKK Madde 11/e ayrıca gerekirse)
4. Eski kayıtlar araştırma amaçlı anonimleştirilerek saklanır

## Denetim

Her consent kaydı **WORM** (write-once, read-many) audit log'a yazılır:
- Timestamp
- Consent metni hash'i
- Çalışan dijital imza hash'i
- IP + device bilgisi

Denetim sırasında denetçi bu kayıtları görebilir — içerik şifrelenir (sadece İK + çalışan okuyabilir).

## Yaş eşiği

18 yaş altı çalışan için ayrıca veli rızası gerekir (stajyer/genç işçi). UpCore bu durum için ayrı ekran akışı sağlar.
