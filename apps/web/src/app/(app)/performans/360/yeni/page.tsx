'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Send,
  Shield,
  Users,
} from 'lucide-react';

import { useAuthMe } from '@/hooks/useAuthMe';
import { useEmployees } from '@/hooks/useEmployees';
import {
  useCreate360Campaign,
  useAddInvitation,
  useDistributeCampaign,
  usePerformanceCycles,
  type AnonymityMode,
  type PerformanceCycle,
  type Relation,
  type Survey360Campaign,
} from '@/hooks/usePerformance';
import type { EmployeeView } from '@/lib/employee-mapper';

/* ─────────────────────────────────────────────────────────────
 * 4-Adım 360° Geri Bildirim Wizard
 *   1. Konu
 *   2. Katılımcılar (peer min 3, manager, direct reports, self opt-in)
 *   3. Anonim mod (anonymous vs named + KVKK)
 *   4. Gözden geçir + gönder
 * ───────────────────────────────────────────────────────────── */

type Step = 1 | 2 | 3 | 4;

interface Participant {
  id: string;
  name: string;
  relation: Relation;
}

interface WizardState {
  subjectId: string;
  cycleId: string;
  anonymityMode: AnonymityMode;
  dueDate: string;
  selfReview: boolean;
  peers: Participant[];
  manager: Participant | null;
  directReports: Participant[];
}

