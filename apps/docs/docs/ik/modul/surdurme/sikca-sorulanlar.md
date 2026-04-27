---
id: sikca-sorulanlar
title: Sürdürme — sıkça sorulanlar
sidebar_position: 10
---

# Sürdürme — sıkça sorulanlar

## Bir çalışanın cevabını görebilir miyim?

**Hayır.** Sistemde `app.pulse_responses` tablosu üzerinde read-level row-security policy:
```sql
WHERE response_count >= 5
```
zorlanır. Yani 5'ten az kişinin cevap verdiği grup sorgusu **boş set** döner.

## Katılımı nasıl artırırım?

1. Yönetici desteği — ekibe önerişi
2. Sonuçları paylaşma: "geçen ay X dediniz, bu aksiyon aldık"
3. Daha kısa anket (3-5 madde)
4. Ödül yok — entrinsik motivasyon ile kalıcı sonuç

## Ekip 3 kişilik — hiçbir şey göremiyorum

5+ kuralı ile üst birimin agregası içinde göreceksiniz. İstisna: yönetici × departman eş değilse o yöneticinin tüm raporlama hattı toplanır.

## Pulse'ı kaldırabilir miyim?

Evet, **Sürdürme > Anketler > Arşivle** yapabilirsiniz. Veri kalır ama yeni gönderim olmaz.

## Özel sorularımın güvenilirliği nasıl artar?

- En az 50 yanıtta ölç
- Madde-toplam korelasyonuna bak
- 3 ay sonra tekrarla — stabilite kontrolü
- Faktör analiziyle akademik ölçeğe entegre et (destek ekibi yardımcı olur)

## Müdahale sonrası yine kötü sonuç alıyorum

- İkinci müdahale dene — Thompson sampling alternatif önerir
- Yapısal sorun olabilir (iş yükü sistematik, tek çalışan değil)
- Eskalasyon — üst yönetime rapor

## Pulse e-postaları spama düşüyor

- SPF + DKIM + DMARC konfigürasyonunu kontrol et (Admin panelinden)
- Gönderim domain'i `mail.upcore.io` (public IP ısınmış)
- Şirket e-posta whitelisting gerekirse IT ile konuş
