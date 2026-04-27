'use client';

import { StatusPill } from '@upcore/design-system';
import { TenantActionsMenu } from './TenantActionsMenu';
import {
  STATUS_LABEL,
  STATUS_TONE,
  formatDate,
  type AdminTenantRow,
} from './types';

interface TenantRowProps {
  row: AdminTenantRow;
  onSuspend: () => void;
  onActivate: () => void;
  onImpersonate: () => void;
}

export function TenantRow({
  row,
  onSuspend,
  onActivate,
  onImpersonate,
}: TenantRowProps) {
  return (
    <tr className="hover:bg-bg-2">
      <td className="px-4 py-3">
        <p className="font-medium text-ink">{row.name}</p>
        <p className="font-mono text-[11px] text-ink-40">{row.slug}</p>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex h-5 items-center rounded bg-bg-3 px-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-60">
          {row.plan_id ?? '—'}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusPill tone={STATUS_TONE[row.status]} size="sm">
          {STATUS_LABEL[row.status]}
        </StatusPill>
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-ink-60">
        {(row.employee_count ?? 0).toLocaleString('tr-TR')}
      </td>
      <td className="px-4 py-3 tabular-nums text-ink-40">
        {formatDate(row.created_at)}
      </td>
      <td className="px-4 py-3 text-right">
        <TenantActionsMenu
          row={row}
          onSuspend={onSuspend}
          onActivate={onActivate}
          onImpersonate={onImpersonate}
        />
      </td>
    </tr>
  );
}
