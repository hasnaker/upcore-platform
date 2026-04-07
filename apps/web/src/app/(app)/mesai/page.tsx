'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Users, TrendingUp, AlertTriangle, CheckCircle, XCircle, Timer, CalendarDays } from 'lucide-react';

/* ─── Types ─── */

interface TimeEntry {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  clockIn: string | null;
  clockOut: string | null;
  workHours: number | null;
  overtimeHours: number;
  status: string;
  approved: boolean;
}

interface WeeklySummary {
  employeeId: string;
  name: string;
  days: Record<string, number>;
  totalHours: number;
  overtimeHours: number;
}

interface ShiftDefinition {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isDefault: boolean;
}

interface MesaiStats {
  presentToday: number;
  absentToday: number;
  avgHoursToday: number;
  weeklyOvertimeTotal: number;
  totalEmployees: number;
}

/* ─── Helpers ─── */

const formatTime = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  on_time: { label: 'Zamaninda', color: 'text-[#16A34A]', bg: 'bg-[#DCFCE7]' },
  late: { label: 'Gec', color: 'text-[#EA580C]', bg: 'bg-[#FFF7ED]' },
  absent: { label: 'Devamsiz', color: 'text-[#DC2626]', bg: 'bg-[#FEE2E2]' },
  present: { label: 'Mevcut', color: 'text-[#16A34A]', bg: 'bg-[#DCFCE7]' },
};

/* ─── Component ─── */

