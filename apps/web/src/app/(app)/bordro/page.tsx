'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Banknote, Calculator, FileCheck, ChevronDown, ChevronUp,
  CheckCircle, CreditCard, AlertTriangle, Shield, Percent,
} from 'lucide-react';

/* ─── Types ─── */

interface PayrollRun {
  id: string;
  period: string;
  status: string;
  employeeCount: number;
  totalGross: number;
  totalNet: number;
  totalSgk: number;
  totalTax: number;
  totalEmployerCost: number;
  createdAt: string;
  approvedAt: string | null;
  paidAt: string | null;
}

interface PayrollItem {
  id: string;
  runId: string;
  employeeId: string;
  name: string;
  department: string;
  gross: number;
  sgkEmployee: number;
  sgkEmployer: number;
  unemploymentEmployee: number;
  unemploymentEmployer: number;
  incomeTax: number;
  stampTax: number;
  totalDeductions: number;
  netSalary: number;
  employerCost: number;
}

interface BordroStats {
  totalGross: number;
  totalNet: number;
  totalSgk: number;
  totalTax: number;
  totalEmployerCost: number;
}

interface TaxRates {
  sgkEmployee: number;
  sgkEmployer: number;
  unemploymentEmployee: number;
  unemploymentEmployer: number;
  stampTax: number;
  incomeTaxBrackets: Array<{ limit: number | string; rate: number }>;
}

/* ─── Helpers ─── */

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

const formatCurrencyDetailed = (val: number): string =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Taslak', color: 'text-[#737373]', bg: 'bg-[#F5F5F5]' },
  approved: { label: 'Onaylandi', color: 'text-[#16A34A]', bg: 'bg-[#DCFCE7]' },
  paid: { label: 'Odendi', color: 'text-[#5E5CE6]', bg: 'bg-[#EEF2FF]' },
};

/* ─── Component ─── */

