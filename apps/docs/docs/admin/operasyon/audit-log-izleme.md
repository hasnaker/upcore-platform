---
id: audit-log-izleme
title: "Audit log izleme"
sidebar_position: 6
---

# Audit log izleme

Sistemdeki her önemli aksiyonun kaydı.

## Neler kaydedilir?

- Login / logout (başarılı ve başarısız)
- Veri erişim (kim neyi ne zaman okudu)
- Veri değiştirme (eski değer + yeni değer)
- Permission değişim
- Export / import
- API key oluşturma / kullanma
- Impersonation
- Webhook tetiklemeleri
- Cron job başlatma / tamamlama

## WORM kuralı

**Write Once Read Many** — audit log:
- Yazılır ama değiştirilemez
- Silinemez
- 7 yıl saklanır (Enterprise: 10 yıl)
- Dijital imzalı

## Arama

**Admin > Audit log > Arama**

Filtreler:
- Tarih aralığı
- Kullanıcı
- Aksiyon türü
- Kaynak ID
- IP address
- Başarılı / başarısız

## Anomali tespiti

UpCore otomatik:
- Olağandışı login (ülke, saat, cihaz)
- Büyük veri erişim patern'i
- Hakkaniyetsiz bulk operasyon
- Rate limit patlak

## SIEM entegrasyon

Enterprise: SIEM'e stream export
- Splunk
- Elastic Stack
- Azure Sentinel
- AWS CloudWatch

## Rapor

- Haftalık otomatik e-posta (admin)
- Aylık risk raporu
- Yıllık compliance rapor
