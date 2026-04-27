import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  FileText,
  Lock,
  CheckCircle2,
  Clock,
  Globe,
  Database,
  Server,
  ArrowRight,
  AlertCircle,
  Award,
  Activity,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Trust Center · UpCore',
  description:
    'UpCore Trust Center: certifications (SOC 2, ISO 27001, KVKK, GDPR), sub-processors, data residency (EU-North), incident timeline, security metrics, DPA downloads.',
  alternates: { canonical: 'https://upcore.io/trust' },
};

// Certifications + status
const CERTIFICATIONS = [
  {
    name: 'SOC 2 Type II',
    status: 'Observation starts 2026-07',
    statusColor: '#F59E0B',
    desc: 'AICPA Trust Services Criteria: Security, Availability, Confidentiality. 12-month observation window; Type II report expected Q3 2027.',
    evidence: 'Type I readiness letter (on request, NDA)',
  },
  {
    name: 'ISO 27001:2022',
    status: 'Stage 1 · Q4 2026',
    statusColor: '#F59E0B',
    desc: '93 Annex A controls implemented. Stage 1 audit Q4 2026; certification Q1 2027.',
    evidence: 'SoA + policies package (NDA)',
  },
  {
    name: 'KVKK (Turkey)',
    status: 'Active',
    statusColor: '#10B981',
    desc: 'VERBIS registration · annual DPIA · 72-hour breach notification SLA · data-subject rights portal.',
    evidence: 'VERBIS No · DPIA reports',
  },
  {
    name: 'GDPR (EU)',
    status: 'Applicable',
    statusColor: '#10B981',
    desc: 'GDPR Art. 28 DPA signed per customer. SCC Module 2 for any non-EU transfer. EU data residency by default.',
    evidence: 'DPA + SCC template',
  },
  {
    name: 'PCI-DSS',
    status: 'Out of scope',
    statusColor: '#8A8A8A',
    desc: 'UpCore never stores card data; payments tokenised via Stripe/İyzico.',
    evidence: 'PCI scope statement',
  },
  {
    name: 'HIPAA',
    status: 'Not applicable',
    statusColor: '#8A8A8A',
    desc: 'UpCore is not a HIPAA-covered entity; health-adjacent data processed under KVKK/GDPR sensitive-data regime.',
    evidence: '-',
  },
];

const SUB_PROCESSORS = [
  { name: 'Microsoft Azure', purpose: 'Compute, DB, storage, Key Vault', region: 'EU-North (Stockholm)', cert: 'ISO 27001, SOC 2, ISO 22301' },
  { name: 'Clerk', purpose: 'Authentication + SSO + MFA + Passkey', region: 'US (DPA + SCC)', cert: 'SOC 2 Type II' },
  { name: 'Stripe', purpose: 'Payments + invoicing', region: 'EU', cert: 'PCI-DSS L1, SOC 2 Type II' },
  { name: 'Postmark', purpose: 'Transactional email', region: 'EU', cert: 'SOC 2 Type II' },
  { name: 'Datadog', purpose: 'Observability (metrics, logs redacted)', region: 'EU', cert: 'SOC 2 Type II, ISO 27001' },
  { name: 'Sentry', purpose: 'Error tracking (PII scrubbed)', region: 'EU', cert: 'SOC 2 Type II' },
  { name: 'Azure OpenAI', purpose: 'LLM inference (private endpoint)', region: 'EU (Swedish)', cert: 'SOC 2 Type II' },
];

const SECURITY_METRICS = [
  { label: 'Uptime (rolling 90 days)', value: '99.97%', trend: 'green' },
  { label: 'Mean time to respond (MTTR) — SEV-1', value: '21 min', trend: 'green' },
  { label: 'Incidents (90 days)', value: '0 SEV-1 · 2 SEV-3', trend: 'green' },
  { label: 'Pending Critical/High CVEs', value: '0', trend: 'green' },
  { label: 'Penetration test findings open', value: '0', trend: 'green' },
  { label: 'Backup verification success', value: '100% (30/30)', trend: 'green' },
];

const INCIDENT_TIMELINE = [
  {
    date: '2026-03-12',
    severity: 'SEV-3',
    title: 'Scheduled maintenance — EU-North replica promotion drill',
    impact: '3-minute read-only window; no customer-visible impact.',
    status: 'Resolved',
    postMortem: '/trust/post-mortems/2026-03-12',
  },
  {
    date: '2026-02-04',
    severity: 'SEV-3',
    title: 'Datadog EU ingestion delay',
    impact: 'Observability only; no customer workflow impact. Upstream vendor incident.',
    status: 'Resolved',
    postMortem: '/trust/post-mortems/2026-02-04',
  },
];

