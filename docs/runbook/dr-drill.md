# Runbook — Disaster Recovery Drill

**Owner:** Hasan Aker · **Updated:** 2026-04-24
**Cadence:** Her çeyrek bir kez (staging only) · **Süresi:** ~60-90 dk
**Blast radius:** STAGING ONLY — prod'da asla çalıştırma.

---

## 1. Amaç

Her çeyrekte DR planını pratikte test ederek RTO ≤ 60dk, RPO ≤ 15dk
hedeflerinin halen geçerli olduğunu doğrulamak.

**Bir drill başarılıysa:**
- Prod'da gerçek incident olsa da benzer süre içinde recovery yapılabilir.
- Müşteri Enterprise SLA'daki RTO taahhüdü ispatlanmış olur.
- Team (solo founder durumunda Hasan) pratik deneyim kazanır.

---

## 2. Önkoşullar

- [ ] Staging environment sağlıklı (son 7 gün kesintisiz)
- [ ] Staging'de production verisine yakın hacim (min 1000 employee, 10 tenant)
- [ ] Azure CLI login (`az account set --subscription <staging-sub>`)
- [ ] PostgreSQL admin credentials (Key Vault'tan al)
- [ ] Slack `#sre-drill` kanalı hazır
- [ ] 2-3 saat boş blok (drill sırasında başka iş yok)

---

## 3. Prosedür

### Step 1 — Duyuru

Slack `#sre-drill`:
```
:dart: DR drill başlıyor — staging, ~60 dk
Stakeholder: Hasan (solo)
Rollback: drill fail olursa side DB sil, staging dokunulmaz
```

### Step 2 — Baseline

```bash
cd /path/to/upcore-platform
export ENVIRONMENT=staging
export DATABASE_URL="..."            # from Key Vault upc-staging-kv/db-admin-url
export AZURE_SUBSCRIPTION="..."
export AZURE_RESOURCE_GROUP=upc-staging-rg
export PRIMARY_DB_SERVER=upc-staging-pg-flex
export DB_ADMIN_USER=upcoreadmin
export DB_ADMIN_PASSWORD="..."       # Key Vault

# Dry run first — validate environment
./scripts/dr-drill.sh --dry-run
```

### Step 3 — Execute

```bash
./scripts/dr-drill.sh
```

Script (detay: `scripts/dr-drill.sh`):
1. Baseline snapshot (row counts)
2. PITR restore to side DB (`upcore_dr_TIMESTAMP`)
3. Integrity checks (no orphan records, no null audit payloads)
4. Diff baseline vs restored (expected drift = 1h of writes)
5. Teardown side DB (unless `--skip-teardown`)

### Step 4 — Verify

```bash
# Log dosyasını incele
cat /tmp/dr-drill-TIMESTAMP.log | grep -E '^Step|✗|FAIL|PASS'

# Side DB gerçekten silindi mi? (teardown başarılıysa)
az postgres flexible-server list \
  --subscription $AZURE_SUBSCRIPTION \
  --resource-group $AZURE_RESOURCE_GROUP \
  --query "[?contains(name, 'upcore_dr_')].name"
# Beklenen: [] (boş)
```

### Step 5 — Raporlama

Rapor dosyası `ops/dr/reports/YYYY-MM-drill.md` oluştur:

```markdown
# DR Drill Report — YYYY-MM

## Run info
- Date: YYYY-MM-DD HH:MM UTC
- Operator: Hasan Aker
- Environment: staging
- Script version: (git rev-parse HEAD)

## Results
- Total elapsed: XXm (target ≤60m)
- RTO: PASS / FAIL
- RPO: XX minutes (observed drift vs baseline)
- Integrity checks: X passed / Y failed

## Issues
1. [... any unexpected behavior ...]

## Action items
| # | Item | Owner | Due |
|---|---|---|---|
| 1 | ... | ... | ... |
```

### Step 6 — Slack sonuç

```
:white_check_mark: DR drill tamamlandı
- Süre: XXm (target 60m)
- RTO: PASS
- Rapor: ops/dr/reports/YYYY-MM-drill.md
- Action items: (varsa)
```

---

## 4. Failure Scenarios ve Ne Yapılmalı?

### 4.1 Side DB restore hatası (Azure throttling)

**Log:** `Error: The server quota has been exceeded`
**Çözüm:** 1 saat bekle, tekrar dene. Sustained ise Azure support ticket.

### 4.2 Integrity check FAIL (orphan employees)

**Log:** `✗ FAILED: orphan employees (no tenant_id)`
**Aksiyon:**
1. Drill DURDUR — rapor P0 marked.
2. `psql` ile staging'de aynı kontrolü yap: `SELECT count(*) FROM app.employees WHERE tenant_id IS NULL;`
3. Eğer prod'da da varsa → acil incident (RLS bypass riski).

### 4.3 PITR restore timeout (>60 dk)

**Log:** `az postgres flexible-server wait` timeout
**Aksiyon:**
1. Azure portal'dan restore status kontrolü — ilerliyor mu?
2. İlerleyen restore'u beklet (3 saate kadar normal)
3. RTO > 60dk = FAIL → action item "ayrı hot standby region" eklenir.

### 4.4 Teardown fail (side DB silinemedi)

**Log:** `az postgres flexible-server delete` non-200
**Aksiyon:**
1. Azure Portal'dan manuel sil.
2. Maliyet kaçmaması için alerts kontrol.

---

## 5. Kalite Metrikleri

Her drill sonrası ölç:

| Metrik | Target | Trend takibi |
|---|---|---|
| Toplam süre (RTO proxy) | ≤ 60m | Çeyrek bazında |
| Integrity PASS/FAIL | 100% pass | Regression yok |
| Unexpected behavior count | ≤ 2 | Azalmalı |
| Action item closed-by-next-drill | > 80% | Disiplin kontrol |

Dashboard: (TODO) `observability/dashboards/dr-readiness.json`

---

## 6. Production DR (gerçek incident)

Bu prosedür **staging drill** içindir. Gerçek prod incident'ta:

1. **Durumu değerlendirme:** Gerçekten DR gerekli mi yoksa ACA revision
   swap yeterli mi?
2. **Status page:** Önce müşteri bildirimi, sonra teknik aksiyon.
3. **Customer-facing comms:** Her 15 dakikada bir güncelleme.
4. **Restore decision:** PITR vs point-snapshot — son 15dk kayıp kabul edilebilir mi?
5. **Incident post-mortem:** 24 saat içinde `ops/incidents/`'a.

Detay: `docs/runbook/on-call-procedures.md`

---

## 7. Referans

- [scripts/dr-drill.sh](../../scripts/dr-drill.sh)
- [ops/BACKUP_RESTORE.md](../../ops/BACKUP_RESTORE.md)
- [ops/dr/reports/](../../ops/dr/reports/)
- [docs/deploy/REGION_DECISION.md](../deploy/REGION_DECISION.md) — region + DR strategy
- [Azure Postgres Flex PITR](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-backup-restore)
