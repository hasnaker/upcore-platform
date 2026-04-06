import { forwardRef } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Large icon. Defaults to `Inbox`. */
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Action button(s) rendered under description. */
  action?: React.ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon: Icon = Inbox, title, description, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-bg-2 px-6 py-12 text-center',
        className,
      )}
      {...props}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-3">
        <Icon className="h-5 w-5 text-ink-40" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="text-xs text-ink-60 max-w-sm">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  ),
);
EmptyState.displayName = 'EmptyState';
