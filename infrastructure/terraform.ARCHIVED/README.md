# infrastructure/terraform — ARCHIVED 2026-04-24

Bu dizin **arşivlendi**. UpCore artık tek bir IaC stack kullanıyor:

- **Aktif:** `infrastructure/azure/*.bicep` (Azure Bicep + Azure Container Apps)
- **Arşiv:** `infrastructure/terraform/*` (eski TR Central + AKS + Helm yolu)

## Neden tekleştirildi?

Üç paralel deploy stack (Terraform + Bicep + Helm) migration'ları
bozuyor ve on-call'u aşırı yüklüyordu. Tek stack kararı için bkz:

- [`docs/deploy/REGION_DECISION.md`](../../docs/deploy/REGION_DECISION.md)
- [`DEPLOY.md`](../../DEPLOY.md) (Bicep + ACA only)

## Bu dizinle ne yapmalıyım?

- **Okuma için saklı.** Eski production state referansı için gerekli.
- **Yeni apply çalıştırmayın.** `.terraform/terraform.tfstate` artık source-of-truth değil.
- **Silme uyarısı:** 2026-06-30 sonrası tamamen silinecek. O zamana kadar migration
  doğrulaması için lazım olabilir.

## Taşınan dosyalar

Dosyalar fiziksel olarak `infrastructure/terraform/` altında kaldı
(Terraform state bağlılığı nedeniyle), bu klasör yalnızca **deprecation
flag'i** taşıyor. CI/CD artık bu dizinde çalışmıyor — `.github/workflows/`
tamamen Bicep'e geçti.

## Migration planı

| Adım | Durum | Tarih |
|---|---|---|
| Bicep parity reached | DONE | 2026-03-15 |
| Terraform state freeze | DONE | 2026-04-10 |
| CI removal | DONE | 2026-04-24 |
| Physical delete | PLANNED | 2026-06-30 |

---

Sorular: Hasan Aker (gozesalih38@gmail.com)
