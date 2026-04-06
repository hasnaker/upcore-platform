'use client';

import { useState } from 'react';
import { Check, Clock, SkipForward, Circle, ChevronDown, ChevronUp } from 'lucide-react';

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

interface PlanCardProps {
  plan: OnboardingPlan;
  onTaskToggle: (taskId: string, currentStatus: string) => void;
}

const PHASES = [
  { key: 'day_1', label: '1. Gun' },
  { key: 'week_1', label: '1. Hafta' },
  { key: 'day_30', label: '30. Gun' },
  { key: 'day_60', label: '60. Gun' },
  { key: 'day_90', label: '90. Gun' },
];

const getStatusDot = (status: string): string => {
  switch (status) {
    case 'completed': return 'bg-[#10B981]';
    case 'in_progress': return 'bg-[#5E5CE6]';
    case 'skipped': return 'bg-[#F59E0B]';
    default: return 'bg-[#D4D4D4]';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <Check className="h-3.5 w-3.5 text-[#10B981]" />;
    case 'in_progress': return <Clock className="h-3.5 w-3.5 text-[#5E5CE6]" />;
    case 'skipped': return <SkipForward className="h-3.5 w-3.5 text-[#F59E0B]" />;
    default: return <Circle className="h-3.5 w-3.5 text-[#D4D4D4]" />;
  }
};

export const PlanCard = ({ plan, onTaskToggle }: PlanCardProps) => {
  const [expanded, setExpanded] = useState(false);

  // Group tasks by phase
  const tasksByPhase = new Map<string, OnboardingTask[]>();
  for (const task of plan.tasks) {
    const phase = task.phase || 'day_1';
    if (!tasksByPhase.has(phase)) tasksByPhase.set(phase, []);
    tasksByPhase.get(phase)!.push(task);
  }

  // Compute phase statuses for the timeline
  const phaseStatuses = PHASES.map((phase) => {
    const phaseTasks = tasksByPhase.get(phase.key) || [];
    if (phaseTasks.length === 0) return 'pending';
    const allCompleted = phaseTasks.every((t) => t.status === 'completed');
    const anyInProgress = phaseTasks.some((t) => t.status === 'in_progress');
    if (allCompleted) return 'completed';
    if (anyInProgress) return 'in_progress';
    return 'pending';
  });

  return (
    <div className="overflow-hidden rounded-xl border border-[#EDEDED] bg-white transition-shadow hover:shadow-sm">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 p-5 text-left"
      >
        {/* Avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-sm font-medium text-[#5E5CE6]">
          {plan.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>

        {/* Name + department */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#0A0A0A] truncate">{plan.name}</p>
          <p className="text-xs text-[#A3A3A3]">
            {plan.department} &middot; Baslangic: {new Date(plan.startDate).toLocaleDateString('tr-TR')}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-semibold text-[#0A0A0A]">%{plan.completionRate}</span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#F5F5F5]">
              <div
                className="h-full rounded-full bg-[#5E5CE6] transition-all"
                style={{ width: `${plan.completionRate}%` }}
              />
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[#A3A3A3]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#A3A3A3]" />
          )}
        </div>
      </button>

      {/* 5-Phase Timeline */}
      <div className="border-t border-[#EDEDED] px-5 py-3">
        <div className="flex items-center justify-between">
          {PHASES.map((phase, i) => (
            <div key={phase.key} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={`h-3 w-3 rounded-full ${getStatusDot(phaseStatuses[i] ?? 'pending')}`} />
                <span className="text-[10px] text-[#A3A3A3]">{phase.label}</span>
              </div>
              {i < PHASES.length - 1 && (
                <div className="mx-2 h-0.5 w-8 bg-[#EDEDED] sm:w-12 lg:w-16" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Expanded task list */}
      {expanded && (
        <div className="border-t border-[#EDEDED] bg-[#FAFAFA]">
          {PHASES.map((phase) => {
            const phaseTasks = tasksByPhase.get(phase.key) || [];
            if (phaseTasks.length === 0) return null;

            return (
              <div key={phase.key} className="border-b border-[#EDEDED] last:border-b-0">
                <div className="px-5 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                    {phase.label}
                  </span>
                </div>
                {phaseTasks.map((task) => (
                  <div
                    key={task.taskId}
                    className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#F0F0F0]"
                  >
                    <button
                      type="button"
                      onClick={() => onTaskToggle(task.taskId, task.status)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#D4D4D4] transition-colors hover:border-[#5E5CE6]"
                    >
                      {task.status === 'completed' && (
                        <Check className="h-3 w-3 text-[#10B981]" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${task.status === 'completed' ? 'text-[#A3A3A3] line-through' : 'text-[#525252]'}`}>
                        {task.title}
                      </p>
                      {task.assigneeRole && (
                        <span className="text-[11px] text-[#A3A3A3]">{task.assigneeRole}</span>
                      )}
                    </div>
                    <div className="shrink-0">
                      {getStatusIcon(task.status)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
