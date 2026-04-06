import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface TopbarProps extends React.HTMLAttributes<HTMLElement> {
  /** Left slot — typically breadcrumbs or page title. */
  start?: React.ReactNode;
  /** Center slot — typically a search bar. */
  center?: React.ReactNode;
  /** Right slot — typically notifications + user menu. */
  end?: React.ReactNode;
}

export const Topbar = forwardRef<HTMLElement, TopbarProps>(
  ({ className, start, center, end, ...props }, ref) => (
    <header
      ref={ref}
      className={cn(
        'flex h-14 shrink-0 items-center gap-4 border-b border-line bg-bg px-4',
        className,
      )}
      {...props}
    >
      {start && <div className="flex min-w-0 items-center gap-3">{start}</div>}
      {center && <div className="flex-1 flex justify-center">{center}</div>}
      {!center && <div className="flex-1" />}
      {end && <div className="flex shrink-0 items-center gap-2">{end}</div>}
    </header>
  ),
);
Topbar.displayName = 'Topbar';
