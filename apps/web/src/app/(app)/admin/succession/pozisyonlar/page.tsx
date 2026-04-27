'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  useCriticalPositions,
  RISK_LABEL_TR,
  type CriticalPosition,
  type RiskLevel,
} from '@/hooks/useSuccession';

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string }> = {
  low: { bg: '#D1FAE5', text: '#059669' },
  medium: { bg: '#FEF3C7', text: '#D97706' },
  high: { bg: '#FEE2E2', text: '#DC2626' },
  critical: { bg: '#FECACA', text: '#991B1B' },
};

function avatarUrl(name: string): string {
  const clean = (name || 'ÇK').trim() || 'ÇK';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(clean)}&background=EEF0FD&color=5E5CE6&bold=true`;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  if (diffDays < 30) return `${diffDays} gün önce`;
  return d.toLocaleDateString('tr-TR');
}

export default function SuccessionCriticalPositionsPage() {
  const { data, isLoading, isError, error, refetch } = useCriticalPositions();

  const items: CriticalPosition[] = useMemo(() => data?.items ?? [], [data?.items]);

  const stats = useMemo(() => {
    const totalPositions = items.length;
    const noSuccessorNow = items.filter((p) => p.ready_now_count === 0).length;
    const highRisk = items.filter(
      (p) => p.risk_level === 'high' || p.risk_level === 'critical',
    ).length;
    const readySome = items.filter((p) => p.ready_now_count > 0).length;
    return { totalPositions, noSuccessorNow, highRisk, readySome };
  }, [items]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">Kritik Pozisyon Haritası</h1>
          <p className="mt-1 text-sm text-[#888]">
            Incumbent + yedek havuz durumu + emeklilik/ayrılış riski — Yalnızca İK.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[#EEF0FD] px-3 py-1.5 text-xs font-semibold text-[#5E5CE6]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E5CE6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Yalnızca İK erişimi
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Kritik Pozisyon" value={stats.totalPositions} color="#111" />
        <StatCard label="Yüksek/Kritik Risk" value={stats.highRisk} color="#DC2626" />
        <StatCard label="Hazır Yedeği Yok" value={stats.noSuccessorNow} color="#D97706" />
        <StatCard label="Hazır Yedek Var" value={stats.readySome} color="#059669" />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[96px] animate-pulse rounded-xl border border-[#EDEDED] bg-[#FAFAFA]"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex items-center justify-between rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          <div>
            <div className="font-semibold">Liste yüklenemedi</div>
            <div className="text-xs text-[#B91C1C]/80">
              {error instanceof Error ? error.message : 'Sunucu yanıt vermedi.'}
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-md border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#FEF2F2]"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && items.length === 0 && <EmptyState />}

      {/* List */}
      {!isLoading && !isError && items.length > 0 && (
        <div
          data-testid="critical-positions-list"
          className="overflow-hidden rounded-xl border border-[#EDEDED] bg-white"
        >
          <div className="grid grid-cols-[1.6fr_1.4fr_0.9fr_0.9fr_140px] gap-4 border-b border-[#EDEDED] bg-[#FAFAFA] px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#888]">
            <div>Pozisyon</div>
            <div>Mevcut Kişi</div>
            <div>Risk</div>
            <div>Havuz</div>
            <div className="text-right"></div>
          </div>

          {items.map((p) => {
            const risk = RISK_COLORS[p.risk_level];
            return (
              <div
                key={p.plan_id}
                data-testid="critical-position-row"
                data-plan-id={p.plan_id}
                className="grid grid-cols-[1.6fr_1.4fr_0.9fr_0.9fr_140px] items-center gap-4 border-b border-[#F0F0F0] px-5 py-4 last:border-b-0"
                style={{ borderLeft: `3px solid ${risk.text}` }}
              >
                <div>
                  <div className="text-sm font-semibold text-[#111]">
                    {p.position_title_tr || '(başlıksız)'}
                  </div>
                  <div className="mt-1 text-xs text-[#888]">
                    {p.department_tr || '—'}
                    {p.criticality_tr && (
                      <span className="ml-2 italic text-[#A1A1A1]">· {p.criticality_tr}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl(p.incumbent_full_name)}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full"
                  />
                  <div>
                    <div className="text-sm font-medium text-[#111]">
                      {p.incumbent_full_name.trim() || '—'}
                    </div>
                    <div className="text-xs text-[#888]">
                      Güncelleme: {formatRelative(p.updated_at)}
                    </div>
                  </div>
                </div>

                <div>
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: risk.bg, color: risk.text }}
                  >
                    {RISK_LABEL_TR[p.risk_level]}
                  </span>
                </div>

                <div className="text-sm">
                  <span className="font-semibold text-[#111]">{p.candidate_count}</span>
                  <span className="text-xs text-[#888]">
                    {' '}
                    aday · {p.ready_now_count} hazır
                  </span>
                </div>

                <div className="flex justify-end">
                  <Link
                    href={`/admin/succession/havuz/${p.plan_id}`}
                    className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#5E5CE6] hover:border-[#5E5CE6] hover:bg-[#FAFAFF]"
                    data-testid="pool-detail-link"
                  >
                    Havuz detayı →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

const StatCard = ({ label, value, color }: StatCardProps) => (
  <div className="rounded-xl border border-[#EDEDED] bg-white p-4 text-center">
    <div className="text-[28px] font-bold" style={{ color }}>
      {value}
    </div>
    <div className="mt-0.5 text-[11px] text-[#888]">{label}</div>
  </div>
);

const EmptyState = () => (
  <div
    data-testid="critical-positions-empty"
    className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[#D4D4D4] bg-[#FAFAFA] px-6 py-14 text-center"
  >
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF0FD]">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5E5CE6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
    <div>
      <div className="text-lg font-semibold text-[#111]">Henüz kritik pozisyon yok</div>
      <p className="mt-1 text-sm text-[#888]">
        Yedekleme planı oluşturmak için önce pozisyon tanımlayın ve kritik olarak işaretleyin.
      </p>
    </div>
    <div className="flex gap-2">
      <Link
        href="/organizasyon"
        className="rounded-md bg-[#5E5CE6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F4DD1]"
      >
        Pozisyon tanımla
      </Link>
      <Link
        href="/calisanlar"
        className="rounded-md border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-semibold text-[#5E5CE6] hover:border-[#5E5CE6]"
      >
        Çalışan listesine git
      </Link>
    </div>
  </div>
);
