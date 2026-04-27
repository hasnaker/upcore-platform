# UpCore — Backup & Disaster Recovery Playbook

**Yazan:** SRE / Platform Team
**Son güncelleme:** 2026-04-21
**RTO (Recovery Time Objective):** 4 saat
**RPO (Recovery Point Objective):** 15 dakika
**Bölge:** Azure Turkey Central (İstanbul), warm-standby Azure North Europe

---

## 1. Yedekleme katmanları

| Katman            | Mekanizma                                   | Frekans        | Saklama  |
|-------------------|---------------------------------------------|----------------|----------|
| PostgreSQL        | Azure PostgreSQL Flexible Server PITR       | Sürekli WAL    | 35 gün   |
| PostgreSQL (arşiv)| Weekly `pg_dump` → Azure Blob Storage       | Pazar 03:00    | 1 yıl    |
| Azure Blob        | Soft delete 30 gün + versioning             | Anlık          | 30 gün   |
| Service Bus       | Topic configuration as code (IaC)           | On deploy      | Kalıcı   |
| Secrets           | Azure Key Vault soft delete 90 gün          | —              | 90 gün   |
| Frontend static   | Azure Static Web Apps — Git-based deploy    | On deploy      | Kalıcı   |

---

## 2. Kurtarma senaryoları

### Senaryo A — PostgreSQL tablo/veri bozulması

**Semptom:** Bir tablo yanlış UPDATE ile kayboldu, accidental DROP.

**Adımlar:**
1. Bozulmayı fark eden saat'i not et (ör. `2026-04-21T14:32:00+03:00`).
2. Azure Portal → PostgreSQL → **Point-in-time restore**
3. Yeni sunucu oluştur (`upcore-recover-YYYYMMDD`) — **30 dakika öncesine** restore
4. Recover sunucudan ilgili tablo(lar)ı export:
   ```bash
   pg_dump -h upcore-recover-xxx.postgres.database.azure.com \
       -U upcore_recover -d upcore -t app.employees \
       --data-only > employees_recovered.sql
   ```
5. Production'da bozuk tabloyu `TRUNCATE` + re-import
6. Recover sunucusunu **en geç 24 saat içinde sil** (maliyet).

**Beklenen süre:** 30-60 dk.

### Senaryo B — Production DB tamamen kaybı

**Semptom:** Region outage, corruption, ransomware.

**Adımlar:**
1. Incident channel'ı aç (`#upcore-sre-incident-<date>`)
2. Failover kararı — CTO onayı gerekli (müşteri bildirimi tetiklenir)
3. Weekly dump'tan geo-restore:
   ```bash
   az postgres flexible-server geo-restore \
       --resource-group upcore-prod \
       --name upcore-dr-primary \
       --source-server upcore-prod-primary \
       --location "northeurope" \
       --availability-zone 1
   ```
4. DNS update (gateway + BFF env var): `DATABASE_URL` = yeni DR primary.
5. Service deploys rebuild (tüm Go services + BFF) → bağlı.
6. Saga + outbox dispatcher'ları yeniden başlat (otomatik — dispatcher zaten dispatched=FALSE satırlarını yeniden işler).
7. Smoke test: bir tenant ile tüm modüller loop.
8. Tenant bildirimi: status page + email — "X-Y saat arası veri erişimi restore edildi".

**Beklenen süre:** 2-4 saat (RTO).

### Senaryo C — Service Bus connection kaybı

**Semptom:** Eventler broker'a gitmiyor.

**Kurtarma:** **Otomatik** — Transactional Outbox pattern.
- Tüm event'ler `app.event_outbox` satırına yazıldığı için DB safe.
- Service Bus geri geldiğinde dispatcher pending satırları drain eder.
- Retry + Circuit Breaker zaten işe başlıyor.

**Aksiyon:** DLQ > 0 olan servisler için `ayarlar/dlq` üzerinden manuel replay.

### Senaryo D — Tüm tenant'ı geri alma

**Semptom:** Müşteri "dün yaptığım değişiklikleri geri al" diyor.

**Adımlar:**
1. Müşteri yazılı onay (email + imza) almadan **yapmayız**.
2. PITR kullanılarak 24-72 saat öncesine restore (Senaryo A, tenant-scoped).
3. Pas geçilen 24 saatlik yeni veri **kaybolur** — müşteri ile açık anlaşma.

---

## 3. Restore drill (3 ayda bir, zorunlu)

