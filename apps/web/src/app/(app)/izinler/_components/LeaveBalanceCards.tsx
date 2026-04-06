'use client';

import { Sun, Heart, CalendarDays, Infinity } from 'lucide-react';

interface LeaveBalance {
  type: string;
  label: string;
  entitled: number | null;
  used: number;
  remaining: number | null;
  icon: React.ReactNode;
  color: string;
}

// Static data — will be replaced with API call when services are connected
const balances: LeaveBalance[] = [
  { type: 'YILLIK', label: 'Yillik Izin', entitled: 20, used: 6, remaining: 14, icon: <Sun className="h-5 w-5" />, color: '#F59E0B' },
  { type: 'MAZERET', label: 'Mazeret Izni', entitled: 10, used: 2, remaining: 8, icon: <CalendarDays className="h-5 w-5" />, color: '#5E5CE6' },
  { type: 'HASTALIK', label: 'Hastalik Izni', entitled: null, used: 3, remaining: null, icon: <Heart className="h-5 w-5" />, color: '#10B981' },
];

export const LeaveBalanceCards = () => {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {balances.map((balance) => {
        const progressPercent = balance.entitled
          ? Math.round(((balance.entitled - (balance.remaining ?? 0)) / balance.entitled) * 100)
          : 0;

        return (
          <div
            key={balance.type}
            className="rounded-lg border border-[#EDEDED] bg-white p-5"
          >
            <div className="flex items-start justify-between">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${balance.color}12`, color: balance.color }}
              >
                {balance.icon}
              </div>
              <span className="text-[12px] font-medium text-[#888]">{balance.label}</span>
            </div>

            <div className="mt-4">
              {balance.remaining !== null ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-[28px] font-semibold leading-none tabular-nums text-[#0A0A0A]">
                    {balance.remaining}
                  </span>
                  <span className="text-[14px] text-[#888]">gun kalan</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Infinity className="h-6 w-6 text-[#0A0A0A]" />
                  <span className="text-[14px] text-[#888]">sinirsiz</span>
                </div>
              )}
            </div>

            {balance.entitled !== null && (
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-[#888]">
                  <span>{balance.used} gun kullanildi</span>
                  <span>{balance.entitled} gun toplam</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${progressPercent}%`, backgroundColor: balance.color }}
                  />
                </div>
              </div>
            )}

            {balance.entitled === null && (
              <p className="mt-3 text-[11px] text-[#888]">
                Bu donem {balance.used} gun kullanildi
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