export default function BordroPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [stats, setStats] = useState<BordroStats | null>(null);
  const [taxRates, setTaxRates] = useState<TaxRates | null>(null);
  const [tab, setTab] = useState<'runs' | 'detail' | 'taxes'>('runs');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const fetchData = useCallback(() => {
    fetch('/api/bordro')
      .then((r) => r.json())
      .then((data) => {
        if (data.runs) setRuns(data.runs);
        if (data.items) setItems(data.items);
        if (data.stats) setStats(data.stats);
        if (data.taxRates) setTaxRates(data.taxRates);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* Actions */
  const handleCreateRun = async () => {
    setActionLoading(true);
    setActionMessage('');
    try {
      const res = await fetch('/api/bordro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Bordro olusturuldu: ${data.period} (${data.employeeCount} calisan)`);
        fetchData();
      } else {
        setActionMessage(data.error || 'Bordro olusturulamadi');
      }
    } catch {
      setActionMessage('Bordro olusturma basarisiz');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (runId: string, status: 'approved' | 'paid') => {
    setActionLoading(true);
    setActionMessage('');
    try {
      const res = await fetch('/api/bordro', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, status }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(status === 'approved' ? 'Bordro onaylandi' : 'Odeme tamamlandi olarak isaretlendi');
        fetchData();
      } else {
        setActionMessage(data.error || 'Islem basarisiz');
      }
    } catch {
      setActionMessage('Islem basarisiz');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Bordro Yonetimi</h1>
          <p className="mt-1 text-sm text-[#737373]">
            Maas hesaplama, vergi kesintileri ve odeme takibi
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateRun}
          disabled={actionLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-[#5E5CE6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B49B6] disabled:opacity-50"
        >
          <Calculator className="h-4 w-4" />
          Yeni Bordro Hesapla
        </button>
      </div>

      {/* Action message */}
      {actionMessage && (
        <div className="rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3 text-sm text-[#525252]">
          {actionMessage}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Banknote className="h-5 w-5 text-[#5E5CE6]" />}
          label="Toplam Brut"
          value={formatCurrency(stats?.totalGross ?? 0)}
          bgColor="bg-[#EEF2FF]"
        />
        <SummaryCard
          icon={<CreditCard className="h-5 w-5 text-[#16A34A]" />}
          label="Toplam Net"
          value={formatCurrency(stats?.totalNet ?? 0)}
          bgColor="bg-[#DCFCE7]"
        />
        <SummaryCard
          icon={<Shield className="h-5 w-5 text-[#EA580C]" />}
          label="SGK Toplam"
          value={formatCurrency(stats?.totalSgk ?? 0)}
          bgColor="bg-[#FFF7ED]"
        />
        <SummaryCard
          icon={<Percent className="h-5 w-5 text-[#DC2626]" />}
          label="Vergi Toplam"
          value={formatCurrency(stats?.totalTax ?? 0)}
          bgColor="bg-[#FEE2E2]"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#EDEDED]">
        {[
          { key: 'runs' as const, label: 'Bordro Listesi', icon: <FileCheck className="h-4 w-4" /> },
          { key: 'detail' as const, label: 'Calisan Detay', icon: <Banknote className="h-4 w-4" /> },
          { key: 'taxes' as const, label: 'Vergi Tablosu', icon: <Percent className="h-4 w-4" /> },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-[#5E5CE6] text-[#5E5CE6]'
                : 'border-transparent text-[#737373] hover:text-[#0A0A0A]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Payroll Runs */}
      {tab === 'runs' && (
        <div className="overflow-hidden rounded-lg border border-[#EDEDED] bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EDEDED] bg-[#FAFAFA]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Donem</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Calisan</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#737373]">Brut</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#737373]">Net</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#737373]">Isveren Maliyeti</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Islemler</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#737373]">
                    Henuz bordro olusturulmamis. &quot;Yeni Bordro Hesapla&quot; butonuna tiklayin.
                  </td>
                </tr>
              ) : (
                runs.map((run) => {
                  const fallback = { label: 'Taslak', color: 'text-[#737373]', bg: 'bg-[#F5F5F5]' };
                  const cfg = statusConfig[run.status] ?? fallback;
                  return (
                    <tr key={run.id} className="border-b border-[#EDEDED] last:border-b-0 hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 text-sm font-medium text-[#0A0A0A]">{run.period}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#525252]">{run.employeeCount}</td>
                      <td className="px-4 py-3 text-right text-sm text-[#525252]">{formatCurrency(run.totalGross)}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-[#0A0A0A]">{formatCurrency(run.totalNet)}</td>
                      <td className="px-4 py-3 text-right text-sm text-[#525252]">{formatCurrency(run.totalEmployerCost)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {run.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(run.id, 'approved')}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1 rounded-md bg-[#DCFCE7] px-2.5 py-1 text-xs font-medium text-[#16A34A] transition-colors hover:bg-[#BBF7D0] disabled:opacity-50"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Onayla
                            </button>
                          )}
                          {run.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(run.id, 'paid')}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1 rounded-md bg-[#EEF2FF] px-2.5 py-1 text-xs font-medium text-[#5E5CE6] transition-colors hover:bg-[#E0E7FF] disabled:opacity-50"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Odendi Isaretle
                            </button>
                          )}
                          {run.status === 'paid' && (
                            <span className="text-xs text-[#737373]">Tamamlandi</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Employee Detail (expandable) */}
      {tab === 'detail' && (
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-lg border border-[#EDEDED] bg-white px-4 py-12 text-center text-sm text-[#737373]">
              Calisan detayi goruntulenemedi. Once bir bordro olusturun.
            </div>
          ) : (
            items.map((item) => {
              const isExpanded = expandedItem === item.id;
              return (
                <div key={item.id} className="rounded-lg border border-[#EDEDED] bg-white">
                  {/* Summary row */}
                  <button
                    type="button"
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#FAFAFA]"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-medium text-[#0A0A0A]">{item.name}</p>
                        <p className="text-xs text-[#737373]">{item.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-[#737373]">Brut</p>
                        <p className="text-sm font-medium text-[#0A0A0A]">{formatCurrency(item.gross)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#737373]">Net</p>
                        <p className="text-sm font-semibold text-[#16A34A]">{formatCurrency(item.netSalary)}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-[#737373]" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-[#737373]" />
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-[#EDEDED] bg-[#FAFAFA] px-4 py-4">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <DetailRow label="Brut Maas" value={formatCurrencyDetailed(item.gross)} />
                        <DetailRow label="SGK Isci (%14)" value={`- ${formatCurrencyDetailed(item.sgkEmployee)}`} negative />
                        <DetailRow label="Issizlik Isci (%1)" value={`- ${formatCurrencyDetailed(item.unemploymentEmployee)}`} negative />
                        <DetailRow label="Gelir Vergisi" value={`- ${formatCurrencyDetailed(item.incomeTax)}`} negative />
                        <DetailRow label="Damga Vergisi (%0.759)" value={`- ${formatCurrencyDetailed(item.stampTax)}`} negative />
                        <DetailRow label="Toplam Kesinti" value={`- ${formatCurrencyDetailed(item.totalDeductions)}`} negative highlight />
                        <DetailRow label="Net Maas" value={formatCurrencyDetailed(item.netSalary)} highlight positive />
                        <div className="col-span-full my-2 border-t border-[#EDEDED]" />
                        <DetailRow label="SGK Isveren (%20.5)" value={formatCurrencyDetailed(item.sgkEmployer)} />
                        <DetailRow label="Issizlik Isveren (%2)" value={formatCurrencyDetailed(item.unemploymentEmployer)} />
                        <DetailRow label="Isveren Toplam Maliyet" value={formatCurrencyDetailed(item.employerCost)} highlight />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Tax Breakdown Table */}
      {tab === 'taxes' && (
        <div className="space-y-6">
          {/* Deduction rates */}
          <div className="rounded-lg border border-[#EDEDED] bg-white">
            <div className="border-b border-[#EDEDED] p-4">
              <h3 className="text-sm font-medium text-[#0A0A0A]">Turk Bordro Kesinti Oranlari</h3>
              <p className="text-xs text-[#737373]">Guncel yasal kesinti ve prim oranlari</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EDEDED] bg-[#FAFAFA]">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Kesinti Tipi</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#737373]">Isci Payi</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#737373]">Isveren Payi</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#EDEDED]">
                  <td className="px-4 py-3 text-sm text-[#0A0A0A]">SGK Primi</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-[#DC2626]">%{taxRates?.sgkEmployee ?? 14}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-[#DC2626]">%{taxRates?.sgkEmployer ?? 20.5}</td>
                </tr>
                <tr className="border-b border-[#EDEDED]">
                  <td className="px-4 py-3 text-sm text-[#0A0A0A]">Issizlik Sigortasi</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-[#EA580C]">%{taxRates?.unemploymentEmployee ?? 1}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-[#EA580C]">%{taxRates?.unemploymentEmployer ?? 2}</td>
                </tr>
                <tr className="border-b border-[#EDEDED]">
                  <td className="px-4 py-3 text-sm text-[#0A0A0A]">Damga Vergisi</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-[#737373]">%{taxRates?.stampTax ?? 0.759}</td>
                  <td className="px-4 py-3 text-right text-sm text-[#737373]">-</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-[#0A0A0A]">Gelir Vergisi</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-[#737373]">Kumulatif</td>
                  <td className="px-4 py-3 text-right text-sm text-[#737373]">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Progressive income tax brackets */}
          <div className="rounded-lg border border-[#EDEDED] bg-white">
            <div className="border-b border-[#EDEDED] p-4">
              <h3 className="text-sm font-medium text-[#0A0A0A]">Gelir Vergisi Dilimleri (Kumulatif)</h3>
              <p className="text-xs text-[#737373]">Yillik kumulatif matrah uzerinden artan oranli vergi</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EDEDED] bg-[#FAFAFA]">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Dilim</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#737373]">Ust Sinir</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#737373]">Vergi Orani</th>
                </tr>
              </thead>
              <tbody>
                {(taxRates?.incomeTaxBrackets ?? [
                  { limit: 158000, rate: 15 },
                  { limit: 330000, rate: 20 },
                  { limit: 1200000, rate: 27 },
                  { limit: 4300000, rate: 35 },
                  { limit: 'Uzeri', rate: 40 },
                ]).map((bracket, idx) => (
                  <tr key={idx} className="border-b border-[#EDEDED] last:border-b-0">
                    <td className="px-4 py-3 text-sm text-[#525252]">{idx + 1}. Dilim</td>
                    <td className="px-4 py-3 text-right text-sm text-[#0A0A0A]">
                      {typeof bracket.limit === 'number'
                        ? new Intl.NumberFormat('tr-TR').format(bracket.limit) + ' TL'
                        : bracket.limit}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-[#DC2626]">%{bracket.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#D97706]" />
            <div>
              <p className="text-sm font-medium text-[#92400E]">Onemli Bilgi</p>
              <p className="mt-1 text-xs text-[#A16207]">
                Gelir vergisi kumulatif matrah uzerinden hesaplanir. Yil icinde calisan toplam brut maas arttikca
                ust dilimlere gecis yapilir ve vergi orani artar. SGK tavan ve taban maas sinirlari ayrica uygulanir.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Summary Card ─── */

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
}

const SummaryCard = ({ icon, label, value, bgColor }: SummaryCardProps) => (
  <div className="rounded-lg border border-[#EDEDED] bg-white p-5">
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-[#737373]">{label}</p>
        <p className="text-lg font-semibold text-[#0A0A0A]">{value}</p>
      </div>
    </div>
  </div>
);

/* ─── Detail Row ─── */

interface DetailRowProps {
  label: string;
  value: string;
  negative?: boolean;
  positive?: boolean;
  highlight?: boolean;
}

const DetailRow = ({ label, value, negative, positive, highlight }: DetailRowProps) => (
  <div className={`flex items-center justify-between rounded-md px-3 py-2 ${highlight ? 'bg-white border border-[#EDEDED]' : ''}`}>
    <span className={`text-sm ${highlight ? 'font-medium text-[#0A0A0A]' : 'text-[#525252]'}`}>{label}</span>
    <span
      className={`text-sm font-medium ${
        positive ? 'text-[#16A34A]' : negative ? 'text-[#DC2626]' : 'text-[#0A0A0A]'
      }`}
    >
      {value}
    </span>
  </div>
);
