---
id: api-key-olusturma
title: "API key oluşturma"
sidebar_position: 3
---

# API key oluşturma

Machine-to-machine kimlik doğrulama.

## Türler

- **Tenant-wide:** Tüm tenant erişimi
- **Scoped:** Belirli kaynak (örn. sadece read employee)
- **IP-restricted:** Sadece belirli IP'den
- **Expiring:** 7 / 30 / 90 / 365 gün

## Oluşturma

**Admin > Operasyon > API keys > + Yeni**

1. Ad + amaç açıklama
2. Scope seçimi (permission)
3. IP allowlist (opsiyonel)
4. Son geçerlilik tarih
5. Submit → **key bir kez gösterilir** (sonra sadece hash görünür)

## Kullanım

```bash
curl -H "Authorization: Bearer upc_sk_abc123..." \
     https://api.upcore.io/api/v1/employees
```

## Güvenlik

- **Asla public repo'ya koymayın** (pre-commit hook öneri)
- `.env` dosyası + git ignore
- CI/CD secret manager
- Secret rotation 90 günde 1

## İptal

- Self-servis iptal
- Anlık etkili
- Audit log

## Sızıntı

Sızan key:
1. Admin paneli derhal iptal
2. Yeni key oluştur
3. Audit log incele (ne kullanıldı?)
4. KVKK bildirim (kişisel veri çalındıysa)
