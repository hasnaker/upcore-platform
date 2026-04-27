# KVKK Hard-delete vs. Soft-delete vs. Pseudonymization

## The conflict
- **KVKK Madde 11 / Madde 7 ("Unutulma hakkı")** obligates deletion, anonymization
  or destruction of personal data on data-subject request within 30 days.
- **Audit immutability (WORM)** is required by SOC 2 CC7.2 and by our internal
  evidence policy: audit rows cannot be rewritten after commit.
- **Turkish payroll / tax / contract law** forces us to retain bordro,
  sözleşme, and SGK records for 5 or 10 years.

These three requirements cannot all be satisfied by the same mechanism. This
document defines the rule we apply per data class.

## Decision matrix

| Data class                               | On DSR erasure         | Rationale                                           |
|------------------------------------------|------------------------|-----------------------------------------------------|
| Profile PII (name, email, phone, photo)  | Hard DELETE            | No retention obligation; cascade to FK rows.        |
| Pulse / survey answers (raw)             | Pseudonymize           | Scientific validity of trend data; hash key.        |
| Bordro / payroll rows                    | Pseudonymize PII cols  | 5-yıl yasal saklama; rows must stay, names cannot.  |
| İş sözleşmesi / offer letter (PDF)       | Shred + index-delete   | 10-yıl yasal saklama for header only; PDF destroyed.|
| SGK bildirge XML                         | Retain as-is           | Legal record; KVKK does not override İş Kanunu 67.  |
| `audit.event` rows                       | Never modify (WORM)    | SOC 2 evidence; replaced by tombstone referrer.     |
| Recommendation / bandit logs             | Pseudonymize user refs | A/B replay integrity; keeps statistical validity.   |
| Outbox events for already-delivered msgs | Hard DELETE after 30d  | Transient; no retention obligation.                 |

## Pseudonymization contract
`pseudonymize_user(tenant_id uuid, user_id uuid) RETURNS uuid` is a stable UDF
living in the database:

```sql
CREATE OR REPLACE FUNCTION pseudonymize_user(p_tenant uuid, p_user uuid)
RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT uuid_generate_v5(
    '00000000-0000-0000-0000-00000000dead'::uuid,
    p_tenant::text || ':' || p_user::text
  );
$$;
```

- Deterministic: same `(tenant_id, user_id)` → same pseudo-id across time.
- One-way: the raw email/name is never stored once pseudonymized.
- Scoped: scoped to `tenant_id` so two tenants never collide.

When a service receives `dsr.erasure.request.v1`:
1. Compute `pid = pseudonymize_user(tenant_id, user_id)`.
2. For tables in the "pseudonymize" class, `UPDATE … SET user_id = pid,
   email = NULL, full_name = NULL, …` inside a transaction with RLS applied.
3. For tables in the "hard delete" class, `DELETE … WHERE user_id = :uid`.
4. Emit `audit.event` with `action='kvkk.erasure.completed'` and the tombstone
   payload `{original_hash, pid, tables_affected}`.

## Audit tombstone referrer
For the audit event stream itself, we never mutate rows. Instead, a new row is
appended:

```json
{
  "event_id":  "d7c3…",
  "action":    "kvkk.erasure.completed",
  "actor":     "system",
  "data": {
    "tombstone_for_user": "pseudo-id-xxxx",
    "original_events":    ["evt-a", "evt-b", …],
    "legal_basis":        "KVKK Madde 7 / subject request",
    "dsr_id":             "…"
  }
}
```

Consumers who follow a link to a now-pseudonymized actor see the tombstone and
can prove "this actor's identity was destroyed on date X, by request Y" without
the audit log itself lying.

## Timing
- Profile PII hard-delete: within minutes of DSR `execute_erasure` fan-out ack.
- Pseudonymization: within 72 hours (some tables require cold-path jobs).
- Backups: a monthly retention-sweep job re-applies pseudonymization to any
  restored backup copy (see `services/audit/internal/service/dsr_service.go`
  `runBackupRedaction` — configured via `audit.retention` cron).

## What we refuse to promise
- We do NOT promise deletion from tax authority (GİB) copies; the user must
  pursue that through official channels (standard KVKK disclosure).
- We do NOT delete the pseudo-id itself: it is irreversible by design.
- We do NOT delete rows that would break referential integrity in payroll
  (this is allowed by KVKK Article 28/1-ç — yasal yükümlülük gereği saklama).

## Related
- `services/audit/internal/service/dsr_service.go` — orchestrator.
- `docs/ml/thompson-bandit.md` — replay audit of automated decisions.
- `docs/runbook/audit.md` — operational runbook.
