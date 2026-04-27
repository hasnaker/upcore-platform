'use client';

import { useMemo } from 'react';
import {
  CATEGORY_LABEL,
  useInterventionAssignments,
  useInterventionCatalog,
  type InterventionAssignment,
  type CatalogItem,
} from '@/hooks/useInterventions';
import { AssignmentConsentBadge } from './AssignmentConsentBadge';

/**
 * İK tarafı — aktif müdahalelerin listesi. Her satırda consent durum
 * rozeti ve 72h+ bekleyenler için "Hatırlat" butonu görüntülenir.
 * Reddedilen atamaların gerekçesi rozet tıklanarak drawer'da açılır.
 */
export const InterventionFlow = () => {
  const assignments = useInterventionAssignments({ limit: 50 });
  const catalog = useInterventionCatalog();

  const catalogById = useMemo(() => {
    const m = new Map<string, CatalogItem>();
    for (const c of catalog.data ?? []) m.set(c.id, c);
    return m;
  }, [catalog.data]);

  const items = assignments.data?.items ?? [];

  return (
    <div className="rounded-xl border border-line bg-bg">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">Aktif Müdahaleler</h3>
          <p className="mt-0.5 text-[11px] text-ink-60">
            Her müdahale çalışan onayıyla başlar. KVKK kapsamında her cevap
            append-only audit log'a işlenir.
          </p>
        </div>
        <span className="text-[11px] text-ink-40">
          {assignments.isLoading ? 'Yükleniyor…' : `${items.length} kayıt`}
        </span>
      </div>

      {assignments.isLoading && (
        <div className="p-5">
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg border border-line bg-bg-2"
              />
            ))}
          </div>
        </div>
      )}

      {!assignments.isLoading && assignments.isError && (
        <div className="p-5">
          <p className="rounded-md border border-red/30 bg-red-soft p-4 text-[13px] text-red">
            Yüklenemedi: {assignments.error?.message ?? 'Bilinmeyen hata'}
          </p>
        </div>
      )}

      {!assignments.isLoading && !assignments.isError && items.length === 0 && (
        <div className="p-5">
          <p className="rounded-md border border-line bg-bg-2 p-4 text-center text-[13px] text-ink-60">
            Henüz atanmış bir müdahale yok. Tükenmişlik panelinden kritik çalışana
            atayabilirsin.
          </p>
        </div>
      )}

      {!assignments.isLoading && items.length > 0 && (
        <ul className="divide-y divide-line">
          {items.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              catalog={catalogById.get(a.intervention_id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

function AssignmentRow({
  assignment: a,
  catalog,
}: {
  assignment: InterventionAssignment;
  catalog?: CatalogItem;
}) {
  const title = catalog?.title_tr ?? 'Müdahale';
  const catLabel = catalog ? CATEGORY_LABEL[catalog.category] : '—';

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[11px] text-ink-60">
          Çalışan ID: <span className="font-mono">{a.employee_id.slice(0, 8)}</span>
          {' · '}
          {new Date(a.assigned_at).toLocaleDateString('tr-TR')}
        </p>
      </div>
      <span className="inline-flex h-5 items-center rounded-full bg-bg-2 px-2 text-[10px] font-medium text-ink-60">
        {catLabel}
      </span>
      <AssignmentConsentBadge
        assignmentId={a.id}
        status={a.status}
        acceptedAt={a.accepted_at}
        assignedAt={a.assigned_at}
      />
    </li>
  );
}
