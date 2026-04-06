'use client';

import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { PlanCard } from './PlanCard';
import { NewOnboardingModal } from './NewOnboardingModal';
import { OnboardingSummary } from './OnboardingSummary';

interface OnboardingTask {
  taskId: string;
  title: string;
  phase: string;
  assigneeRole: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
}

interface OnboardingPlan {
  planId: string;
  employeeId: string;
  name: string;
  department: string;
  startDate: string;
  planStatus: string;
  tasks: OnboardingTask[];
  completionRate: number;
}

interface OnboardingData {
  plans: OnboardingPlan[];
  summary: {
    activeCount: number;
    completionRate: number;
    overdueTasks: number;
  };
}

interface OnboardingPlanListProps {
  initialData: OnboardingData;
}

export const OnboardingPlanList = ({ initialData }: OnboardingPlanListProps) => {
  const [data, setData] = useState<OnboardingData>(initialData);
  const [modalOpen, setModalOpen] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding', { cache: 'no-store' });
      if (res.ok) {
        const newData = await res.json();
        setData(newData);
      }
    } catch {
      // Silently fail on refresh
    }
  }, []);

  const handleTaskToggle = useCallback(async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';

    try {
      const res = await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus }),
      });

      if (res.ok) {
        await refreshData();
      }
    } catch {
      // Silently fail on toggle
    }
  }, [refreshData]);

  const handleCreatePlan = useCallback(async (planData: {
    employeeId: string;
    startDate: string;
    tasks: Array<{ title: string; phase: string; assigneeRole: string }>;
  }) => {
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      });

      if (res.ok) {
        await refreshData();
      }
    } catch {
      // Silently fail on create
    }
  }, [refreshData]);

  return (
    <div className="flex flex-col gap-8">
      {/* Summary cards */}
      <OnboardingSummary
        activeCount={data.summary.activeCount}
        completionRate={data.summary.completionRate}
        overdueTasks={data.summary.overdueTasks}
      />

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#0A0A0A]">
          Onboarding Planlari ({data.plans.length})
        </h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#5E5CE6] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#4B49BF]"
        >
          <Plus className="h-3.5 w-3.5" />
          Yeni Onboarding
        </button>
      </div>

      {/* Plan cards */}
      {data.plans.length > 0 ? (
        <div className="flex flex-col gap-4">
          {data.plans.map((plan) => (
            <PlanCard
              key={plan.planId}
              plan={plan}
              onTaskToggle={handleTaskToggle}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#EDEDED] bg-white py-16 text-center">
          <p className="text-sm text-[#737373]">Henuz onboarding plani bulunmuyor.</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#5E5CE6] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#4B49BF]"
          >
            <Plus className="h-3.5 w-3.5" />
            Ilk Plani Olustur
          </button>
        </div>
      )}

      {/* Modal */}
      <NewOnboardingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreatePlan}
      />
    </div>
  );
};
