# Cryptography Policy

**ID:** POL-07 · **Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** CTO
**Review cadence:** annual · **Frameworks:** SOC 2 CC6.1, CC6.7 · ISO 27001 A.8.24 · KVKK md. 12

## 1. Purpose
Standardize cryptographic algorithms, key management, and lifecycle across UpCore.

## 2. Approved algorithms
- **Symmetric:** AES-256-GCM (data), AES-256-CTR only where GCM is impossible.
- **Asymmetric:** RSA-4096 (legacy), ECDSA P-256, Ed25519 (preferred).
- **Hashing:** SHA-256 / SHA-512; BLAKE3 for non-crypto checksums.
- **Password hashing:** Argon2id (Clerk-managed); bcrypt cost ≥ 12 only for legacy.
- **TLS:** 1.3 mandatory; 1.2 allowed only for inbound where client cannot negotiate 1.3; AEAD ciphers only.
- **JWT:** RS256 / EdDSA; HS256 banned in production.

## 3. Banned
- MD5, SHA-1 (except integrity-only, not security)
- DES, 3DES, RC4
- ECB mode
- Static IV / nonce reuse

## 4. Key management
- **Store:** Azure Key Vault (HSM-backed, Premium SKU) per environment.
- **Access:** managed identity only; no environment variables contain long-lived private keys.
- **Rotation:** DB keys 90 d · API keys 180 d · TLS certs 365 d · signing keys 365 d. Enforced by `scripts/rotate-secrets.sh`.
- **Envelope:** column-level pgcrypto encrypts with DEK; DEK wrapped by KEK in Key Vault.
- **Backup:** Key Vault soft-delete + purge-protection enabled; geo-redundant.

## 5. PII field encryption
Columns of class Restricted / SPI use `pgcrypto.pgp_sym_encrypt`. Plaintext never lands in logs (structured logger redacts by field-name list).

## 6. Audit and evidence
- Key Vault access logs → Azure Monitor → Sentinel.
- Monthly rotation attestation report (`scripts/rotate-secrets.sh --report`).
- Annual crypto inventory review.
