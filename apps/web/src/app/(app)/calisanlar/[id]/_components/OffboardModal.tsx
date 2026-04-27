'use client';

import { useState } from 'react';
import { AlertTriangle, Clock, Loader2, UserX, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type OffboardPayload = {
  termination_date: string;
  reason: string;
  departure_type: string;
  notice_date?: string;
  last_working_day?: string;
  handover_to_id?: string;
};

type OffboardResponse = {
  saga_id: string;
  status: string;
  current_step: number;
  total_steps: number;
};

export function OffboardModal({
  employeeId,
  employeeName,
  onClose,
}: {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [terminationDate, setTerminationDate] = useState(today);
  const [lastWorkingDay, setLastWorkingDay] = useState(today);
  const [noticeDate, setNoticeDate] = useState(today);
  const [departureType, setDepartureType] = useState('voluntary_resignation');
  const [reason, setReason] = useState('');
  const [handoverToId, setHandoverToId] = useState('');

  const trigger = useMutation<OffboardResponse, Error, OffboardPayload>({
    mutationFn: async (payload) => {
      const r = await fetch(`/api/employees/${employeeId}/offboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.message || body.error || `HTTP ${r.status}`);
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const canSubmit = reason.trim().length > 0 && terminationDate && lastWorkingDay;

  const submit = async () => {
    try {
      const res = await trigger.mutateAsync({
        termination_date: terminationDate,
        reason,
        departure_type: departureType,
        notice_date: noticeDate,
        last_working_day: lastWorkingDay,
        handover_to_id: handoverToId || undefined,
      });
      toast.success(
        res.status === 'completed'
          ? `Offboarding tamamlandı: ${res.current_step}/${res.total_steps} adım`
          : `Saga başlatıldı (${res.status})`,
      );
      onClose();
    } catch (err) {
      toast.error(`Offboarding başarısız: ${String(err)}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-[#EDEDED] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
              <UserX className="h-4 w-4 text-red-600" />
              İşten Ayrılış Sürecini Başlat
            </h3>
            <p className="text-[12px] text-[#737373]">
              Saga: terminate → career termination event → offboarding checklist
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#737373] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 rounded-md border border-[#EDEDED] bg-[#FAFAFA] p-3 text-[12px]">
          <p>
            <strong>Çalışan:</strong> {employeeName}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#737373]">{employeeId}</p>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Ayrılış Türü
            </span>
            <select
              value={departureType}
              onChange={(e) => setDepartureType(e.target.value)}
              className="w-full rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-sm"
            >
              <option value="voluntary_resignation">İstifa (gönüllü)</option>
              <option value="involuntary_termination">İş akdi feshi (işveren)</option>
              <option value="retirement">Emeklilik</option>
              <option value="end_of_contract">Sözleşme sonu</option>
              <option value="mutual_agreement">Karşılıklı anlaşma</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Gerekçe (zorunlu)
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Ör. Başka iş teklifi kabul edildi"
              className="w-full rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
                İhbar Tarihi
              </span>
              <input
                type="date"
                value={noticeDate}
                onChange={(e) => setNoticeDate(e.target.value)}
                className="w-full rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
                Son Çalışma Günü
              </span>
              <input
                type="date"
                value={lastWorkingDay}
                onChange={(e) => setLastWorkingDay(e.target.value)}
                className="w-full rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Fesih Tarihi
            </span>
            <input
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              className="w-full rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Devralacak Kişi UUID (opsiyonel)
            </span>
            <input
              value={handoverToId}
              onChange={(e) => setHandoverToId(e.target.value)}
              placeholder="Boş bırakılabilir"
              className="w-full rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 font-mono text-[12px]"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-md border border-amber/30 bg-amber-soft p-2 text-[11px] text-amber">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Bu işlem çalışanı pasife alır + kariyer kaydı açar + çıkış checklist'i başlatır. Hata
          durumunda otomatik geri alınır.
        </div>

        {trigger.error ? (
          <p className="mt-3 text-xs text-red-600">{trigger.error.message}</p>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#EDEDED] bg-white px-3 py-2 text-sm font-medium text-[#525252] hover:bg-[#FAFAFA]"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || trigger.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {trigger.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            Saga'yı Başlat
          </button>
        </div>
      </div>
    </div>
  );
}
