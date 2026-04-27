'use client';

import { use, useMemo } from 'react';
import { AlertCircle, Download, Lock, TrendingDown, TrendingUp, Shield } from 'lucide-react';

import {
  use360Report,
  useCampaignInvitations,
  type CompetencyAggregate,
  type Relation,
} from '@/hooks/usePerformance';

/* ─────────────────────────────────────────────────────────────
 * 360° Report Page
 *   - Radar (pure SVG — no recharts dependency needed)
 *   - Strengths + growth areas
 *   - Min 3 responses → report locked message
 *   - Anonymous: reviewer names hidden, only relation shown
 *   - PDF export (browser print)
 * ───────────────────────────────────────────────────────────── */

const RELATION_LABEL: Record<Relation, string> = {
  self: 'Öz-değerlendirme',
  manager: 'Yönetici',
  peer: 'Akran',
  direct_report: 'Ekip üyesi',
};

export default function Rapor360Page({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = use(params);
  const reportQ = use360Report(campaignId);
  const invsQ = useCampaignInvitations(campaignId);

  if (reportQ.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="text-sm text-[#737373]">Rapor hazırlanıyor...</span>
      </div>
    );
  }
  if (reportQ.isError || !reportQ.data) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-4 text-sm text-[#7f1d1d]">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          Rapor yüklenemedi: {reportQ.error?.message ?? 'bilinmeyen hata'}
        </div>
      </div>
    );
  }
  const report = reportQ.data;
  const invitations = invsQ.data?.items ?? [];

  const byRelationCounts = invitations.reduce<Record<Relation, number>>(
    (acc, inv) => {
      acc[inv.relation] = (acc[inv.relation] ?? 0) + 1;
      return acc;
    },
    { self: 0, manager: 0, peer: 0, direct_report: 0 },
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="mx-auto flex max-w-5xl flex-col gap-6 p-6 print:p-2"
      data-testid="s360-report"
    >
      <header className="flex items-start justify-between gap-4 print:flex-col">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
            360° Geri Bildirim Raporu
          </h1>
          <p className="mt-1 text-sm text-[#525252]">
            Yanıt sayısı: <strong>{report.response_count}</strong> · Katılımcı:{' '}
            <strong>{report.reviewer_count}</strong> · Eşik:{' '}
            <strong>{report.min_responses}+</strong>
          </p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#e5e5e5] bg-white px-3 py-1 text-xs text-[#525252]">
            <Shield className="h-3.5 w-3.5" />
            {report.anonymity_mode === 'anonymous'
              ? 'Anonim · Yanıtlayanların adı rapor boyunca gizlidir'
              : 'İsimli · Yanıtlayanların adı görünür'}
          </div>
        </div>
        {report.unlocked && (
          <button
            type="button"
            onClick={handlePrint}
            data-testid="s360-pdf-export"
            className="inline-flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-white px-3 py-2 text-xs font-medium text-[#525252] hover:bg-[#FAFAFA] print:hidden"
          >
            <Download className="h-3.5 w-3.5" />
            PDF olarak yazdır
          </button>
        )}
      </header>

      {!report.unlocked ? (
        <LockedReport reason={report.locked_reason ?? 'Yeterli cevap toplanmadı'} />
      ) : (
        <>
          <section className="grid gap-6 rounded-xl border border-[#f0f0f0] bg-white p-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#A3A3A3]">
                Yetkinlik Radarı
              </h2>
              <RadarChart aggregates={report.competencies} />
              <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                <Legend color="#5E5CE6" label="Ortalama" />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A3A3A3]">
                Yetkinlik Skorları
              </h2>
              <ul className="space-y-2">
                {report.competencies.map((c) => (
                  <li key={c.competency_code} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-sm text-[#525252]">
                      {c.competency_name_tr}
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-[#f5f5f5]">
                      <div
                        className="h-full rounded-full bg-[#5E5CE6]"
                        style={{ width: `${(c.average / 5) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-semibold text-[#5E5CE6]">
                      {c.average.toFixed(1)}
                    </span>
                    <span className="ml-2 w-10 text-right text-[10px] text-[#A3A3A3]">
                      n={c.sample_size}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <SummaryCard
              title="Güçlü Alanlar"
              icon={<TrendingUp className="h-4 w-4 text-[#059669]" />}
              items={report.strengths}
              empty="Henüz öne çıkan güçlü alan yok."
              accentColor="#059669"
            />
            <SummaryCard
              title="Gelişim Alanları"
              icon={<TrendingDown className="h-4 w-4 text-[#D97706]" />}
              items={report.growth_areas}
              empty="Gelişim için belirgin bir alan yok."
              accentColor="#D97706"
            />
          </section>

          <section className="rounded-xl border border-[#f0f0f0] bg-white p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#A3A3A3]">
              Katılımcılar
            </h2>
            <div className="grid gap-3 md:grid-cols-4">
              {(Object.entries(byRelationCounts) as [Relation, number][]).map(([rel, count]) => (
                <div
                  key={rel}
                  className="rounded-lg border border-[#f0f0f0] px-4 py-3 text-center"
                >
                  <div className="text-xs text-[#737373]">{RELATION_LABEL[rel]}</div>
                  <div className="mt-1 text-2xl font-bold text-[#0A0A0A]">{count}</div>
                </div>
              ))}
            </div>
            {report.anonymity_mode === 'anonymous' && (
              <p className="mt-4 text-xs text-[#737373]">
                Anonim mod: yanıtlayanların isimleri raporda hiçbir yerde görünmez.
              </p>
            )}
          </section>

          {report.competencies.some((c) => Object.keys(c.by_relation).length > 0) && (
            <section className="rounded-xl border border-[#f0f0f0] bg-white p-6">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#A3A3A3]">
                İlişki Bazlı Ayrışım
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0f0f0] text-left text-xs text-[#737373]">
                    <th className="pb-2 font-medium">Yetkinlik</th>
                    <th className="pb-2 font-medium">Yönetici</th>
                    <th className="pb-2 font-medium">Akran</th>
                    <th className="pb-2 font-medium">Ekip üyesi</th>
                    <th className="pb-2 font-medium">Öz</th>
                  </tr>
                </thead>
                <tbody>
                  {report.competencies.map((c) => (
                    <tr key={c.competency_code} className="border-b border-[#f5f5f5] text-sm">
                      <td className="py-2 text-[#525252]">{c.competency_name_tr}</td>
                      <td className="py-2 font-semibold text-[#5E5CE6]">
                        {c.by_relation.manager?.toFixed(1) ?? '—'}
                      </td>
                      <td className="py-2 font-semibold text-[#D97706]">
                        {c.by_relation.peer?.toFixed(1) ?? '—'}
                      </td>
                      <td className="py-2 font-semibold text-[#059669]">
                        {c.by_relation.direct_report?.toFixed(1) ?? '—'}
                      </td>
                      <td className="py-2 font-semibold text-[#0A0A0A]">
                        {c.by_relation.self?.toFixed(1) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Locked state ─── */

function LockedReport({ reason }: { reason: string }) {
  return (
    <div
      data-testid="s360-report-locked"
      className="flex flex-col items-center gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-10 text-center"
    >
      <Lock className="h-8 w-8 text-[#854d0e]" />
      <h2 className="text-base font-semibold text-[#854d0e]">Rapor Kilitli</h2>
      <p className="max-w-md text-sm text-[#854d0e]">
        {reason}. Minimum cevap eşiğine ulaşıldığında rapor otomatik olarak açılır.
      </p>
    </div>
  );
}

/* ─── Summary card ─── */

function SummaryCard({
  title,
  icon,
  items,
  empty,
  accentColor,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  empty: string;
  accentColor: string;
}) {
  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-[#0A0A0A]">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-[#737373]">{empty}</p>
      ) : (
        <ol className="space-y-1.5">
          {items.map((it, i) => (
            <li key={`${it}-${i}`} className="flex items-center gap-2 text-sm text-[#525252]">
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ background: accentColor }}
              >
                {i + 1}
              </span>
              {it}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

/* ─── Radar chart (pure SVG) ─── */

function RadarChart({ aggregates }: { aggregates: CompetencyAggregate[] }) {
  const scores = useMemo(() => aggregates, [aggregates]);
  if (scores.length < 3) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[#737373]">
        Radar için en az 3 yetkinlik gereklidir.
      </div>
    );
  }
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 120;
  const levels = 5;

  const angleStep = (2 * Math.PI) / scores.length;
  const startAngle = -Math.PI / 2;

  const point = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const r = (value / 5) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const dataPoly = scores
    .map((s, i) => {
      const p = point(i, s.average);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto w-full max-w-[320px]"
      aria-label="Radar chart"
      role="img"
    >
      {Array.from({ length: levels }, (_, i) => {
        const r = ((i + 1) / levels) * maxR;
        const poly = scores
          .map((_, j) => {
            const angle = startAngle + j * angleStep;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
          })
          .join(' ');
        return <polygon key={i} points={poly} fill="none" stroke="#f0f0f0" strokeWidth={1} />;
      })}
      {scores.map((_, i) => {
        const p = point(i, 5);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#f0f0f0" strokeWidth={1} />;
      })}
      <polygon points={dataPoly} fill="#5E5CE633" stroke="#5E5CE6" strokeWidth={2} />
      {scores.map((s, i) => {
        const p = point(i, 5.6);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[#525252] text-[10px] font-medium"
          >
            {s.competency_name_tr}
          </text>
        );
      })}
    </svg>
  );
}