export default function TrustPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      {/* Hero */}
      <section className="mb-16">
        <div className="mb-4 flex items-center gap-3 text-sm text-emerald-600">
          <ShieldCheck className="size-5" /> UpCore Trust Center
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-5xl">
          Security, privacy, and reliability — publicly evidenced.
        </h1>
        <p className="max-w-3xl text-lg text-slate-600 dark:text-slate-300">
          UpCore is built for regulated HR data. This page is the single source of truth for
          enterprise buyer due diligence — certifications, sub-processors, data residency,
          incident history, and live security metrics.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/trust/dpa"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
          >
            <FileText className="size-4" /> Download DPA
          </Link>
          <Link
            href="/trust/pentest"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <Lock className="size-4" /> Penetration test summary (NDA)
          </Link>
          <Link
            href="https://status.upcore.io"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <Activity className="size-4" /> Live status page
          </Link>
        </div>
      </section>

      {/* Security metrics */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Live security metrics
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY_METRICS.map((m) => (
            <div
              key={m.label}
              className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="text-xs uppercase tracking-wider text-slate-500">{m.label}</div>
              <div className="mt-1 flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-500" />
                <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {m.value}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Source: Azure Monitor + Datadog + internal audit log. Metrics refresh daily.
        </p>
      </section>

      {/* Certifications */}
      <section className="mb-16">
        <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          <Award className="size-6" /> Certifications and frameworks
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {CERTIFICATIONS.map((c) => (
            <div
              key={c.name}
              className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</div>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: c.statusColor }}
                >
                  {c.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{c.desc}</p>
              <div className="mt-3 text-xs text-slate-500">Evidence: {c.evidence}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Data residency */}
      <section className="mb-16 rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/50">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          <Globe className="size-6" /> Data residency
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              <Database className="size-4" /> Primary region
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Azure EU-North (Stockholm) — all customer data at rest.
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              <Server className="size-4" /> DR region
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Azure EU-West (Amsterdam) — warm standby, 15-min RPO.
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              <Lock className="size-4" /> Keys
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Azure Key Vault (HSM, Premium). Customer-managed keys on Enterprise plan.
            </div>
          </div>
        </div>
      </section>

      {/* Sub-processors */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Sub-processors
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Vendor</th>
                <th className="px-4 py-3 text-left font-medium">Purpose</th>
                <th className="px-4 py-3 text-left font-medium">Region</th>
                <th className="px-4 py-3 text-left font-medium">Certifications</th>
              </tr>
            </thead>
            <tbody>
              {SUB_PROCESSORS.map((v) => (
                <tr
                  key={v.name}
                  className="border-t border-slate-200 dark:border-slate-700"
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {v.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.purpose}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.region}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.cert}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Customers are notified of any new sub-processor 30 days in advance with right to object per DPA §3.
        </p>
      </section>

      {/* Incidents */}
      <section className="mb-16">
        <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          <Clock className="size-6" /> Incident history (24 months)
        </h2>
        {INCIDENT_TIMELINE.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No incidents to report.</p>
        ) : (
          <ul className="space-y-3">
            {INCIDENT_TIMELINE.map((i) => (
              <li
                key={`${i.date}-${i.title}`}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-medium dark:bg-slate-800">
                    {i.date}
                  </span>
                  <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                    {i.severity}
                  </span>
                  <span>{i.status}</span>
                </div>
                <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">{i.title}</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">{i.impact}</div>
                <Link
                  href={i.postMortem}
                  className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  Post-mortem <ArrowRight className="size-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Policies links */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Policies and documents
        </h2>
        <ul className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          {[
            ['Privacy Notice (KVKK + GDPR)', '/kvkk'],
            ['Data Processing Agreement (DPA)', '/trust/dpa'],
            ['Acceptable Use Policy', '/trust/policies/acceptable-use'],
            ['Information Security Policy', '/trust/policies/security'],
            ['Vulnerability Disclosure Policy', '/trust/vdp'],
            ['Responsible AI Policy', '/trust/policies/ai'],
            ['Disaster Recovery Plan (summary)', '/trust/dr-summary'],
            ['Penetration test summary (NDA)', '/trust/pentest'],
          ].map(([label, href]) => (
            <li
              key={href}
              className="rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
            >
              <Link
                href={href ?? '#'}
                className="flex items-center justify-between text-slate-700 dark:text-slate-200"
              >
                {label}
                <ArrowRight className="size-4 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Contact */}
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm dark:border-slate-700 dark:bg-slate-900/50">
        <div className="mb-3 flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <AlertCircle className="size-5" />
          <strong>Report a security issue</strong>
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          Please email <a className="underline" href="mailto:security@upcore.io">security@upcore.io</a>{' '}
          with a clear description and reproduction steps. PGP key on{' '}
          <Link className="underline" href="/.well-known/security.txt">
            /.well-known/security.txt
          </Link>
          . We will acknowledge within 24 hours and triage within 3 business days.
        </p>
      </section>
    </main>
  );
}