Her çeyrekte restore drill'i:

1. `upcore-staging-drill-YYYYQN` sunucusuna PITR restore (24 saat öncesine)
2. Schema integrity check (tablo sayısı + row count sanity)
3. Bir tenant için uçtan uca smoke (login → bordro hesapla → rapor indir)
4. `pg_dump | md5sum` — checksum prev drill ile karşılaştırma
5. Drill sunucusunu sil
6. Raporu `ops/drills/YYYY-QN.md` altında dokümante et

**Sorumlu:** SRE on-call. **Onay:** Platform Lead.

---

## 4. Monitoring + Alert eşikleri

- PostgreSQL CPU > %80 → PagerDuty (P2)
- Connection pool > %90 → PagerDuty (P2)
- Replication lag > 60 sn → PagerDuty (P1)
- Service Bus dead-letter > 100 → email (P3)
- Saga failure rate > 5% (1 saat) → email (P3)
- Azure Blob 5xx > %5 → P1

Dashboard: Grafana → **Azure infra / Postgres**, **Azure infra / Service Bus**.

---

## 5. Disaster Recovery runbook (tek komut)

`ops/dr-restore.sh` — geo-restore + DNS update + health check.

Her çalıştırmadan önce:
- [ ] CTO onayı alındı mı?
- [ ] Status page "investigating" durumuna alındı mı?
- [ ] Müşteri bildirim email taslağı hazır mı?
- [ ] Financial approval (Azure compute bu sırada 2x bill çeker)?

---

## 5a. Çeyreklik DR tatbikatı (zorunlu)

Tatbikat olmayan plan plan değildir. Her çeyrek bir kere (Ocak/Nisan/Temmuz/Ekim
içinde bir gün) **staging** ortamında aşağıdaki adımlar çalıştırılır:

```bash
ENVIRONMENT=staging \
  AZURE_SUBSCRIPTION=<...> AZURE_RESOURCE_GROUP=upcore-staging \
  PRIMARY_DB_SERVER=upcore-staging-pg \
  DB_ADMIN_USER=<...> DB_ADMIN_PASSWORD=<...> \
  ./scripts/dr-drill.sh
```

Script şunu yapar:
1. Staging DB'de baseline checksum alır (employees/tenants/audit_events count).
2. PITR ile 1 saat öncesine side DB restore eder.
3. Row count + integrity check (orphan tenant_id, null audit payload) çalıştırır.
4. Baseline ile restore sonucu diff → sadece 1 saatlik yazım farkı beklenir.
5. Side DB'yi siler, toplam süreyi RTO bütçesine (60 dk) karşı raporlar.

**Kabul kriterleri:**
- Script hatasız sonlanır (exit 0)
- Duration ≤ 60 dakika
- Integrity check hiçbir `✗ FAILED` üretmez
- Row count delta ≤ beklenen 1h yazım hacmi

**Rapor:**
- `ops/dr/reports/YYYYMMDD.md` dosyası açılır (drill tarihi, aktör, sonuç, süre, bulgular).
- Başarısız bir drill → tatbikatın tekrarı 30 gün içinde zorunlu, ayrıca incident retro.
- Drill logu CI artifact olarak 90 gün saklanır (k6 load testleri gibi).

**GitHub Actions tetikleyici (manuel):**
`.github/workflows/load.yml` şablonundaki `workflow_dispatch` paterni ile ayrı
bir DR drill workflow'u açılabilir; ancak başlangıçta çeyreklik kuralı SRE
takvimiyle manuel yürütülür (insan onayı zorunlu).

---

## 6. KVKK uyumu

- Silme (KVKK 11) talebi: `kvkk@upcore.app` → 7 gün içinde tenant için hard delete + geo-restore'lardan silme isteği Azure'a (30 gün SLA).
- Yedekleme saklama süreleri KVKK 28/1 ile uyumlu (işlem amacı devam ettiği sürece).
- Backup dosyaları AES-256 encrypted at rest (Azure default).

---

## Sorumlular

- **SRE on-call:** Günlük backup doğrulama (monitoring scripti)
- **Platform Lead:** Quarterly drill onayı
- **CTO:** Region failover kararı
- **KVKK DPO:** Silme talepleri + kanıtlama

Şüphe durumunda `#upcore-sre` Slack kanalı. İnsan hayatı / yasal sorumluluk söz konusu değilse acele karar verme.
