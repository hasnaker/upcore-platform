'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, type DragEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  UserRound,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ACTIVE_STAGES,
  STAGE_LABEL,
  useMoveApplication,
  useRequisitionBoard,
  type ATSStage,
  type Application,
} from '@/hooks/useAts';

const STAGE_COLOR: Record<ATSStage, { bg: string; bar: string; text: string }> = {
  applied: { bg: 'bg-bg-2', bar: 'bg-ink-40', text: 'text-ink-60' },
  screened: { bg: 'bg-bg-2', bar: 'bg-accent/60', text: 'text-ink-60' },
  assessed: { bg: 'bg-accent-soft', bar: 'bg-accent', text: 'text-accent' },
  interviewed: { bg: 'bg-amber-soft', bar: 'bg-amber', text: 'text-amber' },
  offered: { bg: 'bg-green-soft', bar: 'bg-green', text: 'text-green' },
  hired: { bg: 'bg-green-soft', bar: 'bg-green', text: 'text-green' },
  rejected: { bg: 'bg-red-soft', bar: 'bg-red', text: 'text-red' },
  withdrawn: { bg: 'bg-bg-3', bar: 'bg-ink-20', text: 'text-ink-40' },
};

export default function ATSBoardPage() {
  const params = useParams<{ reqId: string }>();
  const reqId = params.reqId;

  const { data, isLoading, isError, error, refetch } = useRequisitionBoard(reqId);
  const move = useMoveApplication();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ATSStage | null>(null);

  const onDragStart = (appId: string) => setDragging(appId);
  const onDragEnd = () => {
    setDragging(null);
    setDropTarget(null);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>, stage: ATSStage) => {
    e.preventDefault();
    if (dragging && dropTarget !== stage) setDropTarget(stage);
  };

  const onDrop = async (stage: ATSStage) => {
    if (!dragging) return;
    const appId = dragging;
    onDragEnd();
    try {
      await move.mutateAsync({ applicationId: appId, to_stage: stage });
      toast.success(`Aday ${STAGE_LABEL[stage]} aşamasına taşındı`, {
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
    } catch (err: unknown) {
      toast.error('Aşama değiştirilemedi', {
        description:
          err instanceof Error ? err.message : 'Geçersiz geçiş olabilir (state machine kuralı)',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-6 w-48 animate-pulse rounded bg-bg-3" />
        <div className="grid gap-3 overflow-x-auto md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-96 animate-pulse rounded-lg bg-bg-2" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/ats" className="inline-flex items-center gap-1 text-sm text-ink-60">
          <ArrowLeft className="h-4 w-4" /> ATS'e dön
        </Link>
        <div className="flex items-start gap-3 rounded-lg border border-red/30 bg-red-soft p-4 text-sm text-red">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Kanban yüklenemedi</p>
            <p className="mt-1 text-[12px]">{error?.message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 rounded bg-red px-3 py-1.5 text-[12px] font-medium text-white"
            >
              Yeniden dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Aktif 6 + inactive 2 (rejected/withdrawn) ayrı secondary row
  const activeCols = ACTIVE_STAGES.map((s) => data.stages.find((c) => c.stage === s)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c),
  );
  const inactiveCols = data.stages.filter(
    (c) => c.stage === 'rejected' || c.stage === 'withdrawn',
  );

  const totalActive = activeCols.reduce((s, c) => s + c.count, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-[12px] text-ink-40">
        <Link href="/ats" className="hover:text-ink-60">
          ATS
        </Link>
        <span>›</span>
        <span className="text-ink-60">Kanban</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Aday Kanban Board</h1>
          <p className="mt-1 text-sm text-ink-60">
            Aktif pipeline'da {totalActive} aday. Kartları sürükleyerek aşama değiştir.
          </p>
        </div>
      </div>

      {/* Aktif kolonlar */}
      <div className="grid gap-3 overflow-x-auto md:grid-cols-3 lg:grid-cols-6">
        {activeCols.map((col) => {
          const colorCfg = STAGE_COLOR[col.stage];
          const isTarget = dropTarget === col.stage;
          return (
            <div
              key={col.stage}
              onDragOver={(e) => onDragOver(e, col.stage)}
              onDrop={() => onDrop(col.stage)}
              onDragLeave={() => setDropTarget(null)}
              className={`flex min-w-[220px] flex-col gap-2 rounded-lg border p-3 transition-colors ${
                isTarget
                  ? 'border-accent bg-accent-soft'
                  : `border-line ${colorCfg.bg}`
              }`}
            >
              <header className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 ${colorCfg.text}`}>
                  <span className={`inline-block h-2 w-2 rounded-full ${colorCfg.bar}`} />
                  <span className="text-[11px] font-semibold uppercase tracking-widest">
                    {STAGE_LABEL[col.stage]}
                  </span>
                </div>
                <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold text-ink-60">
                  {col.count}
                </span>
              </header>

              <div className="flex flex-col gap-2">
                {col.applications.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-ink-40">Aday yok</p>
                ) : (
                  col.applications.map((app) => (
                    <CandidateCard
                      key={app.id}
                      application={app}
                      isDragging={dragging === app.id}
                      onDragStart={() => onDragStart(app.id)}
                      onDragEnd={onDragEnd}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Inactive (rejected + withdrawn) — alt satır, kompakt */}
      {inactiveCols.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {inactiveCols.map((col) => (
            <div
              key={col.stage}
              onDragOver={(e) => onDragOver(e, col.stage)}
              onDrop={() => onDrop(col.stage)}
              onDragLeave={() => setDropTarget(null)}
              className={`rounded-lg border p-3 ${
                dropTarget === col.stage
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-bg-2'
              }`}
            >
              <header className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 ${STAGE_COLOR[col.stage].text}`}>
                  {col.stage === 'rejected' ? (
                    <UserX className="h-3.5 w-3.5" />
                  ) : (
                    <UserRound className="h-3.5 w-3.5" />
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-widest">
                    {STAGE_LABEL[col.stage]}
                  </span>
                </div>
                <span className="text-[11px] text-ink-40">{col.count} aday</span>
              </header>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 rounded-lg border border-line bg-bg-2 p-3 text-[11px] text-ink-60">
        <strong className="text-ink-80">State machine:</strong>{' '}
        Başvurdu → CV Tarandı → Değerlendirildi → Mülakatta → Teklif → İşe Alındı. Geriye
        dönüşler veya atlamalı geçişler için arkaplan kuralları var; geçersiz bir hamle
        olursa hata toast'u göreceksiniz.
      </div>
    </div>
  );
}

const CandidateCard = ({
  application,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  application: Application;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) => {
  const name = application.candidate
    ? `${application.candidate.first_name} ${application.candidate.last_name}`
    : application.candidate_id.slice(0, 8);
  const initials = application.candidate
    ? `${application.candidate.first_name[0] ?? '?'}${application.candidate.last_name[0] ?? '?'}`.toUpperCase()
    : '??';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`flex cursor-grab items-start gap-2 rounded-md border border-line bg-bg p-2.5 transition-shadow hover:shadow-sm active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-ink">{name}</p>
        {application.candidate?.email && (
          <p className="truncate text-[10px] text-ink-40">{application.candidate.email}</p>
        )}
        {application.score != null && (
          <div className="mt-1 inline-flex items-center gap-1 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            Fit: %{Math.round(application.score * 100)}
          </div>
        )}
      </div>
    </div>
  );
};
