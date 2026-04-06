import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: string;
  subtitle?: string;
  /** Actions rendered on the right (buttons, menus). */
  actions?: React.ReactNode;
}

export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, subtitle, actions, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-start md:justify-between',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold leading-tight text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-ink-60">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  ),
);
PageHeader.displayName = 'PageHeader';
