import { BurnoutHeatmap } from './_components/BurnoutHeatmap';
import { BurnoutSidebar } from './_components/BurnoutSidebar';
import { CriticalEmployees } from './_components/CriticalEmployees';
import { DepartmentTrendChart } from './_components/DepartmentTrendChart';
import { TransparencyNote } from './_components/TransparencyNote';

// Fetch REAL burnout data from API
async function getBurnoutData() {
  try {
    const res = await fetch('http://localhost:3000/api/burnout/heatmap', { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default async function TukenmislikPage() {
  const data = await getBurnoutData();

  return (
    <div className="flex flex-col gap-12">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          Tukenmislik Izleme
        </h1>
        <p className="mt-1 text-sm text-[#525252]">
          BAT-12-TR olcumleri, departman bazli isi haritasi ve erken uyari sinyalleri.
        </p>
      </div>

      {/* Heatmap + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <BurnoutHeatmap apiData={data} />
        <BurnoutSidebar apiData={data} />
      </div>

      {/* 30-day Trend Chart */}
      <DepartmentTrendChart apiData={data} />

      {/* Critical employees */}
      <CriticalEmployees apiData={data} />

      {/* Transparency note */}
      <TransparencyNote />
    </div>
  );
}
