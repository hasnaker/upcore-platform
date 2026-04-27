# Runbook — recommendation

> Python ML: LLM-backed intervention text generation + embedding-based retrieval.

## Ownership
- **Primary owner**: Science squad (ML)
- **On-call rotation**: PagerDuty schedule `pd-ml`
- **Slack**: `#oncall-ml`
- **Escalation**: ML lead → Science lead → VP Eng

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `POST /recommend/text` | personalized content | 2 s |
| `POST /recommend/similar` | pgvector similarity search | 300 ms |
| `POST /embed` | produce embedding | 500 ms |

## Alerts
- **LLMProviderFail** — Azure OpenAI / Anthropic 5xx → page.
- **LLMCostSpike** — token cost > 2× daily budget → page.
- **EmbeddingIndexLag** — pgvector refresh > 1h behind → warn.
- **HighErrorRate** — 5xx > 2% → page.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/recommendation/recommendation-overview`
- LLM cost tracker: `https://grafana.upcore.internal/d/llm-cost`

## Common failure modes
### 1. LLM rate-limit (429)
Symptom: spike in `/recommend/text` 429.
Fix: backoff is automatic; if sustained, shift traffic to secondary provider via feature flag `ml.llm_primary`.

### 2. pgvector index bloat
Symptom: similarity search p99 > 2 s.
Fix: `REINDEX INDEX CONCURRENTLY idx_document_embedding_cosine`.

### 3. Hallucination flagged by consumer
Symptom: user reports incorrect factual output.
Fix: capture prompt+output into `ml_hallucination_reports`; pass to Science for prompt review.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/recommendation`
- Rollback prompt version: update `PROMPT_VERSION` env, redeploy.

## Contacts
- On-call: `pd-ml` · Slack: `#squad-ml`
- LLM provider support: via shared 1Password
- Security: `security@upcore.io`
