import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
  {
    variants: {
      variant: {
        default: 'border-line bg-bg-3 text-ink-80',
        outline: 'border-line bg-bg text-ink-60',
        accent: 'border-transparent bg-accent-soft text-accent',
        success: 'border-transparent bg-green-soft text-green',
        warning: 'border-transparent bg-amber-soft text-amber',
        danger: 'border-transparent bg-red-soft text-red',
        info: 'border-transparent bg-teal-soft text-teal',
      },
      size: {
        sm: 'h-5 px-1.5 text-[11px]',
        md: 'h-6 px-2 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Badge.displayName = 'Badge';

export { badgeVariants };
