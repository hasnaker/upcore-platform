# UpCore — Region & Deploy Stack Kararı

**Status:** APPROVED · **Date:** 2026-04-24 · **Owner:** Hasan Aker

---

## Karar Özeti

1. **Platform:** Azure Container Apps (ACA) — AKS değil, App Service değil
2. **IaC:** Bicep (ARM native) — Terraform değil, Pulumi değil
3. **Region:** **westeurope** (Amsterdam) — Turkey Central değil, North Europe (Dublin) değil
4. **DR Standby:** **northeurope** (Dublin) — warm read-replica + PITR backup
5. **Status Page Region:** **swedencentral** (ana platform down olsa bile ayakta)

---

## 1. Region: westeurope Seçildi

### Adaylar

| Region | Latency (IST) | HA Tier | KVKK Uyum | ACA Desteği | GPU SKU |
|---|---|---|---|---|---|
| **westeurope (Amsterdam)** | ~55ms | 3 AZ | GDPR + KVKK Madde 9 onamı ile OK | Full (GA) | Yes |
| turkeycentral (İstanbul) | ~15ms | 1 AZ (HA sınırlı) | Yerel data residency | Preview only | No |
| northeurope (Dublin) | ~60ms | 3 AZ | GDPR uygun | Full (GA) | Yes |
| germanywestcentral (Frankfurt) | ~50ms | 3 AZ | GDPR + BDSG | Full (GA) | Yes |

### Neden westeurope?

- **High Availability:** 3 availability zone — TR Central tek AZ, region-level outage riski yüksek.
- **ACA Full GA:** Revision management, Dapr, Workload Profiles (Consumption + Dedicated) full
  desteklenir. TR Central'da preview.
- **OpenAI Access:** Azure OpenAI westeurope'da GPT-4o + text-embedding-3-large erişilebilir.
  TR Central'da değil.
- **Fiyat:** TR Central %15-20 daha pahalı (Azure regional pricing 2026).

### Neden TR Central değil?

- **Preview stack:** ACA + Azure AI preview → SLA sadece %99.0, prod için yetersiz.
- **HA sınırlı:** Tek availability zone — zone-redundant PostgreSQL Flex yok.
- **OpenAI yok:** ML servisleri (burnout-prediction, recommendation) için Westeurope'a out-of-region
  proxy gerekir → latency + compliance karmaşası.
- **Bölgesel down:** Q4 2025'te 2 region-level incident yaşandı (public Azure status).

---

## 2. KVKK Rasyoneli

UpCore müşteri verisini AB'de (westeurope) saklar. Bu, KVKK kapsamında:

### Madde 9 (Yurt Dışına Aktarım) — Uyum Yolu

- **Onam temelli:** Müşteri tenant'ı onboarding Step 7'de açık rıza verir
  ("Verilerim AB data center'da işlenebilir").
- **Yeterli koruma ülkesi:** Hollanda (EU üyesi) KVKK Kurul tarafından tanınmış,
  Standart Sözleşme Şartları (SCC) eki sözleşmeye eklenir.
- **DPA ek maddesi:** `legal/templates/dpa-annex.md` içinde AB transferi + SCC
  açık yazılı.

### Madde 6 (Sağlık & Özel Nitelikli Veri)

- UpCore burnout skorları (BAT-12-TR sonuçları) **sağlık verisi sayılmaz** —
  iş yerinde tükenmişlik, tıbbi teşhis değil. Ancak ihtiyati yaklaşımla
  Madde 6 istisnası gibi davranıyoruz:
  - **Açık rıza** çalışan tarafından pulse anketi öncesi alınır.
  - **Anonimleştirme:** Individual scores 12 ay sonra k-anonymity (k≥5) uygulanır.
  - **Erişim log:** Her skor görüntüleme `app.audit_events` tablosunda kalıcı.

### VERBIS Kaydı

- `upcore.io` yurtiçi hukuki varlık: **UpCore Teknoloji A.Ş.** (Maslak/İstanbul)
- VERBIS kayıt no: Başvuru taslağı `compliance/kvkk/verbis-draft.json` içinde
- Veri sorumlusu: CEO (Hasan Aker) · DPO: sertifikalı dış danışman (2026-Q3)

---

## 3. DR & Backup

| Katman | Primary | Standby | RPO | RTO |
|---|---|---|---|---|
| PostgreSQL Flex | westeurope (3 AZ) | northeurope read-replica | ≤ 5 dk | ≤ 15 dk (zone failover) / ≤ 60 dk (region failover) |
| Blob Storage | westeurope LRS | northeurope geo-redundant | 15 dk | 30 dk |
| Key Vault | westeurope | northeurope (soft-delete + purge-protect) | 0 | 60 dk |
| Container Registry | westeurope Premium | northeurope geo-replica | 15 dk | 15 dk |

DR drill: `docs/runbook/dr-drill.md` — 2026-05-15 planned first run.

---

## 4. Stack Tekleştirme

**Öncesi:** 3 paralel stack yönetiliyordu → operasyonel yük + drift + aşırı on-call.

| Eski | Yeni |
|---|---|
| Terraform + AKS + Helm | ARCHIVED (`*.ARCHIVED/`) |
| Bicep + ACA (preview) | Bicep + ACA (production) |
| Manual `kubectl apply` | GitHub Actions → `az containerapp update` |

**Tek deploy pipeline:** `.github/workflows/production.yml` — `workflow_dispatch` ile manuel
tetik + wave-based rollout (gateway → core → business → ML → frontend).

---

## 5. Rollback Strategy

Karar yanlış çıkarsa geri dönüş planı:

1. **westeurope → germanywestcentral migration:** 1 gün (PostgreSQL flex geo-restore
   + Bicep parametresinde region değiştir + Front Door traffic swap).
2. **ACA → AKS fallback:** `deploy/helm.ARCHIVED/` restore et, 2-3 gün
   (Helm chart'lar hâlâ geçerli, sadece image tag güncellenir).
3. **Bicep → Terraform fallback:** `infrastructure/terraform.ARCHIVED/` apply
   (state out-of-date, dikkatli diff gerekli, 4-6 saat).

---

## 6. Takip & Review

- **İlk 30 gün:** Weekly latency + error rate check. p95 > 400ms veya error rate
  > 0.5% olursa region karar re-open.
- **3 ay sonra (2026-07-24):** Müşteri feedback + actual latency + cost
  değerlendirmesi.
- **KVKK denetim:** 2026-Q4 dış denetçi ile AB transferi onam akışı review.

---

## Referans

- [Azure Container Apps regions](https://learn.microsoft.com/en-us/azure/container-apps/overview)
- [KVKK Madde 9 Yurt Dışı Aktarım Rehberi (2024)](https://www.kvkk.gov.tr/)
- [Azure PostgreSQL Flexible Server HA modes](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-high-availability)
- [DEPLOY.md](../../DEPLOY.md) — operational playbook
