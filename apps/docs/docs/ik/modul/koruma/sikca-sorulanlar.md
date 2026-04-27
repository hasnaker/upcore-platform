---
id: sikca-sorulanlar
title: Koruma — sıkça sorulanlar
sidebar_position: 10
---

# Koruma — sıkça sorulanlar

## Müdahale zorla yaptırılabilir mi?

**Hayır.** KVKK Madde 6 (özel nitelikli veri) açık rıza gerektirir. Çalışan reddederse müdahale yapılmaz, red **işten çıkarma / zam kesinti** gerekçesi **olamaz**.

## İK olarak çalışanın terapi notlarını okuyabilir miyim?

Hayır. Hekim-danışan gizliliği (6023 sayılı Tabipler Birliği Kanunu + psikolog meslek etiği) korunur. İK yalnızca sağlayıcının paylaştığı "İK görünür" özetleri görür.

## Thompson sampling ırkçı / cinsiyetçi olabilir mi?

Olabilir — tüm ML modellerinde bias riski vardır. UpCore:
- **Yıllık bias denetimi** (Fairlearn + İSE custom metric)
- Protected attribute'lara göre müdahale dağılımı raporu
- Tespit edilen bias → **yeniden eğitim** zorunlu

[Bias denetim detayları](/docs/ik/modul/analitik/bias-denetimi)

## Bir müdahale etki göstermedi — ne olur?

- Alternatif müdahale önerilir (Thompson sampling)
- Posterior güncellenir, modelin güven aralığı genişler
- 3 ardışık başarısız → **klinik eskalasyon** (psikolog / psikiyatrist)

## Fiyatı kim ödüyor?

- İç koçluk: şirket personel maliyeti içinde
- Dış uzman (referral): paket planında dahil veya ücretli
- Enterprise planı aylık 20 seansa kadar dahil
- Enterprise Plus: sınırsız EAP (Employee Assistance Program)

## Müdahale sırasında çalışan ayrılırsa?

- Plan kapatılır (CANCELLED durumuna geçer)
- Etki ölçümü son veriler ile yapılır
- Çalışan veriler saklama politikasına göre saklanır
- **Exit interview** sırasında UpCore deneyimi hakkında opsiyonel soru

## 3. taraf terapistleri nasıl denetliyorsunuz?

- Lisans doğrulaması (TPD, TPsiB, ICF)
- Yıllık müşteri memnuniyeti anketi
- Müdahale başı d metric izlemi
- Şikayet → 14 gün içinde soruşturma
- 3 şikayet → sözleşme fesih
