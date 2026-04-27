---
id: bulk-export
title: "Bulk export"
sidebar_position: 5
---

# Bulk export

Büyük veri setlerinin toplu dışa aktarımı.

## Export türleri

- **Tam snapshot:** Tüm tenant verileri (backup amaçlı)
- **Kategori:** Sadece çalışanlar / pulse / bordro
- **Tarih aralıklı:** Belirli dönem
- **Özel filtre:** Custom SQL-like

## Format

- CSV (Excel uyumlu)
- JSON (developer)
- Parquet (data engineer)
- Excel (XLSX) — çoklu sayfa

## Async akış

Büyük export (>100 MB) async:
1. Request → Job ID
2. Durum kontrol endpoint
3. Tamamlanınca S3-compatible link
4. 7 gün geçerli

## KVKK

Export işlemi öncesi:
- Gerekçe zorunlu (dropdown + serbest)
- Onay akışı (>1 GB için İK + DPO)
- Audit log
- Kişisel veri masking opsiyonu

## Lite export

Küçük veri (<10 MB) sync direkt CSV response.
