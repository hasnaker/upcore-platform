'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  X,
  Play,
  Trash2,
  Calendar,
  Flame,
  TrendingUp,
  DollarSign,
  Heart,
  Target,
  GraduationCap,
} from 'lucide-react';

/* ─── Types ─── */

interface ReportTemplate {
  type: string;
  name: string;
  description: string;
}

interface SavedReport {
  id: string;
  name: string;
  reportType: string;
  config: Record<string, unknown> | null;
  schedule: string | null;
  lastRunAt: string | null;
  createdAt: string;
}

interface ReportsData {
  templates: ReportTemplate[];
  savedReports: SavedReport[];
}

/* ─── Report type config ─── */
const TYPE_META: Record<string, { icon: React.ReactNode; color: string; exportType: string }> = {
  burnout_weekly: { icon: <Flame className="h-5 w-5" />, color: '#DC2626', exportType: 'employees' },
  performance_monthly: { icon: <TrendingUp className="h-5 w-5" />, color: '#5E5CE6', exportType: 'performance' },
  compensation_equity: { icon: <DollarSign className="h-5 w-5" />, color: '#D97706', exportType: 'employees' },
  engagement_summary: { icon: <Heart className="h-5 w-5" />, color: '#059669', exportType: 'employees' },
  okr_progress: { icon: <Target className="h-5 w-5" />, color: '#2563EB', exportType: 'okr' },
  training_roi: { icon: <GraduationCap className="h-5 w-5" />, color: '#8B5CF6', exportType: 'employees' },
};

const SCHEDULE_BADGES: Record<string, { label: string; className: string }> = {
  daily: { label: 'Gunluk', className: 'bg-[#DBEAFE] text-[#1D4ED8]' },
  weekly: { label: 'Haftalik', className: 'bg-[#DBEAFE] text-[#1D4ED8]' },
  monthly: { label: 'Aylik', className: 'bg-[#EDE9FE] text-[#6D28D9]' },
};

const DEFAULT_BADGE = { label: 'Manuel', className: 'bg-[#F3F4F6] text-[#6B7280]' };

