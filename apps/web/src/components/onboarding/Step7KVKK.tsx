'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveStep } from '@/app/onboarding/actions';
import type { KVKKData, OnboardingDraft } from '@/app/onboarding/draft';

interface Step7KVKKProps {
  draft: OnboardingDraft | null;
  nextSlug: string | null;
}

const NOTICE_VERSION = '2025.01';

export function Step7KVKK({ draft, nextSlug }: Step7KVKKProps) {
  const router = useRouter();
  const existing = draft?.data.kvkk;
  const [employeeNotice, setEmployeeNotice] = useState(existing?.employee_notice_version ?? NOTICE_VERSION);
  const [candidateNotice, setCandidateNotice] = useState(existing?.candidate_notice_version ?? NOTICE_VERSION);
  const [visitorNotice, setVisitorNotice] = useState(existing?.visitor_notice_version ?? NOTICE_VERSION);
  const [dpoName, setDpoName] = useState(existing?.dpo_name ?? '');
  const [dpoEmail, setDpoEmail] = useState(existing?.dpo_email ?? '');
  const [dpoPhone, setDpoPhone] = useState(existing?.dpo_phone ?? '');
  const [verbis, setVerbis] = useState(existing?.verbis_ack ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const onSave = () => {
    setError(null);
    if (!dpoName.trim() || !dpoEmail.trim()) {
      setError('Veri Sorumlusu (DPO) ad ve e-posta zorunlu.');
      return;
    }
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(dpoEmail.trim())) {
      setError('Geçerli bir DPO e-postası girin.');
      return;
    }
    if (!verbis) {
      setError('VERBIS kayıt yükümlülüğünü kabul etmelisiniz.');
      return;
    }
    const kvkk: KVKKData = {
      employee_notice_version: employeeNotice,
      candidate_notice_version: candidateNotice,
      visitor_notice_version: visitorNotice,
      dpo_name: dpoName.trim(),
      dpo_email: dpoEmail.trim().toLowerCase(),
      verbis_ack: verbis,
      ...(dpoPhone.trim() ? { dpo_phone: dpoPhone.trim() } : {}),
    };
    start(async () => {
      const res = await saveStep(7, { kvkk });
      if (!res.ok) {
        setError(res.error ?? 'Kaydedilemedi.');
        return;
      }
      if (nextSlug) router.push(`/onboarding/${nextSlug}`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-line bg-bg-2 p-4 text-sm text-ink-60">
        <p className="font-medium text-ink">3 aydınlatma metni versiyonu</p>
        <p className="mt-1 text-xs">
          Upcore, KVKK Madde 10 gereği çalışan, aday ve ziyaretçi için ayrı metin şablonları sağlar. Commit sonrasında KVKK modülünden düzenleyebilirsiniz.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { key: 'employee', label: 'Çalışan Aydınlatma Metni', value: employeeNotice, setter: setEmployeeNotice },
          { key: 'candidate', label: 'Aday Aydınlatma Metni', value: candidateNotice, setter: setCandidateNotice },
          { key: 'visitor', label: 'Ziyaretçi Aydınlatma Metni', value: visitorNotice, setter: setVisitorNotice },
        ].map((notice) => (
          <div key={notice.key} className="rounded-md border border-line bg-bg p-3">
            <label className="mb-1 block text-xs font-medium uppercase text-ink-60">{notice.label}</label>
            <input
              value={notice.value}
              onChange={(e) => notice.setter(e.target.value)}
              className="w-full rounded-md border border-line bg-bg px-2 py-1 text-sm"
              placeholder="2025.01"
            />
            <p className="mt-1 text-xs text-ink-60">Versiyon etiketi (ör. 2025.01, v2)</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Veri Sorumlusu (DPO) Adı</label>
          <input
            value={dpoName}
            onChange={(e) => setDpoName(e.target.value)}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">DPO E-postası</label>
          <input
            type="email"
            value={dpoEmail}
            onChange={(e) => setDpoEmail(e.target.value)}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">DPO Telefon (opsiyonel)</label>
        <input
          value={dpoPhone}
          onChange={(e) => setDpoPhone(e.target.value)}
          className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-bg p-4 text-sm">
        <input
          type="checkbox"
          checked={verbis}
          onChange={(e) => setVerbis(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span className="flex-1">
          <span className="block font-medium text-ink">VERBIS kaydını tamamladım veya 30 gün içinde tamamlayacağım</span>
          <span className="block text-xs text-ink-60">
            50+ çalışan veya 25 M TL+ ciro eşiğini aşıyorsanız yasal yükümlülüktür. Upcore size VERBIS kayıt asistanı sağlar.
          </span>
        </span>
      </label>

      {error && (
        <div className="rounded-md border border-red-soft bg-red-soft/40 p-3 text-sm text-red">{error}</div>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={isPending}
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-bg hover:bg-accent/90 disabled:opacity-60"
      >
        {isPending ? 'Kaydediliyor…' : 'Kaydet ve devam et'}
      </button>
    </div>
  );
}
