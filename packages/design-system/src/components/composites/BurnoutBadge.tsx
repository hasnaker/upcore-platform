import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

export type BurnoutLevel = 'low' | 'moderate' | 'high' | 'critical';

const burnoutBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      level: {
        low: 'border-green-soft bg-green-soft text-green',
        moderate: 'border-amber-soft bg-amber-soft text-amber',
        high: 'border-red-soft bg-red-soft text-red',
        critical: 'border-red bg-red text-bg',
      },
    },
    defaultVariants: {
      level: 'low',
    },
  },
);

const levelLabelsTr: Record<BurnoutLevel, string> = {
  low: 'Düşük',
  moderate: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
};

export interface BurnoutBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    Omit<VariantProps<typeof burnoutBadgeVariants>, 'level'> {
  level: BurnoutLevel;
  /** Override the label — defaults to Turkish level name. */
  label?: string;
  /** Optional numeric score (0–100) rendered after the label. */
  score?: number;
}

export const BurnoutBadge = forwardRef<HTMLSpanElement, BurnoutBadgeProps>(
  ({ className, level, label, score, ...props }, ref) => {
    const displayLabel = label ?? levelLabelsTr[level];
    return (
      <span
        ref={ref}
        className={cn(burnoutBadgeVariants({ level }), className)}
        aria-label={`Tükenmişlik seviyesi: ${displayLabel}${score !== undefined ? `, skor ${score}` : ''}`}
        {...props}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            level === 'critical' ? 'bg-bg' : 'bg-current',
          )}
          aria-hidden="true"
        />
        {displayLabel}
        {score !== undefined && (
          <span className="tabular-nums opacity-75">· {score}</span>
        )}
      </span>
    );
  },
);
BurnoutBadge.displayName = 'BurnoutBadge';
