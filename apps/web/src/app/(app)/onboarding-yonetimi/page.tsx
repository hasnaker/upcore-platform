import { OnboardingPlanList } from './_components/OnboardingPlanList';

async function getOnboardingData() {
  try {
    const res = await fetch('http://localhost:3000/api/onboarding', { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function OnboardingYonetimiPage() {
  const data = await getOnboardingData();

  const initialData = data ?? {
    plans: [],
    summary: {
      activeCount: 0,
      completionRate: 0,
      overdueTasks: 0,
    },
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          Onboarding Yonetimi
        </h1>
        <p className="mt-1 text-sm text-[#525252]">
          Yeni calisan uyum surecleri, gorev takibi ve ilerleme durumu.
        </p>
      </div>

      {/* Main content */}
      <OnboardingPlanList initialData={initialData} />
    </div>
  );
}
