---
id: csv-import
title: "CSV ile çalışan import"
sidebar_position: 3
---

# CSV ile çalışan import

Toplu çalışan aktarımı.

## CSV şablonu

22 zorunlu sütun:
- tckn
- ad
- soyad
- dogum_tarihi (YYYY-MM-DD)
- isim_soyisim
- email
- telefon
- departman (varolan departman ID)
- pozisyon
- personel_tipi (MEMUR_657 / 4B / 4857 / STAJYER)
- ise_giris_tarihi
- brut_maas
- iban
- sgk_sicil_no
- askerlik_durumu
- medeni_durum
- egitim
- acil_iletişim_ad
- acil_iletişim_telefon
- adres
- engellilik_orani (0-100)
- yabanci_dil (JSON, örn ["en:C1","de:A2"])

## Validation

- TCKN Mod 11 algoritma
- IBAN TR format (26 karakter)
- Tarih formatı
- Maaş > asgari ücret
- Departman ID mevcut
- Zorunlu alanlar boş değil

## Error handling

- Preview'da hatalar satır-bazlı gösterilir
- Hatalı satırlar exclude edilerek devam (opsiyonel)
- Tüm hatalar CSV olarak export
