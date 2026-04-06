import { SummaryCards } from './_components/SummaryCards';
import { PredictionTabs } from './_components/PredictionTabs';

async function getPredictionData() {
  try {
    const res = await fetch('http://localhost:3000/api/predictions', { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function TahminlerPage() {
  const data = await getPredictionData();

  const summary = data?.summary ?? {
    attritionRisk: { high: 0, medium: 0, low: 0 },
    avgPerformancePrediction: 0,
    burnoutRiskCount: 0,
    promotionReady: 0,
  };

  const predictions = data?.predictions ?? [];

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          AI Tahminleri
        </h1>
        <p className="mt-1 text-sm text-[#525252]">
          Yapay zeka destekli calisan tahminleri, risk analizleri ve aksiyon onerileri.
        </p>
      </div>

      {/* Summary cards */}
      <SummaryCards summary={summary} />

      {/* Prediction tabs */}
      <PredictionTabs predictions={predictions} />
    </div>
  );
}
