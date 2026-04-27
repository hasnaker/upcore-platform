'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Clock, Download, FileText, Landmark, Loader2, Lock, Play, Plus, Settings,
  Users, X,
} from 'lucide-react';
import {
  usePayrollPeriods,
  useCreatePeriod,
  usePeriodRuns,
  useCreateRun,
  useCalculateRun,
  useCalculateAllActive,
  useCalculateKamu,
  useApplyOvertime,
  useApproveRun,
  useFinaliseRun,
  useRunSlips,
  useLockPeriod,
  useSGKWorkplace,
  useUpsertWorkplace,
  useBordroSettings,
  useUpsertBordroSettings,
  useDownloadAPBForRun,
  type PayrollPeriod,
  type PayrollRun,
  type RunStatus,
  type WorkplaceInput,
  type SGKWorkplace,
  type BordroSettingsInput,
  type OvertimeKind,
  type OvertimeEntry,
} from '@/hooks/useBordro';

/**
 * Canlı bordro paneli — services/bordro'dan gerçek veri.
 * Flow: Dönem seç → Run oluştur → SlipInput[] ile hesapla → onayla → kesinleştir.
 */
export default function CanliBordroPage() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const periods = usePayrollPeriods();
  const items = periods.data?.items ?? [];
  const activePeriodId = selectedPeriodId ?? items[0]?.id ?? null;
  const activePeriod = items.find((p) => p.id === activePeriodId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
            Canlı Bordro Paneli
          </h1>
          <p className="mt-1 text-sm text-[#737373]">
            2026 GVK md.103 dilimleriyle gerçek hesaplama — dönem, run, slip.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SettingsButton />
          <WorkplaceButton />
          <CreatePeriodButton />
        </div>
      </header>

      <WorkplaceBanner />

      <PeriodSelector
        periods={items}
        loading={periods.isLoading}
        error={periods.error}
        selectedId={activePeriodId}
        onSelect={setSelectedPeriodId}
      />

      {activePeriod ? (
        <>
          <PeriodHeader period={activePeriod} />
          <RunsPanel
            period={activePeriod}
            selectedRunId={selectedRunId}
            onSelectRun={setSelectedRunId}
          />
          {selectedRunId ? <SlipsPanel runId={selectedRunId} /> : null}
        </>
      ) : !periods.isLoading ? (
        <EmptyState />
      ) : null}
    </div>
  );
}

/* ─── Period Selector ─── */

