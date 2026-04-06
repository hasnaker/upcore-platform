'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface NewOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    employeeId: string;
    startDate: string;
    tasks: Array<{ title: string; phase: string; assigneeRole: string }>;
  }) => void;
}

const PHASE_OPTIONS = [
  { value: 'day_1', label: '1. Gun' },
  { value: 'week_1', label: '1. Hafta' },
  { value: 'day_30', label: '30. Gun' },
  { value: 'day_60', label: '60. Gun' },
  { value: 'day_90', label: '90. Gun' },
];

export const NewOnboardingModal = ({ open, onClose, onSubmit }: NewOnboardingModalProps) => {
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [tasks, setTasks] = useState<Array<{ title: string; phase: string; assigneeRole: string }>>([
    { title: '', phase: 'day_1', assigneeRole: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addTask = () => {
    setTasks([...tasks, { title: '', phase: 'day_1', assigneeRole: '' }]);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: 'title' | 'phase' | 'assigneeRole', value: string) => {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { title: field === 'title' ? value : t.title, phase: field === 'phase' ? value : t.phase, assigneeRole: field === 'assigneeRole' ? value : t.assigneeRole } : t))
    );
  };

  const handleSubmit = async () => {
    if (!employeeId || !startDate) return;
    setSubmitting(true);
    const validTasks = tasks.filter((t) => t.title.trim() !== '');
    await onSubmit({ employeeId, startDate, tasks: validTasks });
    setSubmitting(false);
    setEmployeeId('');
    setStartDate('');
    setTasks([{ title: '', phase: 'day_1', assigneeRole: '' }]);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-[#EDEDED] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
          <h3 className="text-base font-semibold text-[#0A0A0A]">Yeni Onboarding Plani</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#A3A3A3] transition-colors hover:bg-[#F5F5F5] hover:text-[#525252]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-4">
            {/* Employee ID */}
            <div>
              <label className="text-xs font-medium text-[#525252]">Calisan ID</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Calisan UUID"
                className="mt-1 w-full rounded-lg border border-[#EDEDED] px-3 py-2 text-sm text-[#0A0A0A] outline-none transition-colors focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/20"
              />
            </div>

            {/* Start date */}
            <div>
              <label className="text-xs font-medium text-[#525252]">Baslangic Tarihi</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#EDEDED] px-3 py-2 text-sm text-[#0A0A0A] outline-none transition-colors focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/20"
              />
            </div>

            {/* Tasks */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#525252]">Gorevler</label>
                <button
                  type="button"
                  onClick={addTask}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#5E5CE6] transition-colors hover:text-[#4B49BF]"
                >
                  <Plus className="h-3 w-3" />
                  Gorev Ekle
                </button>
              </div>

              <div className="mt-2 flex flex-col gap-3">
                {tasks.map((task, index) => (
                  <div key={index} className="rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => updateTask(index, 'title', e.target.value)}
                          placeholder="Gorev basligi"
                          className="w-full rounded-md border border-[#EDEDED] bg-white px-2.5 py-1.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6]"
                        />
                        <div className="flex gap-2">
                          <select
                            value={task.phase}
                            onChange={(e) => updateTask(index, 'phase', e.target.value)}
                            className="flex-1 rounded-md border border-[#EDEDED] bg-white px-2.5 py-1.5 text-xs text-[#525252] outline-none focus:border-[#5E5CE6]"
                          >
                            {PHASE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={task.assigneeRole}
                            onChange={(e) => updateTask(index, 'assigneeRole', e.target.value)}
                            placeholder="Sorumluluk rolu"
                            className="flex-1 rounded-md border border-[#EDEDED] bg-white px-2.5 py-1.5 text-xs text-[#525252] outline-none focus:border-[#5E5CE6]"
                          />
                        </div>
                      </div>
                      {tasks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTask(index)}
                          className="mt-1 rounded-md p-1 text-[#A3A3A3] transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#EDEDED] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#EDEDED] px-4 py-2 text-sm font-medium text-[#525252] transition-colors hover:bg-[#FAFAFA]"
          >
            Iptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!employeeId || !startDate || submitting}
            className="rounded-lg bg-[#5E5CE6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B49BF] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Olusturuluyor...' : 'Olustur'}
          </button>
        </div>
      </div>
    </div>
  );
};
