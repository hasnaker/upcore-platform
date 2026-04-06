import { forwardRef } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../primitives/Button';
import { Badge } from '../primitives/Badge';
import { EmployeeAvatar } from './EmployeeAvatar';

export type ActionPriority = 1 | 2 | 3 | 4 | 5;
export type ActionStatus =
  | 'suggested'
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'dismissed';

export interface ActionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: string;
  description: string;
  /** Category (e.g. "1:1 Görüşme", "Eğitim"). */
  category: string;
  /** 1 (highest) – 5 (lowest). */
  priority: ActionPriority;
  dueDate?: Date | string;
  assignee?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  status: ActionStatus;
  onAccept?: () => void;
  onDismiss?: () => void;
  onComplete?: () => void;
}

const priorityStyle: Record<ActionPriority, { label: string; className: string }> = {
  1: { label: 'Kritik', className: 'bg-red-soft text-red border-red-soft' },
  2: { label: 'Yüksek', className: 'bg-amber-soft text-amber border-amber-soft' },
  3: { label: 'Orta', className: 'bg-teal-soft text-teal border-teal-soft' },
  4: { label: 'Düşük', className: 'bg-bg-3 text-ink-60 border-line' },
  5: { label: 'En düşük', className: 'bg-bg-3 text-ink-60 border-line' },
};

const statusLabels: Record<ActionStatus, string> = {
  suggested: 'Öneri',
  pending: 'Bekliyor',
  accepted: 'Kabul edildi',
  in_progress: 'Devam ediyor',
  completed: 'Tamamlandı',
  dismissed: 'Geri çevrildi',
};

const formatDueDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

export const ActionCard = forwardRef<HTMLDivElement, ActionCardProps>(
  (
    {
      className,
      title,
      description,
      category,
      priority,
      dueDate,
      assignee,
      status,
      onAccept,
      onDismiss,
      onComplete,
      ...props
    },
    ref,
  ) => {
    const prio = priorityStyle[priority];
    const isActionable = status === 'suggested' || status === 'pending';
    const isInProgress = status === 'accepted' || status === 'in_progress';

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-3 rounded-lg border border-line bg-bg p-4 shadow-xs',
          'transition-colors duration-fast hover:border-ink-20',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex h-5 items-center rounded-md border px-1.5 text-[11px] font-medium',
                prio.className,
              )}
            >
              {prio.label}
            </span>
            <Badge variant="outline" size="sm">
              {category}
            </Badge>
          </div>
          <Badge variant="default" size="sm">
            {statusLabels[status]}
          </Badge>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold leading-tight text-ink">{title}</h3>
          <p className="text-xs leading-normal text-ink-60">{description}</p>
        </div>
        {(assignee || dueDate) && (
          <div className="flex items-center justify-between gap-3 pt-1">
            {assignee ? (
              <EmployeeAvatar
                firstName={assignee.firstName}
                lastName={assignee.lastName}
                avatarUrl={assignee.avatarUrl}
                size="xs"
              />
            ) : (
              <span />
            )}
            {dueDate && (
              <span className="flex items-center gap-1 text-[11px] text-ink-60">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                {formatDueDate(dueDate)}
              </span>
            )}
          </div>
        )}
        {(isActionable || isInProgress) && (
          <div className="flex items-center gap-2 pt-2 border-t border-line">
            {isActionable && onAccept && (
              <Button size="sm" variant="primary" onClick={onAccept}>
                Kabul et
              </Button>
            )}
            {isInProgress && onComplete && (
              <Button size="sm" variant="primary" onClick={onComplete}>
                Tamamla
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                Geri çevir
              </Button>
            )}
          </div>
        )}
      </div>
    );
  },
);
ActionCard.displayName = 'ActionCard';