export default function MesaiPage() {
  const [today, setToday] = useState<TimeEntry[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary[]>([]);
  const [shifts, setShifts] = useState<ShiftDefinition[]>([]);
  const [stats, setStats] = useState<MesaiStats | null>(null);
  const [tab, setTab] = useState<'today' | 'weekly' | 'shifts'>('today');
  const [clockLoading, setClockLoading] = useState(false);
  const [clockMessage, setClockMessage] = useState('');

  const fetchData = useCallback(() => {
    fetch('/api/mesai')
      .then((r) => r.json())
      .then((data) => {
        if (data.today) setToday(data.today);
        if (data.weeklySummary) setWeeklySummary(data.weeklySummary);
        if (data.shifts) setShifts(data.shifts);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* Clock in/out demo */
  const handleClock = async (action: 'clock_in' | 'clock_out') => {
    setClockLoading(true);
    setClockMessage('');
    try {
      // Use first employee from today's list, or a placeholder
      const employeeId = today[0]?.employeeId || '00000000-0000-0000-0000-000000000001';
      const res = await fetch('/api/mesai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, action }),
      });
      const data = await res.json();
      setClockMessage(data.message || data.error || 'Islem tamamlandi');
      fetchData();
    } catch {
      setClockMessage('Islem basarisiz oldu');
    } finally {
      setClockLoading(false);
    }
  };

  const weekDays = getWeekDates();

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Mesai & Devam Takibi</h1>
          <p className="mt-1 text-sm text-[#737373]">
            Gunluk devam durumu, mesai saatleri ve vardiya yonetimi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleClock('clock_in')}
            disabled={clockLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#15803D] disabled:opacity-50"
          >
            <Clock className="h-4 w-4" />
            Giris Yap
          </button>
          <button
            type="button"
            onClick={() => handleClock('clock_out')}
            disabled={clockLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-50"
          >
            <Clock className="h-4 w-4" />
            Cikis Yap
          </button>
        </div>
      </div>

      {/* Clock message */}
      {clockMessage && (
        <div className="rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3 text-sm text-[#525252]">
          {clockMessage}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Users className="h-5 w-5 text-[#16A34A]" />}
          label="Bugun Gelen"
          value={stats?.presentToday ?? 0}
          subtitle={`/ ${stats?.totalEmployees ?? 0} calisan`}
          bgColor="bg-[#DCFCE7]"
        />
        <SummaryCard
          icon={<Timer className="h-5 w-5 text-[#5E5CE6]" />}
          label="Ortalama Mesai Saati"
          value={stats?.avgHoursToday ?? 0}
          subtitle="saat (bugun)"
          bgColor="bg-[#EEF2FF]"
        />
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5 text-[#EA580C]" />}
          label="Fazla Mesai (Hafta)"
          value={stats?.weeklyOvertimeTotal ?? 0}
          subtitle="saat toplam"
          bgColor="bg-[#FFF7ED]"
        />
        <SummaryCard
          icon={<AlertTriangle className="h-5 w-5 text-[#DC2626]" />}
          label="Devamsizlik"
          value={stats?.absentToday ?? 0}
          subtitle="calisan (bugun)"
          bgColor="bg-[#FEE2E2]"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#EDEDED]">
        {[
          { key: 'today' as const, label: 'Gunluk Devam', icon: <CalendarDays className="h-4 w-4" /> },
          { key: 'weekly' as const, label: 'Haftalik Ozet', icon: <TrendingUp className="h-4 w-4" /> },
          { key: 'shifts' as const, label: 'Vardiya Tanimlari', icon: <Clock className="h-4 w-4" /> },
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

      {/* Tab Content */}
      {tab === 'today' && (
        <div className="overflow-hidden rounded-lg border border-[#EDEDED] bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EDEDED] bg-[#FAFAFA]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Calisan</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Departman</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Giris</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Cikis</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Saat</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Onay</th>
              </tr>
            </thead>
            <tbody>
              {today.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#737373]">
                    Bugun icin devam kaydi bulunamadi
                  </td>
                </tr>
              ) : (
                today.map((entry) => {
                  const fallback = { label: 'Mevcut', color: 'text-[#16A34A]', bg: 'bg-[#DCFCE7]' };
                  const cfg = statusConfig[entry.status] ?? fallback;
                  return (
                    <tr key={entry.id} className="border-b border-[#EDEDED] last:border-b-0 hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 text-sm font-medium text-[#0A0A0A]">{entry.name}</td>
                      <td className="px-4 py-3 text-sm text-[#525252]">{entry.department}</td>
                      <td className="px-4 py-3 text-sm text-[#525252]">{formatTime(entry.clockIn)}</td>
                      <td className="px-4 py-3 text-sm text-[#525252]">
                        {entry.clockOut ? formatTime(entry.clockOut) : (
                          <span className="text-[#EA580C]">Henuz cikmadi</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#525252]">
                        {entry.workHours !== null ? `${entry.workHours} sa` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {entry.approved ? (
                          <CheckCircle className="h-5 w-5 text-[#16A34A]" />
                        ) : (
                          <XCircle className="h-5 w-5 text-[#D4D4D4]" />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'weekly' && (
        <div className="overflow-hidden rounded-lg border border-[#EDEDED] bg-white">
          <div className="p-4">
            <h3 className="text-sm font-medium text-[#0A0A0A]">Haftalik Calisma Saatleri</h3>
            <p className="text-xs text-[#737373]">Bu haftanin calisan bazli saat dagilimi</p>
          </div>
          {weeklySummary.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-[#737373]">
              Bu hafta icin veri bulunamadi
            </div>
          ) : (
            <div className="space-y-3 p-4 pt-0">
              {weeklySummary.map((emp) => (
                <div key={emp.employeeId} className="rounded-lg border border-[#EDEDED] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-[#0A0A0A]">{emp.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#737373]">
                        Toplam: <span className="font-medium text-[#0A0A0A]">{emp.totalHours.toFixed(1)} sa</span>
                      </span>
                      {emp.overtimeHours > 0 && (
                        <span className="text-xs text-[#EA580C]">
                          +{emp.overtimeHours.toFixed(1)} FM
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Bar chart */}
                  <div className="flex items-end gap-1.5">
                    {weekDays.map((day) => {
                      const hours = emp.days[day] ?? 0;
                      const height = hours > 0 ? Math.max(8, (hours / 12) * 64) : 4;
                      const isOvertime = hours > 8;
                      return (
                        <div key={day} className="flex flex-1 flex-col items-center gap-1">
                          <span className="text-[10px] text-[#737373]">{hours > 0 ? `${hours.toFixed(1)}` : ''}</span>
                          <div
                            className={`w-full rounded-t ${isOvertime ? 'bg-[#EA580C]' : hours > 0 ? 'bg-[#5E5CE6]' : 'bg-[#EDEDED]'}`}
                            style={{ height: `${height}px` }}
                          />
                          <span className="text-[10px] text-[#737373]">
                            {getDayLabel(day)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'shifts' && (
        <div className="overflow-hidden rounded-lg border border-[#EDEDED] bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EDEDED] bg-[#FAFAFA]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Vardiya Adi</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Baslangic</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Bitis</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Mola (dk)</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Varsayilan</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-[#737373]">
                    Vardiya tanimi bulunamadi
                  </td>
                </tr>
              ) : (
                shifts.map((shift) => (
                  <tr key={shift.id} className="border-b border-[#EDEDED] last:border-b-0 hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 text-sm font-medium text-[#0A0A0A]">{shift.name}</td>
                    <td className="px-4 py-3 text-sm text-[#525252]">{shift.startTime}</td>
                    <td className="px-4 py-3 text-sm text-[#525252]">{shift.endTime}</td>
                    <td className="px-4 py-3 text-sm text-[#525252]">{shift.breakMinutes}</td>
                    <td className="px-4 py-3">
                      {shift.isDefault ? (
                        <CheckCircle className="h-5 w-5 text-[#16A34A]" />
                      ) : (
                        <span className="text-xs text-[#D4D4D4]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Summary Card ─── */

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle: string;
  bgColor: string;
}

const SummaryCard = ({ icon, label, value, subtitle, bgColor }: SummaryCardProps) => (
  <div className="rounded-lg border border-[#EDEDED] bg-white p-5">
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-[#737373]">{label}</p>
        <p className="text-xl font-semibold text-[#0A0A0A]">
          {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}
        </p>
        <p className="text-xs text-[#A3A3A3]">{subtitle}</p>
      </div>
    </div>
  </div>
);

/* ─── Date Helpers ─── */

function getWeekDates(): string[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const labels = ['Pz', 'Pt', 'Sa', 'Ca', 'Pe', 'Cu', 'Ct'];
  return labels[d.getDay()] ?? '';
}
