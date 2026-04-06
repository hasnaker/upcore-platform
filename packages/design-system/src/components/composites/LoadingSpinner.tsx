import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const spinnerVariants = cva('animate-spin text-ink-40', {
  variants: {
    size: {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
      xl: 'h-8 w-8',
    },
    tone: {
      muted: 'text-ink-40',
      ink: 'text-ink',
      accent: 'text-accent',
      bg: 'text-bg',
    },
  },
  defaultVariants: {
    size: 'md',
    tone: 'muted',
  },
});

export interface LoadingSpinnerProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'role'>,
    VariantProps<typeof spinnerVariants> {
  /** Accessible label read by screen readers. Defaults to "Yükleniyor". */
  label?: string;
}

export const LoadingSpinner = forwardRef<HTMLSpanElement, LoadingSpinnerProps>(
  ({ className, size, tone, label = 'Yükleniyor', ...props }, ref) => (
    <span
      ref={ref}
      role="status"
      aria-live="polite"
      className={cn('inline-flex items-center justify-center', className)}
      {...props}
    >
      <svg
        className={cn(spinnerVariants({ size, tone }))}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4zm2 5.3A8 8 0 014 12H0c0 3 1.1 5.8 3 7.9l3-2.6z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  ),
);
LoadingSpinner.displayName = 'LoadingSpinner';