export default function RaporlarPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('');
  const [formSchedule, setFormSchedule] = useState('none');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/reports')
      .then((r) => r.json())
      .then((d: ReportsData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!formName.trim() || !formType) return;
    setSaving(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          reportType: formType,
          schedule: formSchedule === 'none' ? null : formSchedule,
          config: {},
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setFormName('');
        setFormType('');
        setFormSchedule('none');
        fetchData();
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reportId: string) => {
    setDeleting(reportId);
    try {
      const res = await fetch(`/api/reports?reportId=${reportId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch {
      /* ignore */
    } finally {
      setDeleting(null);
    }
  };

  const handleRun = (reportType: string) => {
    const meta = TYPE_META[reportType];
    const exportType = meta?.exportType ?? 'employees';
    window.open(`/api/export?type=${exportType}`, '_blank');
  };

  const templates = data?.templates ?? [];
  const savedReports = data?.savedReports ?? [];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Rapor Olusturucu</h1>
          <p className="mt-1 text-sm text-[#525252]">
            Hazir sablonlardan rapor olusturun, zamanlayin ve CSV olarak indirin.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#5E5CE6] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#4B49B6]"
        >
          <Plus className="h-3.5 w-3.5" /> Yeni Rapor
        </button>
      </div>

      {/* Report Type Cards */}
      <div>
        <h2 className="text-[15px] font-semibold text-[#0A0A0A]">Rapor Turleri</h2>
        <p className="mt-1 text-[12px] text-[#888]">Kullanilabilir rapor sablonlari.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const meta = TYPE_META[t.type];
            return (
              <div
                key={t.type}
                className="rounded-xl border border-[#EDEDED] bg-white p-5 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${meta?.color ?? '#525252'}15`, color: meta?.color ?? '#525252' }}
                  >
                    {meta?.icon ?? <FileText className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[14px] font-semibold text-[#0A0A0A]">{t.name}</h3>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-[#888]">{t.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-medium text-[#888]">
                    {t.type}
                  </span>
                  <button
                    onClick={() => {
                      setFormType(t.type);
                      setFormName(t.name);
                      setShowModal(true);
                    }}
                    className="text-[12px] font-medium text-[#5E5CE6] hover:underline"
                  >
                    Olustur
                  </button>
                </div>
              </div>
            );
          })}

          {loading && templates.length === 0 && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[#EDEDED] bg-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-[#F5F5F5]" />
                    <div className="flex-1">
                      <div className="h-4 w-28 animate-pulse rounded bg-[#F5F5F5]" />
                      <div className="mt-2 h-3 w-full animate-pulse rounded bg-[#F5F5F5]" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Saved Reports */}
      <div>
        <h2 className="text-[15px] font-semibold text-[#0A0A0A]">Kayitli Raporlar</h2>
        <p className="mt-1 text-[12px] text-[#888]">Olusturdugumuz raporlar ve zamanlamalari.</p>

        <div className="mt-4 rounded-xl border border-[#EDEDED] bg-white">
          {loading ? (
            <div className="p-8 text-center text-[13px] text-[#888]">Yukleniyor...</div>
          ) : savedReports.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#888]">
              Henuz kayitli rapor bulunmuyor. &quot;Yeni Rapor&quot; butonuyla olusturabilirsiniz.
            </div>
          ) : (
            <div className="divide-y divide-[#F5F5F5]">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_140px_100px_120px_100px] gap-4 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-[#888]">
                <span>Rapor Adi</span>
                <span>Tur</span>
                <span>Zamanlama</span>
                <span>Son Calistirma</span>
                <span className="text-right">Islemler</span>
              </div>

              {savedReports.map((report) => {
                const meta = TYPE_META[report.reportType];
                const badge = report.schedule
                  ? SCHEDULE_BADGES[report.schedule] ?? DEFAULT_BADGE
                  : DEFAULT_BADGE;

                return (
                  <div
                    key={report.id}
                    className="grid grid-cols-[1fr_140px_100px_120px_100px] items-center gap-4 px-5 py-3.5 text-[13px] hover:bg-[#FAFAFA]"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                        style={{
                          backgroundColor: `${meta?.color ?? '#525252'}15`,
                          color: meta?.color ?? '#525252',
                        }}
                      >
                        {meta?.icon ? (
                          <div className="scale-75">{meta.icon}</div>
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <span className="font-medium text-[#0A0A0A]">{report.name}</span>
                    </div>

                    <span className="text-[12px] text-[#525252]">{report.reportType}</span>

                    <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>
                      {badge.label}
                    </span>

                    <span className="text-[12px] text-[#888]">
                      {report.lastRunAt
                        ? new Date(report.lastRunAt).toLocaleDateString('tr-TR')
                        : '-'}
                    </span>

                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleRun(report.reportType)}
                        className="flex items-center gap-1 rounded-md bg-[#059669] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#047857]"
                        title="Calistir (CSV indir)"
                      >
                        <Play className="h-3 w-3" /> Calistir
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        disabled={deleting === report.id}
                        className="flex items-center gap-1 rounded-md border border-[#EDEDED] px-2 py-1 text-[11px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-50"
                        title="Sil"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Report Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border border-[#EDEDED] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-[#0A0A0A]">Yeni Rapor Olustur</h3>
              <button
                onClick={() => setShowModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[#F5F5F5]"
              >
                <X className="h-4 w-4 text-[#888]" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Name */}
              <div>
                <label className="text-[12px] font-medium text-[#525252]">Rapor Adi</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Orn: Haftalik Tukenmislik Raporu"
                  className="mt-1 w-full rounded-lg border border-[#EDEDED] px-3 py-2 text-[13px] text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-[12px] font-medium text-[#525252]">Rapor Turu</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#EDEDED] px-3 py-2 text-[13px] text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                >
                  <option value="">Tur secin...</option>
                  <option value="burnout_weekly">Tukenmislik Raporu</option>
                  <option value="performance_monthly">Performans Ozeti</option>
                  <option value="compensation_equity">Ucret Adaleti</option>
                  <option value="engagement_summary">Calisan Bagliligi</option>
                  <option value="okr_progress">OKR Ilerleme</option>
                  <option value="training_roi">Egitim ROI</option>
                </select>
              </div>

              {/* Schedule */}
              <div>
                <label className="text-[12px] font-medium text-[#525252]">Zamanlama</label>
                <div className="mt-1.5 flex gap-2">
                  {([
                    { key: 'none', label: 'Manuel' },
                    { key: 'daily', label: 'Gunluk' },
                    { key: 'weekly', label: 'Haftalik' },
                    { key: 'monthly', label: 'Aylik' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFormSchedule(key)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        formSchedule === key
                          ? 'border-[#5E5CE6] bg-[#EDEDFC] text-[#5E5CE6]'
                          : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
                      }`}
                    >
                      <Calendar className="h-3 w-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-[#EDEDED] px-4 py-2 text-[12px] font-medium text-[#525252] hover:bg-[#FAFAFA]"
              >
                Iptal
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formName.trim() || !formType}
                className="rounded-lg bg-[#5E5CE6] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#4B49B6] disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : 'Olustur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
