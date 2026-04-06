import { forwardRef, useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export type MetricTrend = 'positive' | 'negative' | 'neutral';

export interface MetricDelta {
  value: number;
  direction: 'up' | 'down';
  /** e.g. "vs geçen hafta". */
  period?: string;
}

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  delta?: MetricDelta;
  /** Tiny inline chart — ~12 numeric values work best. */
  sparkline?: number[];
  icon?: React.ReactNode;
  /** Overrides the color applied to the delta/sparkline. */
  trend?: MetricTrend;
  loading?: boolean;
}

const trendClass: Record<MetricTrend, string> = {
  positive: 'text-green',
  negative: 'text-red',
  neutral: 'text-ink-60',
};

/** Derive trend from delta direction if not explicit. */
const resolveTrend = (delta?: MetricDelta, trend?: MetricTrend): MetricTrend => {
  if (trend) return trend;
  if (!delta) return 'neutral';
  return delta.direction === 'up' ? 'positive' : 'negative';
};

const Sparkline = ({ data, tone }: { data: number[]; tone: MetricTrend }) => {
  const d = useMemo(() => {
    if (!data.length) return '';
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    const step = data.length > 1 ? width / (data.length - 1) : 0;
    return data
      .map((v, i) => {
        const x = i * step;
        const y = height - ((v - min) / range) * height;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data]);

  if (!data.length) return null;

  return (
    <svg
      width="80"
      height="24"
      viewBox="0 0 80 24"
      fill="none"
      className={cn('shrink-0', trendClass[tone])}
      aria-hidden="true"
    >
      <path d={d} stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  (
    { className, label, value, delta, sparkline, icon, trend, loading, ...props },
    ref,
  ) => {
    const resolvedTrend = resolveTrend(delta, trend);

    if (loading) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex flex-col gap-3 rounded-lg border border-line bg-bg p-4 shadow-xs',
            className,
          )}
          aria-busy="true"
          {...props}
        >
          <div className="h-3 w-20 rounded bg-bg-3 animate-pulse" />
          <div className="h-7 w-24 rounded bg-bg-3 animate-pulse" />
          <div className="h-3 w-16 rounded bg-bg-3 animate-pulse" />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-2 rounded-lg border border-line bg-bg p-4 shadow-xs',
          'transition-colors duration-fast hover:border-ink-20',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-ink-60">{label}</p>
          {icon && <span className="text-ink-40 shrink-0">{icon}</span>}
        </div>
        <p className="text-2xl font-semibold tabular-nums leading-tight text-ink">{value}</p>
        <div className="flex items-end justify-between gap-3">
          {delta ? (
            <div
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium tabular-nums',
                trendClass[resolvedTrend],
              )}
            >
              {delta.direction === 'up' ? (
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
              )}
              <span>
                {Math.abs(delta.value)}
                {typeof delta.value === 'number' && '%'}
              </span>
              {delta.period && <span className="font-normal text-ink-60 ml-1">{delta.period}</span>}
            </div>
          ) : (
            <span />
          )}
          {sparkline && sparkline.length > 0 && (
            <Sparkline data={sparkline} tone={resolvedTrend} />
          )}
        </div>
      </div>
    );
  },
);
MetricCard.displayName = 'MetricCard';
