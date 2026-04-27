'use client';

interface ChurnRiskRow {
  tenant_id: string;
  tenant_name: string;
  score: number;
  usage_drop_3m_pct: number;
  payment_late_count: number;
  open_tickets: number;
}

export function ChurnRiskTable({
  rows,
  loading,
}: {
  rows: ChurnRiskRow[];
  loading: boolean;
}) {
  if (loading) {
    return <div className="p-6 text-center text-sm text-ink-40">Yükleniyor…</div>;
  }
  if (rows.length === 0) {
    return <div className="p-6 text-center text-sm text-ink-40">Risk sinyali bulunmuyor.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
        <tr>
          <th className="px-4 py-2 text-left font-semibold">Tenant</th>
          <th className="px-4 py-2 text-right font-semibold">Skor</th>
          <th className="px-4 py-2 text-right font-semibold">Kullanım düşüşü (3 ay)</th>
          <th className="px-4 py-2 text-right font-semibold">Geç ödeme</th>
          <th className="px-4 py-2 text-right font-semibold">Açık ticket</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((r) => (
          <tr key={r.tenant_id} className="hover:bg-bg-2">
            <td className="px-4 py-2">
              <span className="font-medium text-ink">{r.tenant_name || r.tenant_id.slice(0, 8)}</span>
              <span className="ml-2 font-mono text-[10px] text-ink-40">{r.tenant_id.slice(0, 8)}</span>
            </td>
            <td className="px-4 py-2 text-right">
              <span
                className={`inline-flex h-6 min-w-[44px] items-center justify-center rounded-full px-2 text-[11px] font-semibold ${
                  r.score >= 70
                    ? 'bg-red-soft text-red'
                    : r.score >= 40
                      ? 'bg-amber-soft text-amber'
                      : 'bg-green-soft text-green'
                }`}
              >
                {r.score}
              </span>
            </td>
            <td className="px-4 py-2 text-right tabular-nums text-ink-60">
              {r.usage_drop_3m_pct.toFixed(1)}%
            </td>
            <td className="px-4 py-2 text-right tabular-nums text-ink-60">
              {r.payment_late_count}
            </td>
            <td className="px-4 py-2 text-right tabular-nums text-ink-60">{r.open_tickets}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
