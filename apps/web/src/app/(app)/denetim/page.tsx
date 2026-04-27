'use client';

import { useState } from 'react';
import {
  AlertCircle, Download, Loader2, Shield, Activity, Search, Info,
} from 'lucide-react';
import { useAuditEvents, useAuditStats, type AuditEvent } from '@/hooks/useAudit';

/**
 * Denetim (Audit) Kaydı Görüntüleyici — services/audit gerçek veri:
 *   - Son olaylar listesi + filtreleme
 *   - Haftalık özet: şiddet dağılımı, en çok yapılan aksiyonlar, en aktif kullanıcılar
 *   - KVKK uyumu için admin-accessible, immutable event stream
 */
export default function DenetimPage() {
  const [severity, setSeverity] = useState<AuditEvent['severity'] | ''>('');
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [page, setPage] = useState(0);

  const events = useAuditEvents({
    severity: severity || undefined,
    action: action.trim() || undefined,
    resource_type: resourceType.trim() || undefined,
    page,
    limit: 50,
  });
  const stats = useAuditStats('7d');

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          <Shield className="h-6 w-6 text-[#5E5CE6]" />
          Denetim Kaydı
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Tenant içindeki tüm kritik aksiyonlar — KVKK uyumu için değiştirilemez event stream.
        </p>
      </header>

      <StatsPanel
        data={stats.data}
        loading={stats.isLoading}
        error={stats.error}
      />

      <FilterBar
        severity={severity}
        onSeverityChange={setSeverity}
        action={action}
        onActionChange={setAction}
        resourceType={resourceType}
        onResourceTypeChange={setResourceType}
      />

      <EventsTable
        loading={events.isLoading}
        error={events.error}
        items={events.data?.items ?? []}
        total={events.data?.total ?? 0}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}

/* ─── Stats ─── */

function StatsPanel({
  data,
  loading,
  error,
}: {
  data: ReturnType<typeof useAuditStats>['data'];
  loading: boolean;
  error: Error | null;
}) {
  if (loading) {
    return (
      <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#0A0A0A]">Son 7 gün</h2>
        <p className="mt-4 text-xs text-[#737373]">Yükleniyor…</p>
      </section>
    );
  }
  if (error) {
    return (
      <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
        <ErrorBanner message={error.message} />
      </section>
    );
  }
  if (!data) return null;
  return (
    <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#0A0A0A]">Son 7 gün özeti</h2>
          <p className="text-xs text-[#737373]">Toplam: {data.total_events} olay</p>
        </div>
        <Activity className="h-5 w-5 text-[#5E5CE6]" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <SeverityCard counts={data.by_severity} />
        <TopList title="En sık aksiyonlar" items={data.by_action.slice(0, 5).map((a) => ({ label: a.action, count: a.count }))} />
        <TopList title="En aktif kullanıcılar" items={data.by_actor.slice(0, 5).map((a) => ({ label: a.actor_email, count: a.count }))} />
      </div>
    </section>
  );
}

