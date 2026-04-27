# Cryptography Policy

**ISO 27001 A.8.24 · SOC 2 CC6.7**
**Versiyon:** 1.0 · 2026-04-22

## Onaylı algoritmalar

| Kullanım | Algoritma | Min/Max |
|---|---|---|
| At-rest encryption | AES-256 (Azure Storage Service Encryption) | AES-256 |
| In-transit | TLS 1.3 (TLS 1.2 legacy müşteri için fallback) | TLS 1.2+ |
| Password hash | bcrypt | cost ≥ 12 |
| JWT signing | RS256 (Clerk) / HS256 internal | RS256 tercih |
| Webhook signature | HMAC-SHA256 | — |
| Symmetric encryption (app) | AES-256-GCM | 96-bit nonce |
| Random generation | `crypto/rand` (Go), `crypto.getRandomValues` (JS) | CSPRNG zorunlu |
| TCKN pseudonymization | pgcrypto `pgp_sym_encrypt` + AES-256 | Key rotation 1yr |

## Yasaklı
- MD5, SHA-1 (password, signature amaçlı)
- DES, 3DES, RC4
- TLS 1.0, TLS 1.1, SSLv3
- ECB mode
- `math/rand` (Go) production'da

## Anahtar yönetimi
- **Azure Key Vault** tüm simetrik ve asimetrik anahtarlar.
- **Rotation:**
  - Webhook HMAC secret: on-demand (tenant admin UI)
  - TCKN encryption key: yıllık (KEK/DEK envelope)
  - JWT (Clerk): auto 90 gün
  - SAML signing: 2 yıl
- **Access:** sadece prod service principal + CISO break-glass.

## Sertifika yönetimi
- TLS cert: Azure Front Door + LetsEncrypt auto-renew 60 gün önce.
- Expiration alert: 30 gün kala Grafana → PagerDuty.
- HSTS: max-age 31536000, includeSubDomains, preload.

## Şifreli alanlar (DB)
| Tablo | Kolon | Algoritma |
|---|---|---|
| `app.employees` | `tckn_encrypted` | pgcrypto pgp_sym |
| `app.payroll_slips` | (no encryption — KVKK context) | — |
| `app.api_keys` | `key_hash` | bcrypt |
| `app.saml_connections` | `certificate` | pg encryption (column-level) |
