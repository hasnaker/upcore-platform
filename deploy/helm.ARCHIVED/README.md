# deploy/helm — ARCHIVED 2026-04-24

Bu dizin **arşivlendi**. UpCore AKS + Helm yolunu bıraktı.

- **Aktif:** Azure Container Apps (ACA) — bkz `infrastructure/azure/modules/container-app.bicep`
- **Arşiv:** `deploy/helm/*` (eski AKS Helm chart'ları)

## Neden Helm'den çıkıldı?

- **Operasyonel yük:** cert-manager + ingress-nginx + node pool yönetimi 3 ayda
  2 kez on-call incident yarattı.
- **Maliyet:** AKS 3 node D4s_v5 aylık ~$500, ACA consumption plan ilk 180K
  vCPU-saniye ücretsiz.
- **Hız:** ACA revision swap ~30s vs Helm rollout ~2-5 dk.
- **KVKK:** Azure Container Apps westeurope region'da FedRamp + ISO 27001
  sertifikalı; HA garantisi (3 availability zone) TR Central'dan daha güçlü.

Detay: [`docs/deploy/REGION_DECISION.md`](../../docs/deploy/REGION_DECISION.md)

## Bu dizinle ne yapmalıyım?

- **Okuma için saklı.** Rollback planı olarak Q2 sonuna kadar tutulacak.
- **Yeni `helm install/upgrade` ÇALIŞTIRMA.** Production ACA'da.
- **Silme:** 2026-06-30 sonrası tamamen kaldırılacak.

## Migration tamamlandı

| Dosya | Yerine geçen |
|---|---|
| `deploy/helm/upcore/values-prod.yaml.example` | `infrastructure/azure/params/prod.bicepparam` |
| `deploy/helm/upcore/templates/deployments.yaml` | `infrastructure/azure/modules/container-app.bicep` |
| `deploy/helm/upcore/templates/services.yaml` | ACA built-in Dapr service discovery |
| `deploy/helm/upcore/templates/ingress.yaml` | `infrastructure/azure/modules/front-door.bicep` |

---

Sorular: Hasan Aker (gozesalih38@gmail.com)