function SeverityCard({ counts }: { counts: Record<string, number> }) {
  const rows = [
    { key: 'critical', label: 'Kritik', tone: 'bg-[#FEE2E2] text-[#7F1D1D]' },
    { key: 'error', label: 'Hata', tone: 'bg-[#FECACA] text-[#991B1B]' },
    { key: 'warning', label: 'Uyarı', tone: 'bg-[#FEF3C7] text-[#92400E]' },
    { key: 'info', label: 'Bilgi', tone: 'bg-[#EEF2FF] text-[#5E5CE6]' },
  ];
  return (
    <div className="rounded-lg border border-[#EDEDED] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">Şiddet</p>
      <ul className="mt-2 space-y-1">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between text-xs">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${r.tone}`}>
              {r.label}
            </span>
            <span className="font-semibold tabular-nums text-[#0A0A0A]">
              {counts[r.key] ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopList({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
}) {
  return (
    <div className="rounded-lg border border-[#EDEDED] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-[#737373]">Veri yok</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((it, idx) => (
            <li key={`${it.label}-${idx}`} className="flex items-center justify-between text-xs">
              <span className="truncate text-[#525252]">{it.label || '—'}</span>
              <span className="shrink-0 font-semibold tabular-nums text-[#0A0A0A]">
                {it.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Filters ─── */

function FilterBar({
  severity,
  onSeverityChange,
  action,
  onActionChange,
  resourceType,
  onResourceTypeChange,
}: {
  severity: AuditEvent['severity'] | '';
  onSeverityChange: (v: AuditEvent['severity'] | '') => void;
  action: string;
  onActionChange: (v: string) => void;
  resourceType: string;
  onResourceTypeChange: (v: string) => void;
}) {
  return (
    <section className="flex flex-wrap items-end gap-3 rounded-xl border border-[#EDEDED] bg-white p-4">
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">Şiddet</span>
        <select
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value as AuditEvent['severity'] | '')}
          className="rounded-md border border-[#EDEDED] bg-white px-3 py-1.5 text-sm text-[#0A0A0A]"
        >
          <option value="">Tümü</option>
          <option value="info">Bilgi</option>
          <option value="warning">Uyarı</option>
          <option value="error">Hata</option>
          <option value="critical">Kritik</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">Aksiyon</span>
        <input
          value={action}
          onChange={(e) => onActionChange(e.target.value)}
          placeholder="örn. employee.create"
          className="rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">Kaynak Tipi</span>
        <input
          value={resourceType}
          onChange={(e) => onResourceTypeChange(e.target.value)}
          placeholder="örn. employee"
          className="rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-sm"
        />
      </label>
      <div className="ml-auto flex items-center gap-2 text-[11px] text-[#737373]">
        <Search className="h-3 w-3" />
        Otomatik filtreleme
      </div>
    </section>
  );
}

/* ─── Events table ─── */

function EventsTable({
  loading,
  error,
  items,
  total,
  page,
  onPageChange,
}: {
  loading: boolean;
  error: Error | null;
  items: AuditEvent[];
  total: number;
  page: number;
  onPageChange: (p: number) => void;
}) {
  if (loading) {
    return (
      <section className="rounded-xl border border-[#EDEDED] bg-white p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#737373]" />
      </section>
    );
  }
  if (error) {
    return <ErrorBanner message={error.message} />;
  }
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-10 text-center">
        <Info className="mx-auto h-8 w-8 text-[#A3A3A3]" />
        <p className="mt-2 text-sm font-medium text-[#0A0A0A]">Kayıt bulunamadı</p>
        <p className="mt-1 text-xs text-[#737373]">
          Filtreleri gevşetmeyi deneyin veya farklı tarih aralığı seçin.
        </p>
      </section>
    );
  }

  const pageSize = 50;
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  return (
    <section className="overflow-hidden rounded-xl border border-[#EDEDED] bg-white">
      <div className="flex items-center justify-between border-b border-[#EDEDED] bg-[#FAFAFA] px-4 py-2">
        <p className="text-xs text-[#737373]">
          Sayfa {page + 1} / {maxPage + 1} · Toplam {total}
        </p>
        <button
          type="button"
          onClick={() => {
            const header = 'created_at,severity,action,resource_type,resource_id,actor_email\n';
            const body = items
              .map(
                (e) =>
                  [
                    e.created_at,
                    e.severity,
                    e.action,
                    e.resource_type ?? '',
                    e.resource_id ?? '',
                    e.actor_email ?? '',
                  ]
                    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                    .join(','),
              )
              .join('\n');
            const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `audit-${Date.now()}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
          }}
          className="inline-flex items-center gap-1 rounded-md border border-[#EDEDED] bg-white px-2.5 py-1 text-[11px] text-[#525252] hover:bg-[#FAFAFA]"
        >
          <Download className="h-3 w-3" />
          Bu sayfayı CSV indir
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#EDEDED] bg-white">
            <Th>Zaman</Th>
            <Th>Şiddet</Th>
            <Th>Aksiyon</Th>
            <Th>Kaynak</Th>
            <Th>Kullanıcı</Th>
            <Th>IP</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id} className="border-b border-[#EDEDED] last:border-b-0 hover:bg-[#FAFAFA]">
              <td className="px-3 py-2 text-[11px] text-[#525252] whitespace-nowrap">
                {formatTime(e.created_at)}
              </td>
              <td className="px-3 py-2"><SeverityBadge level={e.severity} /></td>
              <td className="px-3 py-2 font-mono text-xs text-[#0A0A0A]">{e.action}</td>
              <td className="px-3 py-2 text-xs text-[#525252]">
                {e.resource_type ? (
                  <>
                    <span className="text-[#0A0A0A]">{e.resource_type}</span>
                    {e.resource_id ? (
                      <span className="ml-1 font-mono text-[10px] text-[#737373]">
                        {e.resource_id.slice(0, 8)}
                      </span>
                    ) : null}
                  </>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-3 py-2 text-xs text-[#525252]">
                {e.actor_email ?? e.actor_user_id?.slice(0, 8) ?? '—'}
              </td>
              <td className="px-3 py-2 text-[11px] text-[#737373]">{e.ip_address ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between border-t border-[#EDEDED] px-4 py-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="rounded-md border border-[#EDEDED] bg-white px-2.5 py-1 text-xs text-[#525252] hover:bg-[#FAFAFA] disabled:opacity-50"
        >
          ← Önceki
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(maxPage, page + 1))}
          disabled={page >= maxPage}
          className="rounded-md border border-[#EDEDED] bg-white px-2.5 py-1 text-xs text-[#525252] hover:bg-[#FAFAFA] disabled:opacity-50"
        >
          Sonraki →
        </button>
      </div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[#737373]">
      {children}
    </th>
  );
}

function SeverityBadge({ level }: { level: AuditEvent['severity'] }) {
  const tone =
    level === 'critical'
      ? 'bg-[#FEE2E2] text-[#7F1D1D]'
      : level === 'error'
        ? 'bg-[#FECACA] text-[#991B1B]'
        : level === 'warning'
          ? 'bg-[#FEF3C7] text-[#92400E]'
          : 'bg-[#EEF2FF] text-[#5E5CE6]';
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
      {level}
    </span>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-[12px] text-[#991B1B]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  } catch {
    return iso;
  }
}
