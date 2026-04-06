import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar: React.ReactNode;
  topbar?: React.ReactNode;
  /** Max content width. `default` = 1280, `wide` = 1440, `full` = 100%. */
  maxWidth?: 'default' | 'wide' | 'full';
}

const widthMap: Record<NonNullable<AppShellProps['maxWidth']>, string> = {
  default: 'max-w-[1280px]',
  wide: 'max-w-[1440px]',
  full: 'max-w-none',
};

export const AppShell = forwardRef<HTMLDivElement, AppShellProps>(
  (
    { className, sidebar, topbar, maxWidth = 'default', children, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn('flex h-screen w-full overflow-hidden bg-bg-2', className)}
      {...props}
    >
      {sidebar}
      <div className="flex flex-1 flex-col overflow-hidden">
        {topbar}
        <main className="flex-1 overflow-y-auto">
          <div className={cn('mx-auto w-full px-6 py-8', widthMap[maxWidth])}>
            {children}
          </div>
        </main>
      </div>
    </div>
  ),
);
AppShell.displayName = 'AppShell';
