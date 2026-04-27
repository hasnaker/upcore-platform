---
title: "Model Card — Burnout Prediction v2 (XGBoost + Calibration + Fairlearn)"
version: v2.0
owner: UpCore Science + ML Ops
last_updated: 2026-04-23
license: Apache 2.0 (code) · CC-BY-4.0 (documentation)
status: staging (shadow mode until prospective validation completes, target 2026-10)
---

# Burnout Prediction v2 — Model Card

**Format:** [Google Model Cards (Mitchell et al. 2019)](https://modelcards.withgoogle.com/about) uyarlaması,
[AB AI Act yüksek-risk dokümantasyon maddesi 11](https://artificialintelligenceact.eu/) + KVKK Madde 22 eklerini kapsar.

---

## 1. Model Details

| Alan | Değer |
| --- | --- |
| Model adı | `burnout-prediction` |
| Versiyon | `v2.0-xgb-calibrated` |
| Mimari | XGBoost 2.x + (Platt / Isotonic) kalibrasyon wrapper |
| Predecessor | `heuristic_v0.1` (weighted rules, halen production) |
| Eğitim çerçevesi | Python 3.12, `scikit-learn 1.5`, `xgboost 2.1`, `shap 0.46`, `fairlearn 0.11` |
| Servis | FastAPI, container `ml-services/burnout-prediction` |
| Lisans | Kod: Apache 2.0 · Model ağırlıkları: enterprise lisansına bağlı, açık mimari |
| Sahibi | Hasan Aker (product), UpCore Science Lead |
| DPO | KVKK DPO (tenant başına atanır), review imzası `audit.ml_model_approved.v1` |
| Registry | `ml-services/burnout-prediction/app/registry.py` (MLflow + S3 mirror) |

---

## 2. Intended Use

**Birincil kullanım:** Çalışanın önümüzdeki 30/60/90 gün içinde BAT-TR temelli
tükenmişlik göstergesi geliştirme olasılığını **İK ve yöneticiye karar-destek**
olarak sunmak. Kırmızı / sarı / yeşil bant + SHAP açıklama + güven aralığı.

**Yasal zemin:** KVKK Madde 5/2-f (meşru menfaat, çalışan iyi oluşu) + açık rıza
(`ai_recommendations` consent type, Madde 9 hassas veri). Her tahminden önce
``app/inference/consent.py`` rıza durumunu kontrol eder; rıza yoksa tahmin
üretilmez.

---

## 3. Out-of-Scope / Forbidden Uses

Bu model **asla** şu amaçlar için kullanılmamalıdır:

* İşe alım (AB AI Act Ek III "employment" yüksek-risk maddesi — insan kararı zorunlu).
* Disiplin işlemi, ücret kesintisi, yazılı uyarı, ikaz.
* Terfi, rotasyon, yedekleme kararı.
* Otomatik iş sözleşmesi feshi.
* Sağlık verisi ile çapraz bağlama (HIPAA benzeri sınır, Türkiye'de KVKK Madde 6 hassas).
* Reklam hedefleme, pazarlama segmentasyonu.

İzinsiz bu kullanımlar otomatik olarak **gateway RBAC katmanında** reddedilir
(middleware: `services/auth/internal/middleware/rbac.go`, kural:
`intervention.* → manager_approved_only`).

---

## 4. Training Data

| Boyut | Hedef | Mevcut (Nisan 2026) |
| --- | --- | --- |
| Örnek sayısı | ≥ 10.000 pulse-outcome çifti | 0 (pilot tenant data collection ongoing) |
| Kapsam | 12 haftalık signal window | BAT-12-TR, COPSOQ-III-TR, UWES-9, UpCap, JCS |
| Kaynak | Pilot tenant'lar (etik onamlı) | — |
| Time split | Train/val/test aynı çalışan farklı zaman | Leakage test: `tests/integration/test_feature_engineering.py` |
| Stratified balance | sektör × cinsiyet × yaş dengeli | Target: 4/5ths selection rule per demographic |
| Retention | Training verisi 24 ay | Ham veri anonymized, tenant bazlı silinir (Madde 11 erasure) |

**Feature set:** 42 özellik (bkz. `app/features/feature_spec.py`). Kategoriler:
BAT-TR boyutları, COPSOQ iş yükü/özerklik/destek, davranış sinyalleri
(devamsızlık/mesai/geri bildirim), manager 1:1 sıklığı, demografik.

---

## 5. Evaluation

### 5.1 Discrimination
| Metric | Hedef | v2 (hold-out) |
| --- | --- | --- |
| AUROC (test) | ≥ 0.80 | *pending retrain* |
| PR-AUC | ≥ 0.55 | *pending* |
| Prospective AUROC (3-6 ay shadow) | ≥ 0.75 | *pending* |

### 5.2 Calibration (app/calibration.py)
| Metric | Hedef | v2 |
| --- | --- | --- |
| Brier score | < 0.15 | *pending* |
| ECE (15 bin) | < 0.05 | *pending* |
| Method | Platt + Isotonic karşılaştırması | İzotonik öncelik (küçük sample'da daha robust) |

Calibration plot JSON `/api/v1/burnout/audit/calibration`.

### 5.3 Fairness (app/bias_audit.py)
| Metric | Eşik |
| --- | --- |
| Demographic parity diff | ≤ 0.10 |
| Equal opportunity diff | ≤ 0.10 |
| 4/5ths rule | min/max ≥ 0.80 |
| Sensitive attributes | gender, age_band (`<30`, `30-44`, `45+`), department |

Bias report `/api/v1/burnout/audit/bias-report`. Fail olursa: `ThresholdOptimizer`
post-processing (`fairlearn.postprocessing`) otomatik tetiklenir.

### 5.4 Drift (app/drift.py)
PSI > 0.20 üç ardışık haftada tetiklenirse retrain kuyruğa atılır.
Report: `/api/v1/burnout/audit/drift`.

---

## 6. Ethical Considerations

* **False positive maliyeti:** "Risk var" alarmı yanlışsa çalışan stigmatize
  edilebilir. Bu nedenle tüm yüksek-risk tahminler (i) İK review, (ii) manager
  onay, (iii) çalışan rıza akışı olmadan müdahale atanamaz. Otomatik eylem YOK.
* **Ters nedensellik:** Model korelasyon, neden değil. SHAP açıklaması "bu
  özellik riski artırıyor" der; "bu özellik nedenidir" demez.
* **Bağımlılık riski:** İK'nın bu modele aşırı güvenmesi gözetim pratiğine
  dönüşebilir. Eğitim materyali + kullanım SLA: maksimum haftalık 1 rapor.
* **Opt-out hakkı:** Çalışan `portal/kvkk-consent-manager` üzerinden
  `ai_recommendations` consent'i geri çekebilir → tahmin üretilmez.
* **İtiraz hakkı:** `portal/ml-itiraz` sayfasından her tahmin için itiraz
  açılabilir (KVKK Madde 22). 30 gün içinde İK + veri bilimi manuel inceler.

---

## 7. Caveats & Limitations

* Türkiye dışı popülasyonda geçerlilik **teyit edilmemiştir**.
* Uzaktan / hibrit / ofis çalışan ayrımı feature olarak modellenir ama
  kampüs/vardiya yoğun işkollarında (üretim, sağlık) veri dengesizliği var.
* 30 gün altı kısa dönem tahminler; 90 günlük tahminler için CI genişler
  (`inference/predict.py` CI_WIDTHS).
* Model **klinik tanı koymaz**; tükenmişlik sendromu DSM/ICD-11 kapsamında
  meslek hastalığıdır — tanı hekim kararıdır. Model yalnızca erken sinyal
  gösterir.

---

## 8. Governance

| Süreç | Araç | Tetik |
| --- | --- | --- |
| Model registry | `app/registry.py` (MLflow + S3) | Her retrain |
| Stage transitions | `staging → production → archived` | Promotion gates (AUROC + ECE + fairness) |
| Rollback SLA | < 5 dakika | `ModelRegistry.rollback_to_previous_production()` |
| Audit log | `app.ml_predictions_audit` (append + outcome update) | Her tahmin |
| Shadow mode | `app/shadow.py` | 3-6 ay yeni model için zorunlu |
| Algorithmic audit | 3. taraf akademik ortak | Yılda 1 kez |
| Ethics committee | akademik + DPO + kurucu | Yılda 2 kez + her major release |

---

## 9. Transparency Report

Her çeyrekte:
* `bias-report-YYYY-QN.pdf` → `docs.upcore.io/ml/reports/`
* `calibration-YYYY-QN.json` → aynı yerde
* Drift alarm'ları + retrain tarihi + version log

---

## 10. Contact

| Rol | Kanal |
| --- | --- |
| Model sahibi | `hasan@upcore.io` (geçici, kurucu) |
| DPO | tenant başına atanır, default `dpo@upcore.io` |
| Security | `security@upcore.io`, PGP key `0x…` |
| Araştırma ortaklığı | `research@upcore.io` (akademik partner davet) |

---

**Model kartı şeffaflık taahhüdümüzün bir parçasıdır** — eksiklikleri görüp
katkı yapmak isteyen akademisyen / sivil toplum / düzenleyici aktörler
`github.com/upcore/ml-burnout` üzerinden PR açabilir.
