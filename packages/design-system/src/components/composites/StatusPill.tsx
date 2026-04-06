import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const statusPillVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border font-medium',
  {
    variants: {
      tone: {
        neutral: 'border-line bg-bg-3 text-ink-80',
        success: 'border-green-soft bg-green-soft text-green',
        warning: 'border-amber-soft bg-amber-soft text-amber',
        danger: 'border-red-soft bg-red-soft text-red',
        info: 'border-teal-soft bg-teal-soft text-teal',
        accent: 'border-accent-soft bg-accent-soft text-accent',
      },
      size: {
        sm: 'h-5 px-2 text-[11px]',
        md: 'h-6 px-2.5 text-xs',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'md',
    },
  },
);

const dotVariants = cva('h-1.5 w-1.5 rounded-full', {
  variants: {
    tone: {
      neutral: 'bg-ink-40',
      success: 'bg-green',
      warning: 'bg-amber',
      danger: 'bg-red',
      info: 'bg-teal',
      accent: 'bg-accent',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {
  /** Show a leading colored dot. Defaults to `true`. */
  showDot?: boolean;
}

export const StatusPill = forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ className, tone, size, showDot = true, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(statusPillVariants({ tone, size }), className)}
      {...props}
    >
      {showDot && <span className={cn(dotVariants({ tone }))} aria-hidden="true" />}
      {children}
    </span>
  ),
);
StatusPill.displayName = 'StatusPill';

export { statusPillVariants };
