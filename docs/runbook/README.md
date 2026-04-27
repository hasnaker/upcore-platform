# UpCore Operational Runbooks

Every production service has a runbook living here. A runbook is not a design
doc — it is the single page the on-call engineer reads at 03:00 when the
service pages.

## Conventions
- Every runbook has the same seven sections (see template below).
- Failure modes are numbered, most-likely first.
- Dashboards, alerts, and contact links point to real URLs — placeholders are
  rejected in CR.
- Keep runbooks short (≤ 100 lines). Link out for details.

## Services

### Go services (17)
- [api-gateway](./api-gateway.md)
- [auth](./auth.md)
- [tenant](./tenant.md)
- [employee](./employee.md)
- [leave](./leave.md)
- [document](./document.md)
- [survey](./survey.md)
- [assessment](./assessment.md)
- [ats](./ats.md)
- [organization](./organization.md)
- [audit](./audit.md)
- [notification](./notification.md)
- [intervention](./intervention.md)
- [performance](./performance.md)
- [mobility](./mobility.md)
- [billing](./billing.md)
- [status](./status.md)
- [bordro](./bordro.md)

### Python ML services (4)
- [psychometric-scoring](./psychometric-scoring.md)
- [burnout-prediction](./burnout-prediction.md)
- [recommendation](./recommendation.md)
- [action-center](./action-center.md)

## Template
Use `_template.md` when adding a new service.
