import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface PulseBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Score 0–100. Values outside the range are clamped. */
  score: number;
  /** Max score. Defaults to `100`. */
  max?: number;
  /** Optional label rendered above the bar. */
  label?: string;
  /** Show the numeric score next to the label. Defaults to `true`. */
  showValue?: boolean;
  /** Visual tone. If not set, tone is derived from score thresholds. */
  tone?: 'low' | 'medium' | 'high' | 'accent';
  size?: 'sm' | 'md';
}

const toneClass: Record<NonNullable<PulseBarProps['tone']>, string> = {
  low: 'bg-red',
  medium: 'bg-amber',
  high: 'bg-green',
  accent: 'bg-accent',
};

const deriveTone = (percent: number): NonNullable<PulseBarProps['tone']> => {
  if (percent < 40) return 'low';
  if (percent < 70) return 'medium';
  return 'high';
};

export const PulseBar = forwardRef<HTMLDivElement, PulseBarProps>(
  (
    { className, score, max = 100, label, showValue = true, tone, size = 'md', ...props },
    ref,
  ) => {
    const clamped = Math.min(Math.max(score, 0), max);
    const percent = max > 0 ? (clamped / max) * 100 : 0;
    const resolvedTone = tone ?? deriveTone(percent);
    const barHeight = size === 'sm' ? 'h-1.5' : 'h-2';

    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-1.5', className)}
        {...props}
      >
        {(label || showValue) && (
          <div className="flex items-center justify-between text-xs">
            {label && <span className="font-medium text-ink-80">{label}</span>}
            {showValue && (
              <span className="tabular-nums text-ink-60">
                {Math.round(clamped)}
                {max === 100 ? '%' : ` / ${max}`}
              </span>
            )}
          </div>
        )}
        <div
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label ?? 'Puan'}
          className={cn('w-full overflow-hidden rounded-full bg-bg-3', barHeight)}
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-slow ease-standard',
              toneClass[resolvedTone],
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  },
);
PulseBar.displayName = 'PulseBar';
