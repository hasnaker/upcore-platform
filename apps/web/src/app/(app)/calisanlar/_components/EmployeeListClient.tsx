'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { EmployeeView } from '@/lib/employee-mapper';

/* ── Risk Intelligence Types ── */
interface RiskSignal {
  source: string;
  severity: string;
}

interface RiskScore {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  signals: RiskSignal[];
}

interface EmployeeSynthesis {
  riskScore: RiskScore;
  overallHealth: 'good' | 'warning' | 'critical';
  okrProgress: number;
  burnoutScore: number;
}

interface IntelEmployee {
  id: string;
  name: string;
  department: string;
  synthesis: EmployeeSynthesis;
}

interface RiskInfo {
  level: RiskScore['level'];
  label: string;
  overallHealth: EmployeeSynthesis['overallHealth'];
  criticalSource: string | null;
}

const RISK_BADGE: Record<RiskScore['level'], { bg: string; text: string; label: string }> = {
  low:      { bg: 'bg-green-soft',  text: 'text-green',  label: 'Düşük' },
  medium:   { bg: 'bg-amber-soft',  text: 'text-amber',  label: 'Orta' },
  high:     { bg: 'bg-orange-100',  text: 'text-orange-600', label: 'Yüksek' },
  critical: { bg: 'bg-red-soft',    text: 'text-red',    label: 'Kritik' },
};

const HEALTH_DOT: Record<EmployeeSynthesis['overallHealth'], string> = {
  good:     'bg-green',
  warning:  'bg-amber',
  critical: 'bg-red',
};

interface Props {
  employees: EmployeeView[];
}

const RENK_MAP: Record<string, { bg: string; text: string }> = {
  green: { bg: 'bg-green-soft', text: 'text-green' },
  amber: { bg: 'bg-amber-soft', text: 'text-amber' },
  red:   { bg: 'bg-red-soft',   text: 'text-red' },
  gray:  { bg: 'bg-bg-3',       text: 'text-ink-40' },
};

const PAGE_SIZE = 10;

export function EmployeeListClient({ employees }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [riskMap, setRiskMap] = useState<Map<string, RiskInfo>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function loadRiskData() {
      try {
        const res = await fetch('/api/employee-intelligence');
        if (!res.ok) return;
        const json: { employees: IntelEmployee[] } = await res.json();
        if (cancelled) return;

        const map = new Map<string, RiskInfo>();

        // Build a name-based lookup as fallback
        const nameToRisk = new Map<string, RiskInfo>();

        for (const emp of json.employees) {
          const criticalSignal = emp.synthesis.riskScore.signals.find(
            (s) => s.severity === 'critical' || s.severity === 'error',
          );
          const info: RiskInfo = {
            level: emp.synthesis.riskScore.level,
            label: RISK_BADGE[emp.synthesis.riskScore.level]?.label ?? 'Bilinmiyor',
            overallHealth: emp.synthesis.overallHealth,
            criticalSource: criticalSignal?.source?.replace(/-TR$/, '') ?? null,
          };
          // Primary: match by ID
          map.set(emp.id, info);
          // Fallback: match by name (lowercased)
          nameToRisk.set(emp.name.toLocaleLowerCase('tr-TR'), info);
        }

        // Also map by employee name for cases where IDs differ between systems
        for (const employee of employees) {
          if (!map.has(employee.id)) {
            const nameLower = employee.tamAd.toLocaleLowerCase('tr-TR');
            const found = nameToRisk.get(nameLower);
            if (found) {
              map.set(employee.id, found);
            }
          }
        }

        setRiskMap(map);
      } catch {
        // Silently fail — risk badges are supplementary
      }
    }

    loadRiskData();
    return () => { cancelled = true; };
  }, [employees]);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLocaleLowerCase('tr-TR');
    return employees.filter(
      (e) =>
        e.tamAd.toLocaleLowerCase('tr-TR').includes(q) ||
        e.sicilNo.toLocaleLowerCase('tr-TR').includes(q) ||
        e.email.toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [employees, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-40"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Ad, soyad, sicil no veya email ile arayın..."
          className="h-10 w-full rounded-lg border border-line bg-bg pl-10 pr-4 text-sm text-ink placeholder:text-ink-40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-line bg-bg">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line bg-bg-2">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-40">Çalışan</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-40 md:table-cell">Sicil No</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-40 lg:table-cell">Email</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-40 sm:table-cell">Başlama</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-40 sm:table-cell">Risk</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-40">Durum</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="h-10 w-10 text-ink-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.208V5.802A2 2 0 015.228 4h8.544A2 2 0 0116 5.802V12" />
                    </svg>
                    <p className="text-sm font-medium text-ink-60">
                      {search ? 'Aramanızla eşleşen çalışan bulunamadı.' : 'Henüz çalışan eklenmemiş.'}
                    </p>
                    {!search && (
                      <button
                        onClick={() => router.push('/calisanlar/yeni')}
                        className="mt-2 text-sm font-medium text-accent hover:underline"
                      >
                        İlk çalışanınızı ekleyin →
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((emp) => {
                const renk = RENK_MAP[emp.durumRenk] ?? RENK_MAP['gray']!;
                const risk = riskMap.get(emp.id);
                const badge = risk ? RISK_BADGE[risk.level] : null;
                const healthDot = risk ? HEALTH_DOT[risk.overallHealth] : null;
                return (
                  <tr
                    key={emp.id}
                    onClick={() => router.push(`/calisanlar/${emp.id}`)}
                    className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-bg-2"
                  >
                    {/* Çalışan */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                          {emp.initials}
                          {/* Health dot on avatar */}
                          {healthDot && (
                            <span
                              className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg ${healthDot}`}
                              title={`Sağlık: ${risk?.overallHealth}`}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-ink">{emp.tamAd}</span>
                            {/* Inline risk badge on mobile (column hidden on sm-) */}
                            {badge && (
                              <span
                                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:hidden ${badge.bg} ${badge.text}`}
                              >
                                {badge.label}
                              </span>
                            )}
                          </div>
                          <div className="truncate text-xs text-ink-40 md:hidden">{emp.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Sicil No */}
                    <td className="hidden px-4 py-3 text-sm text-ink-60 md:table-cell">
                      {emp.sicilNo}
                    </td>

                    {/* Email */}
                    <td className="hidden px-4 py-3 text-sm text-ink-60 lg:table-cell">
                      {emp.email}
                    </td>

                    {/* Başlama */}
                    <td className="hidden px-4 py-3 text-sm text-ink-60 sm:table-cell">
                      {emp.iseBaslama
                        ? new Date(emp.iseBaslama).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>

                    {/* Risk */}
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {badge ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                          {risk?.criticalSource && (
                            <span className="rounded bg-red-soft px-1 py-0.5 text-[10px] font-medium text-red">
                              {risk.criticalSource}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-ink-20">—</span>
                      )}
                    </td>

                    {/* Durum */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${renk.bg} ${renk.text}`}>
                        {emp.durumLabel}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-ink-40">
            {filtered.length} çalışandan {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} gösteriliyor
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-line bg-bg px-3 py-1.5 text-xs font-medium text-ink-60 transition-colors hover:bg-bg-2 disabled:opacity-40"
            >
              ← Önceki
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-line bg-bg px-3 py-1.5 text-xs font-medium text-ink-60 transition-colors hover:bg-bg-2 disabled:opacity-40"
            >
              Sonraki →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