export default function Yeni360Page() {
  const router = useRouter();
  const me = useAuthMe();
  const cyclesQ = usePerformanceCycles('active');
  const employeesQ = useEmployees({ limit: 100 });
  const create = useCreate360Campaign();

  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState('');
  const [state, setState] = useState<WizardState>(() => ({
    subjectId: '',
    cycleId: '',
    anonymityMode: 'anonymous',
    dueDate: defaultDueDate(),
    selfReview: false,
    peers: [],
    manager: null,
    directReports: [],
  }));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdCampaign, setCreatedCampaign] = useState<Survey360Campaign | null>(null);

  const allEmployees = useMemo(() => employeesQ.data?.items ?? [], [employeesQ.data?.items]);
  const cycles = useMemo(
    () => (cyclesQ.data?.items ?? []) as PerformanceCycle[],
    [cyclesQ.data?.items],
  );

  // Auto-select the first active cycle once it is loaded.
  useEffect(() => {
    const first = cycles[0];
    if (!state.cycleId && first) {
      setState((s) => ({ ...s, cycleId: first.id }));
    }
  }, [cycles, state.cycleId]);

  const subject = useMemo(
    () => allEmployees.find((e) => e.id === state.subjectId) ?? null,
    [allEmployees, state.subjectId],
  );

  const filteredEmployees = useMemo(() => {
    const base = allEmployees.filter((e) => e.id !== state.subjectId);
    if (!search.trim()) return base.slice(0, 25);
    const s = search.toLowerCase();
    return base
      .filter(
        (e) =>
          `${e.ad} ${e.soyad}`.toLowerCase().includes(s) || e.email.toLowerCase().includes(s),
      )
      .slice(0, 25);
  }, [allEmployees, search, state.subjectId]);

  const stepValidation: Record<Step, { valid: boolean; message: string }> = {
    1: {
      valid: Boolean(state.subjectId && state.cycleId),
      message: !state.subjectId
        ? 'Konu seçilmeli'
        : !state.cycleId
        ? 'Aktif dönem bulunmalı'
        : '',
    },
    2: {
      valid: state.peers.length >= 3 && state.manager !== null,
      message:
        state.peers.length < 3
          ? `En az 3 akran gerekli (şu an ${state.peers.length})`
          : !state.manager
          ? 'Yönetici seçilmeli'
          : '',
    },
    3: { valid: true, message: '' },
    4: { valid: Boolean(state.dueDate), message: !state.dueDate ? 'Son tarih gerekli' : '' },
  };

  const canGoNext = stepValidation[step].valid;

  const next = () => {
    if (canGoNext && step < 4) setStep((step + 1) as Step);
  };
  const prev = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const togglePeer = (e: EmployeeView) => {
    setState((s) => {
      const exists = s.peers.find((p) => p.id === e.id);
      const next = exists
        ? s.peers.filter((p) => p.id !== e.id)
        : [...s.peers, { id: e.id, name: `${e.ad} ${e.soyad}`, relation: 'peer' as Relation }];
      return { ...s, peers: next };
    });
  };
  const toggleDR = (e: EmployeeView) => {
    setState((s) => {
      const exists = s.directReports.find((p) => p.id === e.id);
      const next = exists
        ? s.directReports.filter((p) => p.id !== e.id)
        : [
            ...s.directReports,
            { id: e.id, name: `${e.ad} ${e.soyad}`, relation: 'direct_report' as Relation },
          ];
      return { ...s, directReports: next };
    });
  };
  const setManagerChoice = (e: EmployeeView) => {
    setState((s) => ({
      ...s,
      manager: { id: e.id, name: `${e.ad} ${e.soyad}`, relation: 'manager' },
    }));
  };

  const invites = useMemo<{ reviewer_user_id: string; relation: Relation }[]>(() => {
    const list: { reviewer_user_id: string; relation: Relation }[] = [];
    if (state.manager) list.push({ reviewer_user_id: state.manager.id, relation: 'manager' });
    for (const p of state.peers) list.push({ reviewer_user_id: p.id, relation: 'peer' });
    for (const d of state.directReports)
      list.push({ reviewer_user_id: d.id, relation: 'direct_report' });
    if (state.selfReview && state.subjectId)
      list.push({ reviewer_user_id: state.subjectId, relation: 'self' });
    return list;
  }, [state]);

  const handleCreate = async () => {
    setSubmitError(null);
    if (!me.data || !state.cycleId || !state.subjectId || !state.manager) {
      setSubmitError('Eksik bilgi var, adımları kontrol edin.');
      return;
    }
    try {
      const campaign = await create.mutateAsync({
        cycle_id: state.cycleId,
        subject_user_id: state.subjectId,
        anonymity_mode: state.anonymityMode,
        due_date: state.dueDate,
      });
      setCreatedCampaign(campaign);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Kampanya oluşturulamadı.');
    }
  };

  const stepLabel: Record<Step, string> = {
    1: 'Konu',
    2: 'Katılımcılar',
    3: 'Anonim Mod',
    4: 'Gözden Geçir',
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6" data-testid="s360-wizard">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          Yeni 360° Geri Bildirim
        </h1>
        <p className="text-sm text-[#525252]">
          4 adımda kampanya oluştur: konu, katılımcılar, anonim mod, gönderim.
        </p>
      </header>

      <ol className="flex items-center gap-2" aria-label="Aşamalar">
        {([1, 2, 3, 4] as Step[]).map((s) => {
          const active = step === s;
          const complete = step > s;
          return (
            <li
              key={s}
              className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                active
                  ? 'border-[#5E5CE6] bg-[#eef0ff] text-[#0A0A0A]'
                  : complete
                  ? 'border-[#059669] bg-[#ecfdf5] text-[#065f46]'
                  : 'border-[#e5e5e5] bg-white text-[#737373]'
              }`}
              aria-current={active ? 'step' : undefined}
              data-testid={`s360-step-${s}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  complete
                    ? 'bg-[#059669] text-white'
                    : active
                    ? 'bg-[#5E5CE6] text-white'
                    : 'bg-[#f5f5f5]'
                }`}
              >
                {complete ? <Check className="h-3 w-3" /> : s}
              </span>
              <span className="truncate">{stepLabel[s]}</span>
            </li>
          );
        })}
      </ol>

      <section className="rounded-xl border border-[#f0f0f0] bg-white p-6">
        {step === 1 && (
          <StepSubject
            cycles={cycles}
            cycleId={state.cycleId}
            onCycleChange={(v) => setState((s) => ({ ...s, cycleId: v }))}
            employees={filteredEmployees}
            search={search}
            onSearch={setSearch}
            subjectId={state.subjectId}
            onSubject={(id) => setState((s) => ({ ...s, subjectId: id }))}
          />
        )}
        {step === 2 && (
          <StepParticipants
            employees={filteredEmployees}
            search={search}
            onSearch={setSearch}
            subjectId={state.subjectId}
            manager={state.manager}
            onManager={setManagerChoice}
            peers={state.peers}
            onPeerToggle={togglePeer}
            directReports={state.directReports}
            onDRToggle={toggleDR}
            selfReview={state.selfReview}
            onSelfToggle={(v) => setState((s) => ({ ...s, selfReview: v }))}
          />
        )}
        {step === 3 && (
          <StepAnonymity
            anonymityMode={state.anonymityMode}
            onChange={(v) => setState((s) => ({ ...s, anonymityMode: v }))}
          />
        )}
        {step === 4 && (
          <StepReview
            subjectName={subject ? `${subject.ad} ${subject.soyad}` : '—'}
            cycleName={cycles.find((c) => c.id === state.cycleId)?.name_tr ?? '—'}
            anonymityMode={state.anonymityMode}
            dueDate={state.dueDate}
            onDueDate={(v) => setState((s) => ({ ...s, dueDate: v }))}
            peers={state.peers}
            manager={state.manager}
            directReports={state.directReports}
            selfReview={state.selfReview}
          />
        )}

        {stepValidation[step].message && !stepValidation[step].valid && (
          <p className="mt-4 flex items-center gap-2 text-sm text-[#D97706]">
            <AlertCircle className="h-4 w-4" />
            {stepValidation[step].message}
          </p>
        )}
        {submitError && (
          <p className="mt-4 flex items-center gap-2 text-sm text-[#DC2626]">
            <AlertCircle className="h-4 w-4" />
            {submitError}
          </p>
        )}
      </section>

      <footer className="flex items-center justify-between">
        <button
          type="button"
          onClick={prev}
          disabled={step === 1}
          className="inline-flex items-center gap-2 rounded-lg border border-[#e5e5e5] px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#f5f5f5] disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Geri
        </button>
        {step < 4 ? (
          <button
            type="button"
            onClick={next}
            disabled={!canGoNext}
            className="inline-flex items-center gap-2 rounded-lg bg-[#5E5CE6] px-4 py-2 text-sm font-medium text-white hover:bg-[#4B49B6] disabled:opacity-40"
            data-testid="s360-next"
          >
            İleri
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canGoNext || create.isPending || Boolean(createdCampaign)}
            data-testid="s360-submit"
            className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-5 py-2 text-sm font-medium text-white hover:bg-[#047857] disabled:opacity-40"
          >
            {create.isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Gönderiliyor...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Kampanyayı Başlat
              </>
            )}
          </button>
        )}
      </footer>

      {createdCampaign && (
        <InvitationDispatcher
          campaignId={createdCampaign.id}
          invites={invites}
          onError={(msg) => setSubmitError(msg)}
          onDone={() => router.push(`/performans/360/rapor/${createdCampaign.id}`)}
        />
      )}
    </div>
  );
}

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

/* ─── Step 1: Subject ─── */

function StepSubject({
  cycles,
  cycleId,
  onCycleChange,
  employees,
  search,
  onSearch,
  subjectId,
  onSubject,
}: {
  cycles: PerformanceCycle[];
  cycleId: string;
  onCycleChange: (v: string) => void;
  employees: EmployeeView[];
  search: string;
  onSearch: (v: string) => void;
  subjectId: string;
  onSubject: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-[#0A0A0A]">
          Kim için geri bildirim toplanıyor?
        </h2>
        <p className="mt-1 text-sm text-[#737373]">
          Yönetici kendi ekibi için, çalışan kendi için opt-in ile 360° başlatabilir.
        </p>
      </div>
      <div>
        <label className="mb-2 block text-xs font-medium text-[#525252]">Aktif Dönem</label>
        <select
          value={cycleId}
          onChange={(e) => onCycleChange(e.target.value)}
          className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm"
          data-testid="s360-cycle"
        >
          <option value="">— Seçin —</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_tr}
            </option>
          ))}
        </select>
        {cycles.length === 0 && (
          <p className="mt-1 text-xs text-[#D97706]">
            Aktif dönem yok. /performans sayfasından dönem aç.
          </p>
        )}
      </div>
      <div>
        <label className="mb-2 block text-xs font-medium text-[#525252]">Çalışan Seç</label>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Ad, soyad ya da e-posta ile ara..."
          className="mb-2 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm"
          data-testid="s360-subject-search"
        />
        <ul className="max-h-64 divide-y divide-[#f5f5f5] overflow-auto rounded-lg border border-[#f0f0f0]">
          {employees.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onSubject(e.id)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
                  subjectId === e.id ? 'bg-[#eef0ff]' : 'hover:bg-[#fafafa]'
                }`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f0ff] text-[11px] font-semibold text-[#5E5CE6]">
                  {e.initials}
                </span>
                <span className="flex flex-col">
                  <span className="font-medium">
                    {e.ad} {e.soyad}
                  </span>
                  <span className="text-xs text-[#A3A3A3]">{e.email}</span>
                </span>
                {subjectId === e.id && <Check className="ml-auto h-4 w-4 text-[#5E5CE6]" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─── Step 2: Participants ─── */

function StepParticipants({
  employees,
  search,
  onSearch,
  subjectId,
  manager,
  onManager,
  peers,
  onPeerToggle,
  directReports,
  onDRToggle,
  selfReview,
  onSelfToggle,
}: {
  employees: EmployeeView[];
  search: string;
  onSearch: (v: string) => void;
  subjectId: string;
  manager: Participant | null;
  onManager: (e: EmployeeView) => void;
  peers: Participant[];
  onPeerToggle: (e: EmployeeView) => void;
  directReports: Participant[];
  onDRToggle: (e: EmployeeView) => void;
  selfReview: boolean;
  onSelfToggle: (v: boolean) => void;
}) {
  const candidates = employees.filter((e) => e.id !== subjectId);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-[#0A0A0A]">
          <Users className="h-5 w-5 text-[#5E5CE6]" />
          Katılımcılar
        </h2>
        <p className="mt-1 text-sm text-[#737373]">
          Yönetici zorunlu · En az 3 akran · Ekip üyeleri (opsiyonel) · Öz-değerlendirme (opsiyonel).
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-[#525252]">
        <input
          type="checkbox"
          checked={selfReview}
          onChange={(e) => onSelfToggle(e.target.checked)}
          className="h-4 w-4 rounded border-[#e5e5e5] text-[#5E5CE6]"
        />
        Öz-değerlendirme de toplansın
      </label>

      <input
        type="text"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Çalışan ara..."
        className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Column title="Yönetici (zorunlu)">
          {candidates.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onManager(e)}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                manager?.id === e.id ? 'bg-[#eef0ff]' : 'hover:bg-[#fafafa]'
              }`}
              data-testid={`s360-manager-${e.id}`}
            >
              <span className="flex-1 truncate">
                {e.ad} {e.soyad}
              </span>
              {manager?.id === e.id && <Check className="h-3.5 w-3.5 text-[#5E5CE6]" />}
            </button>
          ))}
        </Column>

        <Column title={`Akran seçimi (${peers.length} / 3+)`}>
          {candidates.map((e) => {
            const on = Boolean(peers.find((p) => p.id === e.id));
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => onPeerToggle(e)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                  on ? 'bg-[#ecfdf5]' : 'hover:bg-[#fafafa]'
                }`}
                data-testid={`s360-peer-${e.id}`}
              >
                <span className="flex-1 truncate">
                  {e.ad} {e.soyad}
                </span>
                {on && <Check className="h-3.5 w-3.5 text-[#059669]" />}
              </button>
            );
          })}
        </Column>

        <Column title={`Ekip üyeleri (${directReports.length})`}>
          {candidates.map((e) => {
            const on = Boolean(directReports.find((p) => p.id === e.id));
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => onDRToggle(e)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                  on ? 'bg-[#fff7ed]' : 'hover:bg-[#fafafa]'
                }`}
                data-testid={`s360-dr-${e.id}`}
              >
                <span className="flex-1 truncate">
                  {e.ad} {e.soyad}
                </span>
                {on && <Check className="h-3.5 w-3.5 text-[#D97706]" />}
              </button>
            );
          })}
        </Column>
      </div>
    </div>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-lg border border-[#f0f0f0]">
      <div className="border-b border-[#f0f0f0] bg-[#fafafa] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
        {title}
      </div>
      <div className="max-h-60 space-y-0.5 overflow-auto p-1.5">{children}</div>
    </div>
  );
}

/* ─── Step 3: Anonymity + KVKK ─── */

function StepAnonymity({
  anonymityMode,
  onChange,
}: {
  anonymityMode: AnonymityMode;
  onChange: (v: AnonymityMode) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-[#0A0A0A]">
          <Shield className="h-5 w-5 text-[#5E5CE6]" />
          Anonim Mod
        </h2>
        <p className="mt-1 text-sm text-[#737373]">
          Rapor sonucunda geri bildirim sağlayan kişinin kimliği gösterilecek mi?
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange('anonymous')}
          data-testid="s360-anon"
          className={`rounded-lg border p-4 text-left transition ${
            anonymityMode === 'anonymous'
              ? 'border-[#5E5CE6] bg-[#eef0ff]'
              : 'border-[#e5e5e5] hover:border-[#c7c7c7]'
          }`}
        >
          <div className="mb-1 font-semibold text-[#0A0A0A]">Anonim</div>
          <p className="text-xs text-[#525252]">
            Raporda sadece yönetici/akran/ekip üyesi etiketleri görünür; kimse kimin yazdığını
            bilmez. KVKK veri minimizasyonu ilkesine uygundur.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onChange('named')}
          data-testid="s360-named"
          className={`rounded-lg border p-4 text-left transition ${
            anonymityMode === 'named'
              ? 'border-[#5E5CE6] bg-[#eef0ff]'
              : 'border-[#e5e5e5] hover:border-[#c7c7c7]'
          }`}
        >
          <div className="mb-1 font-semibold text-[#0A0A0A]">İsimli</div>
          <p className="text-xs text-[#525252]">
            Raporda her yorumun yanında katılımcının adı gösterilir. Bu modda katılımcılara açık
            rıza metni gönderilir.
          </p>
        </button>
      </div>

      <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-xs text-[#854d0e]">
        <strong>KVKK notu:</strong> 360° geri bildirim kişisel veri barındırır (Madde 3). Anonim
        modda kişisel verilere erişim minimize edilir; isimli modda katılımcı açık rızası
        zorunludur (Madde 5/1). Kampanya verileri <strong>5 yıl</strong> saklanır
        (retention_policies).
      </div>
    </div>
  );
}

/* ─── Step 4: Review + due date + email preview ─── */

function StepReview({
  subjectName,
  cycleName,
  anonymityMode,
  dueDate,
  onDueDate,
  peers,
  manager,
  directReports,
  selfReview,
}: {
  subjectName: string;
  cycleName: string;
  anonymityMode: AnonymityMode;
  dueDate: string;
  onDueDate: (v: string) => void;
  peers: Participant[];
  manager: Participant | null;
  directReports: Participant[];
  selfReview: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-semibold text-[#0A0A0A]">Gözden Geçir ve Gönder</h2>
        <p className="mt-1 text-sm text-[#737373]">
          Kampanyayı başlatınca her katılımcıya davet e-postası gider, hatırlatıcı son tarihten 2
          gün önce tetiklenir.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-4 rounded-lg bg-[#fafafa] p-4 text-sm">
        <div>
          <dt className="text-xs text-[#737373]">Konu</dt>
          <dd className="font-medium">{subjectName}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#737373]">Dönem</dt>
          <dd className="font-medium">{cycleName}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#737373]">Anonim Modu</dt>
          <dd className="font-medium">{anonymityMode === 'anonymous' ? 'Anonim' : 'İsimli'}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#737373]">Öz-değerlendirme</dt>
          <dd className="font-medium">{selfReview ? 'Var' : 'Yok'}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#737373]">Yönetici</dt>
          <dd className="font-medium">{manager?.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#737373]">Katılımcı Sayısı</dt>
          <dd className="font-medium">
            {(manager ? 1 : 0) + peers.length + directReports.length + (selfReview ? 1 : 0)}
          </dd>
        </div>
      </dl>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#525252]">Son Tarih</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => onDueDate(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm"
          data-testid="s360-due-date"
        />
      </div>

      <div className="rounded-lg border border-[#e0f2fe] bg-[#f0f9ff] p-4 text-xs text-[#075985]">
        <div className="font-semibold">E-posta Önizleme</div>
        <p className="mt-2 leading-relaxed">
          Konu: <em>{subjectName}</em> için 360° geri bildiriminizi bekliyoruz
          <br />
          Son tarih: <strong>{dueDate || '—'}</strong>
          <br />
          Anonim modu: <strong>{anonymityMode === 'anonymous' ? 'Anonim' : 'İsimli'}</strong>
        </p>
      </div>
    </div>
  );
}

/* ─── Post-create invitation dispatcher ─── */

function InvitationDispatcher({
  campaignId,
  invites,
  onDone,
  onError,
}: {
  campaignId: string;
  invites: { reviewer_user_id: string; relation: Relation }[];
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const add = useAddInvitation(campaignId);
  const distribute = useDistributeCampaign(campaignId);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started) return;
    setStarted(true);
    (async () => {
      try {
        for (const inv of invites) {
          try {
            await add.mutateAsync(inv);
          } catch (err) {
            // 409 conflict (duplicate invite) is okay — idempotent flow.
            if (!(err instanceof Error && /409|conflict/i.test(err.message))) {
              throw err;
            }
          }
        }
        await distribute.mutateAsync({});
        onDone();
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Davetler gönderilirken hata oluştu.');
      }
    })();
  }, [started, invites, add, distribute, onDone, onError]);

  return null;
}