function PeriodSelector({
  periods,
  loading,
  error,
  selectedId,
  onSelect,
}: {
  periods: PayrollPeriod[];
  loading: boolean;
  error: Error | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-[#737373]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Dönemler yükleniyor…
      </div>
    );
  }
  if (error) return <ErrorBanner message={`Dönemler yüklenemedi: ${error.message}`} />;
  if (periods.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="bordro-period" className="text-xs font-medium uppercase tracking-wider text-[#737373]">
        Dönem
      </label>
      <select
        id="bordro-period"
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        className="rounded-md border border-[#EDEDED] bg-white px-3 py-2 text-sm text-[#0A0A0A] focus:border-[#5E5CE6] focus:outline-none"
      >
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.period_year}/{String(p.period_month).padStart(2, '0')} — {p.status}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ─── Period Header ─── */

function PeriodHeader({ period }: { period: PayrollPeriod }) {
  const lock = useLockPeriod(period.id);
  return (
    <div className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            Aktif Dönem
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[#0A0A0A]">
            {period.period_year}/{String(period.period_month).padStart(2, '0')}
          </h2>
          <p className="mt-1 text-sm text-[#525252]">
            {formatDate(period.start_date)} → {formatDate(period.end_date)} · Ödeme:{' '}
            {formatDate(period.pay_date)} · <StatusBadge status={period.status} />
          </p>
        </div>
        <button
          type="button"
          onClick={() => lock.mutate({})}
          disabled={period.status !== 'open' || lock.isPending}
          className="inline-flex items-center gap-2 rounded-md border border-[#EDEDED] px-3 py-2 text-sm text-[#0A0A0A] hover:bg-[#FAFAFA] disabled:opacity-50"
        >
          {lock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          Dönemi Kilitle
        </button>
      </div>
      {lock.error ? (
        <p className="mt-2 text-xs text-[#DC2626]">Kilitleme başarısız: {lock.error.message}</p>
      ) : null}
    </div>
  );
}

/* ─── Runs Panel ─── */

function RunsPanel({
  period,
  selectedRunId,
  onSelectRun,
}: {
  period: PayrollPeriod;
  selectedRunId: string | null;
  onSelectRun: (id: string) => void;
}) {
  const runs = usePeriodRuns(period.id);
  const createRun = useCreateRun();

  return (
    <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0A0A0A]">Koşumlar (Runs)</h3>
          <p className="text-xs text-[#737373]">Bu dönem için hesaplanmış ve taslak koşumlar</p>
        </div>
        <button
          type="button"
          onClick={() => createRun.mutate({ period_id: period.id, run_type: 'regular' })}
          disabled={period.status !== 'open' || createRun.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#5E5CE6] px-3 py-2 text-sm font-medium text-white hover:bg-[#4B49B6] disabled:opacity-50"
        >
          {createRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Yeni Koşum
        </button>
      </div>

      {createRun.error ? (
        <p className="mt-2 text-xs text-[#DC2626]">Koşum oluşturulamadı: {createRun.error.message}</p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg border border-[#EDEDED]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#EDEDED] bg-[#FAFAFA]">
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[#737373]">Tip</th>
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[#737373]">Durum</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[#737373]">Çalışan</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[#737373]">Brüt</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[#737373]">Net</th>
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[#737373]">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {runs.isLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-[#737373]">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : runs.error ? (
              <tr>
                <td colSpan={6} className="px-3 py-4">
                  <ErrorBanner message={runs.error.message} />
                </td>
              </tr>
            ) : (runs.data?.items ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-[#737373]">
                  Henüz koşum yok.
                </td>
              </tr>
            ) : (
              (runs.data?.items ?? []).map((run) => (
                <RunRow
                  key={run.id}
                  run={run}
                  selected={run.id === selectedRunId}
                  onSelect={onSelectRun}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RunRow({
  run,
  selected,
  onSelect,
}: {
  run: PayrollRun;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const approve = useApproveRun(run.id);
  const finalise = useFinaliseRun(run.id);
  const downloadAPB = useDownloadAPBForRun();
  const canBuildAPB =
    run.status === 'calculated' || run.status === 'approved' || run.status === 'finalised';
  return (
    <tr
      onClick={() => onSelect(run.id)}
      className={`cursor-pointer border-b border-[#EDEDED] last:border-b-0 ${
        selected ? 'bg-[#EEF2FF]' : 'hover:bg-[#FAFAFA]'
      }`}
    >
      <td className="px-3 py-2 text-[#0A0A0A]">{run.run_type}</td>
      <td className="px-3 py-2"><RunStatusBadge status={run.status} /></td>
      <td className="px-3 py-2 text-right tabular-nums">{run.employee_count}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatTry(run.total_gross)}</td>
      <td className="px-3 py-2 text-right font-medium tabular-nums text-[#16A34A]">
        {formatTry(run.total_net)}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          {run.status === 'calculated' ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                approve.mutate({});
              }}
              disabled={approve.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-[#DCFCE7] px-2 py-1 text-xs font-medium text-[#16A34A] hover:bg-[#BBF7D0] disabled:opacity-50"
            >
              <CheckCircle2 className="h-3 w-3" />
              Onayla
            </button>
          ) : null}
          {run.status === 'approved' ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                finalise.mutate({});
              }}
              disabled={finalise.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-[#EEF2FF] px-2 py-1 text-xs font-medium text-[#5E5CE6] hover:bg-[#E0E7FF] disabled:opacity-50"
            >
              <Lock className="h-3 w-3" />
              Kesinleştir
            </button>
          ) : null}
          {canBuildAPB ? (
            <button
              type="button"
              title="SGK APB XML'ini indir"
              onClick={(e) => {
                e.stopPropagation();
                downloadAPB.mutate({ runId: run.id });
              }}
              disabled={downloadAPB.isPending}
              className="inline-flex items-center gap-1 rounded-md border border-[#EDEDED] bg-white px-2 py-1 text-xs font-medium text-[#0A0A0A] hover:bg-[#FAFAFA] disabled:opacity-50"
            >
              {downloadAPB.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
              SGK APB
            </button>
          ) : null}
        </div>
        {downloadAPB.error ? (
          <p className="mt-1 text-[11px] text-[#DC2626]">{downloadAPB.error.message}</p>
        ) : null}
      </td>
    </tr>
  );
}

/* ─── Slips Panel ─── */

function SlipsPanel({ runId }: { runId: string }) {
  const slips = useRunSlips(runId);
  const calculate = useCalculateRun(runId);
  const calculateAll = useCalculateAllActive(runId);
  const calculateKamu = useCalculateKamu(runId);

  const [employeeId, setEmployeeId] = useState('');
  const [gross, setGross] = useState<number>(30_000);
  const [overtimeSlipId, setOvertimeSlipId] = useState<string | null>(null);

  const totalNet = useMemo(
    () => (slips.data?.items ?? []).reduce((acc, s) => acc + s.total_net, 0),
    [slips.data],
  );

  const canSubmit = employeeId.trim().length === 36 && gross > 0;

  return (
    <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0A0A0A]">Bordro Satırları</h3>
          <p className="text-xs text-[#737373]">Koşum için hesaplanmış çalışan bordroları</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => calculateAll.mutate({})}
            disabled={calculateAll.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-3 py-2 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50"
          >
            {calculateAll.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Users className="h-4 w-4" />
            )}
            Tüm aktif (4857) hesapla
          </button>
          <button
            type="button"
            onClick={() => calculateKamu.mutate({})}
            disabled={calculateKamu.isPending}
            title="657 Devlet Memurları Kanunu'na tabi kadrolu personel için gösterge/ek gösterge/taban aylığı + tazminatlar"
            className="inline-flex items-center gap-2 rounded-md border border-[#0A0A0A] bg-white px-3 py-2 text-sm font-medium text-[#0A0A0A] hover:bg-[#FAFAFA] disabled:opacity-50"
          >
            {calculateKamu.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Landmark className="h-4 w-4" />
            )}
            657 Kamu hesapla
          </button>
          <span className="text-xs font-medium text-[#525252]">
            Toplam Net: {formatTry(totalNet)}
          </span>
        </div>
      </div>
      {calculateAll.error ? (
        <p className="mt-2 text-xs text-[#DC2626]">
          Toplu hesaplama başarısız: {calculateAll.error.message}
        </p>
      ) : null}
      {calculateAll.data ? (
        <p className="mt-2 text-xs text-[#16A34A]">
          {calculateAll.data.employee_count} çalışan için slip üretildi.
        </p>
      ) : null}
      {calculateKamu.error ? (
        <p className="mt-2 text-xs text-[#DC2626]">
          Kamu hesaplama: {calculateKamu.error.message}
        </p>
      ) : null}
      {calculateKamu.data ? (
        <p className="mt-2 text-xs text-[#16A34A]">
          {calculateKamu.data.employee_count} memur için 657 slip üretildi (gösterge/ek
          gösterge/tazminatlar ayrıntılı).
        </p>
      ) : null}

      {/* Inline calculate input */}
      <div className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
            Çalışan UUID
          </span>
          <input
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="w-80 rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 font-mono text-xs"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
            Brüt Maaş
          </span>
          <input
            type="number"
            min={0}
            value={gross}
            onChange={(e) => setGross(Number(e.target.value))}
            className="w-32 rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={!canSubmit || calculate.isPending}
          onClick={() =>
            calculate.mutate({
              inputs: [{ employee_id: employeeId.trim(), base_salary_gross: gross }],
            })
          }
          className="inline-flex items-center gap-2 rounded-md bg-[#5E5CE6] px-3 py-2 text-sm font-medium text-white hover:bg-[#4B49B6] disabled:opacity-50"
        >
          {calculate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Hesapla & Ekle
        </button>
      </div>
      {calculate.error ? (
        <p className="mt-2 text-xs text-[#DC2626]">Hesaplama başarısız: {calculate.error.message}</p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg border border-[#EDEDED]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#EDEDED] bg-[#FAFAFA]">
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[#737373]">Çalışan</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[#737373]">Brüt</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[#737373]">SGK İşçi</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[#737373]">Gelir V.</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[#737373]">Damga</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[#737373]">Net</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[#737373]">İşveren Maliyeti</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[#737373]">Mesai</th>
            </tr>
          </thead>
          <tbody>
            {slips.isLoading ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-[#737373]">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : slips.error ? (
              <tr>
                <td colSpan={8} className="px-3 py-4">
                  <ErrorBanner message={slips.error.message} />
                </td>
              </tr>
            ) : (slips.data?.items ?? []).length === 0 ? (
              <tr>                <td colSpan={8} className="px-3 py-6 text-center text-sm text-[#737373]">
                  Henüz satır yok — yukarıdan hesaplama yapın.
                </td>
              </tr>
            ) : (
              (slips.data?.items ?? []).map((s) => {
                const employerCost =
                  s.total_gross + s.sgk_employer + s.unemployment_employer;
                return (
                  <tr key={s.id} className="border-b border-[#EDEDED] last:border-b-0 hover:bg-[#FAFAFA]">
                    <td className="px-3 py-2 font-mono text-xs text-[#525252]">
                      {s.employee_id.slice(0, 8)}…
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTry(s.total_gross)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#DC2626]">
                      -{formatTry(s.sgk_employee + s.sgk_unemployment_emp)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#DC2626]">
                      -{formatTry(s.income_tax)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#DC2626]">
                      -{formatTry(s.stamp_tax)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-[#16A34A]">
                      {formatTry(s.total_net)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#525252]">
                      {formatTry(employerCost)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setOvertimeSlipId(s.employee_id)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#EDEDED] bg-white px-2 py-1 text-[11px] font-medium text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
                      >
                        <Clock className="h-3 w-3" />
                        Mesai
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {overtimeSlipId ? (
        <OvertimeModal
          runId={runId}
          employeeId={overtimeSlipId}
          onClose={() => setOvertimeSlipId(null)}
        />
      ) : null}
    </section>
  );
}

/* ─── Overtime Modal ─── */

function OvertimeModal({
  runId,
  employeeId,
  onClose,
}: {
  runId: string;
  employeeId: string;
  onClose: () => void;
}) {
  const apply = useApplyOvertime(runId, employeeId);
  const [entries, setEntries] = useState<OvertimeEntry[]>([
    { kind: 'weekday_normal', hours: 0 },
  ]);
  const [cumulativeYTD, setCumulativeYTD] = useState(0);

  const addEntry = () =>
    setEntries((prev) => [...prev, { kind: 'weekday_normal', hours: 0 }]);
  const removeEntry = (i: number) =>
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  const updateEntry = (i: number, patch: Partial<OvertimeEntry>) =>
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const totalHours = entries.reduce((acc, e) => acc + (Number.isFinite(e.hours) ? e.hours : 0), 0);
  const weekdayHours = entries
    .filter((e) => e.kind === 'weekday_normal')
    .reduce((acc, e) => acc + e.hours, 0);
  const annualWarning = cumulativeYTD + weekdayHours > 270;

  const submit = async () => {
    const valid = entries.filter((e) => e.hours > 0);
    if (valid.length === 0) return;
    await apply.mutateAsync({
      entries: valid,
      cumulative_weekday_ytd: cumulativeYTD,
    });
    if (!apply.error) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-xl border border-[#EDEDED] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#0A0A0A]">Fazla Mesai Girişi</h3>
            <p className="text-xs text-[#737373]">
              4857/41 — hafta içi %50 zam, hafta sonu/tatil %100, fazla süreli %25
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#737373] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 font-mono text-[11px] text-[#737373]">
          Çalışan: {employeeId.slice(0, 8)}…
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {entries.map((e, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={e.kind}
                onChange={(ev) =>
                  updateEntry(i, { kind: ev.target.value as OvertimeKind })
                }
                className="flex-1 rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-sm"
              >
                <option value="weekday_normal">Hafta içi (1.5x)</option>
                <option value="weekend_holiday">Hafta sonu / Tatil (2.0x)</option>
                <option value="night">Gece (2.0x)</option>
                <option value="fazla_sureli">Fazla süreli (1.25x)</option>
              </select>
              <input
                type="number"
                min={0}
                step={0.5}
                value={e.hours}
                onChange={(ev) => updateEntry(i, { hours: Number(ev.target.value) })}
                placeholder="Saat"
                className="w-24 rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-right text-sm tabular-nums"
              />
              <button
                type="button"
                onClick={() => removeEntry(i)}
                disabled={entries.length === 1}
                className="rounded-md p-1.5 text-[#737373] hover:bg-[#FAFAFA] hover:text-[#DC2626] disabled:opacity-30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addEntry}
            className="inline-flex items-center gap-1 self-start rounded-md border border-dashed border-[#EDEDED] px-2 py-1 text-xs text-[#737373] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
          >
            <Plus className="h-3 w-3" /> Kalem ekle
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Bu yıl şu ana kadar hafta içi mesai (saat)
            </span>
            <input
              type="number"
              min={0}
              value={cumulativeYTD}
              onChange={(ev) => setCumulativeYTD(Number(ev.target.value))}
              className="w-32 rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-right text-sm tabular-nums"
            />
          </label>
          <p className="mt-2 text-[11px] text-[#737373]">
            Toplam bu ay: <strong>{totalHours}</strong> saat · Yıllık limit 270 saat (sadece
            hafta içi sayılır)
          </p>
          {annualWarning ? (
            <p className="mt-1 text-[11px] font-medium text-[#DC2626]">
              ⚠ Yıllık 270 saat sınırı aşıldı — HR onayı gerekebilir (4857/41)
            </p>
          ) : null}
        </div>

        {apply.error ? (
          <p className="mt-3 text-xs text-[#DC2626]">{apply.error.message}</p>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#EDEDED] bg-white px-3 py-2 text-sm font-medium text-[#525252] hover:bg-[#FAFAFA]"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={apply.isPending || totalHours === 0}
            className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-3 py-2 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50"
          >
            {apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
            Mesaiyi Uygula
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Create Period Button ─── */

function CreatePeriodButton() {
  const mutate = useCreatePeriod();
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md bg-[#5E5CE6] px-3 py-2 text-sm font-medium text-white hover:bg-[#4B49B6]"
      >
        <Plus className="h-4 w-4" />
        Yeni Dönem
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-[#EDEDED] bg-white p-4 shadow-lg">
          <p className="text-sm font-semibold text-[#0A0A0A]">Yeni Bordro Dönemi</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
                Yıl
              </span>
              <input
                type="number"
                value={year}
                min={2000}
                max={2100}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-md border border-[#EDEDED] px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
                Ay
              </span>
              <input
                type="number"
                value={month}
                min={1}
                max={12}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-md border border-[#EDEDED] px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          {mutate.error ? (
            <p className="mt-2 text-xs text-[#DC2626]">Hata: {mutate.error.message}</p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-[#EDEDED] px-3 py-1.5 text-sm text-[#525252] hover:bg-[#FAFAFA]"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() =>
                mutate.mutate(
                  { period_year: year, period_month: month },
                  { onSuccess: () => setOpen(false) },
                )
              }
              disabled={mutate.isPending}
              className="rounded-md bg-[#5E5CE6] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4B49B6] disabled:opacity-50"
            >
              {mutate.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Workplace banner + modal ─── */

function WorkplaceBanner() {
  const q = useSGKWorkplace();
  if (q.isLoading) return null;
  if (q.data) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[12px] text-[#92400E]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">SGK İşyeri tanımı yok</p>
        <p className="mt-0.5">
          APB XML üretimi ve e-Bildirge gönderimi için üstteki
          &quot;İşyeri Ayarları&quot; butonundan sicil no + vergi no + unvan bilgilerini girin.
        </p>
      </div>
    </div>
  );
}

function WorkplaceButton() {
  const wp = useSGKWorkplace();
  const upsert = useUpsertWorkplace();
  const [open, setOpen] = useState(false);
  const existing: SGKWorkplace | null = wp.data ?? null;
  const [form, setForm] = useState<WorkplaceInput>(() => ({
    sicil_no: existing?.sicil_no ?? '',
    unvan: existing?.unvan ?? '',
    vergi_dairesi: existing?.vergi_dairesi ?? '',
    vergi_no: existing?.vergi_no ?? '',
    il: existing?.il ?? '',
    ilce: existing?.ilce ?? '',
    kanun_turu: existing?.kanun_turu ?? '09100',
  }));

  // Re-sync form when existing data arrives.
  useMemo(() => {
    if (existing) {
      setForm({
        sicil_no: existing.sicil_no,
        unvan: existing.unvan,
        vergi_dairesi: existing.vergi_dairesi ?? '',
        vergi_no: existing.vergi_no,
        il: existing.il ?? '',
        ilce: existing.ilce ?? '',
        kanun_turu: existing.kanun_turu,
      });
    }
  }, [existing]);

  const submit = () => {
    upsert.mutate(form, { onSuccess: () => setOpen(false) });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-[#EDEDED] px-3 py-2 text-sm text-[#0A0A0A] hover:bg-[#FAFAFA]"
      >
        <Settings className="h-4 w-4" />
        İşyeri Ayarları
        {existing ? (
          <span className="ml-1 rounded-full bg-[#DCFCE7] px-1.5 py-0.5 text-[10px] text-[#14532D]">
            Tanımlı
          </span>
        ) : (
          <span className="ml-1 rounded-full bg-[#FEE2E2] px-1.5 py-0.5 text-[10px] text-[#7F1D1D]">
            Eksik
          </span>
        )}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-[#EDEDED] bg-white p-4 shadow-lg">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
            <FileText className="h-4 w-4" />
            SGK İşyeri Bilgileri
          </p>
          <div className="mt-3 space-y-2">
            <WPField
              label="Sicil No *"
              value={form.sicil_no}
              onChange={(v) => setForm({ ...form, sicil_no: v })}
            />
            <WPField
              label="Ticari Unvan *"
              value={form.unvan}
              onChange={(v) => setForm({ ...form, unvan: v })}
            />
            <WPField
              label="Vergi No *"
              value={form.vergi_no}
              onChange={(v) => setForm({ ...form, vergi_no: v })}
            />
            <WPField
              label="Vergi Dairesi"
              value={form.vergi_dairesi ?? ''}
              onChange={(v) => setForm({ ...form, vergi_dairesi: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              <WPField
                label="İl"
                value={form.il ?? ''}
                onChange={(v) => setForm({ ...form, il: v })}
              />
              <WPField
                label="İlçe"
                value={form.ilce ?? ''}
                onChange={(v) => setForm({ ...form, ilce: v })}
              />
            </div>
            <WPField
              label="Kanun Türü (5510)"
              value={form.kanun_turu ?? '09100'}
              onChange={(v) => setForm({ ...form, kanun_turu: v })}
            />
          </div>
          {upsert.error ? (
            <p className="mt-2 text-xs text-[#DC2626]">Hata: {upsert.error.message}</p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-[#EDEDED] px-3 py-1.5 text-sm text-[#525252] hover:bg-[#FAFAFA]"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={
                upsert.isPending ||
                !form.sicil_no.trim() ||
                !form.unvan.trim() ||
                !form.vergi_no.trim()
              }
              className="rounded-md bg-[#5E5CE6] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4B49B6] disabled:opacity-50"
            >
              {upsert.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SettingsButton() {
  const q = useBordroSettings();
  const upsert = useUpsertBordroSettings();
  const [open, setOpen] = useState(false);
  const existing = q.data;

  const [form, setForm] = useState<Required<Pick<BordroSettingsInput,
    'hours_per_month' | 'meal_daily_gross' | 'meal_exempt_daily' |
    'transport_daily_gross' | 'transport_exempt_daily' | 'apply_min_wage_exemption'>>>(() => ({
    hours_per_month: 225,
    meal_daily_gross: 0,
    meal_exempt_daily: 240,
    transport_daily_gross: 0,
    transport_exempt_daily: 126,
    apply_min_wage_exemption: true,
  }));

  useMemo(() => {
    if (existing) {
      setForm({
        hours_per_month: existing.hours_per_month,
        meal_daily_gross: existing.meal_daily_gross,
        meal_exempt_daily: existing.meal_exempt_daily,
        transport_daily_gross: existing.transport_daily_gross,
        transport_exempt_daily: existing.transport_exempt_daily,
        apply_min_wage_exemption: existing.apply_min_wage_exemption,
      });
    }
  }, [existing]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-[#EDEDED] px-3 py-2 text-sm text-[#0A0A0A] hover:bg-[#FAFAFA]"
      >
        <Settings className="h-4 w-4" />
        Bordro Ayarları
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-[#EDEDED] bg-white p-4 shadow-lg">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
            <FileText className="h-4 w-4" />
            Tenant Bordro Ayarları
          </p>
          <p className="mt-1 text-xs text-[#737373]">
            Yemek/yol günlük istisna tavanları + saatlik ücret tabanı (GVK Mük.67 + 4857/32).
          </p>
          <div className="mt-3 space-y-2">
            <WPField
              label="Aylık saat (saatlik ücret hesabı)"
              value={String(form.hours_per_month)}
              onChange={(v) => setForm({ ...form, hours_per_month: Number(v) || 225 })}
            />
            <div className="grid grid-cols-2 gap-2">
              <WPField
                label="Yemek günlük brüt"
                value={String(form.meal_daily_gross)}
                onChange={(v) => setForm({ ...form, meal_daily_gross: Number(v) || 0 })}
              />
              <WPField
                label="Yemek istisna tavanı"
                value={String(form.meal_exempt_daily)}
                onChange={(v) => setForm({ ...form, meal_exempt_daily: Number(v) || 0 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <WPField
                label="Yol günlük brüt"
                value={String(form.transport_daily_gross)}
                onChange={(v) => setForm({ ...form, transport_daily_gross: Number(v) || 0 })}
              />
              <WPField
                label="Yol istisna tavanı"
                value={String(form.transport_exempt_daily)}
                onChange={(v) => setForm({ ...form, transport_exempt_daily: Number(v) || 0 })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[#525252]">
              <input
                type="checkbox"
                checked={form.apply_min_wage_exemption}
                onChange={(e) => setForm({ ...form, apply_min_wage_exemption: e.target.checked })}
              />
              Asgari ücret gelir+damga vergisi istisnası uygula (GVK Gç.86)
            </label>
          </div>
          {upsert.error ? (
            <p className="mt-2 text-xs text-[#DC2626]">Hata: {upsert.error.message}</p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-[#EDEDED] px-3 py-1.5 text-sm text-[#525252] hover:bg-[#FAFAFA]"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() =>
                upsert.mutate(form, {
                  onSuccess: () => setOpen(false),
                })
              }
              disabled={upsert.isPending}
              className="rounded-md bg-[#5E5CE6] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4B49B6] disabled:opacity-50"
            >
              {upsert.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WPField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[#EDEDED] px-2 py-1.5 text-sm"
      />
    </label>
  );
}

/* ─── Shared helpers ─── */

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] px-6 py-10 text-center">
      <p className="text-sm font-medium text-[#0A0A0A]">Henüz bordro dönemi yok</p>
      <p className="mt-1 text-xs text-[#737373]">
        Bir dönem oluşturarak koşum ve hesaplama adımlarına başlayın.
      </p>
    </div>
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

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#5E5CE6]">
      {status}
    </span>
  );
}

function RunStatusBadge({ status }: { status: RunStatus }) {
  const tone =
    status === 'finalised'
      ? 'bg-[#DCFCE7] text-[#14532D]'
      : status === 'approved'
        ? 'bg-[#EEF2FF] text-[#5E5CE6]'
        : status === 'calculated'
          ? 'bg-[#FFFBEB] text-[#92400E]'
          : status === 'voided'
            ? 'bg-[#FEE2E2] text-[#7F1D1D]'
            : 'bg-[#F5F5F5] text-[#525252]';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {status}
    </span>
  );
}

function formatTry(val: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('tr-TR');
  } catch {
    return iso;
  }
}
