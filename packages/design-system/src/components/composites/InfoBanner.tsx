import { forwardRef } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const bannerVariants = cva(
  'flex items-start gap-3 rounded-md border p-3',
  {
    variants: {
      tone: {
        info: 'border-teal-soft bg-teal-soft text-teal',
        success: 'border-green-soft bg-green-soft text-green',
        warning: 'border-amber-soft bg-amber-soft text-amber',
        danger: 'border-red-soft bg-red-soft text-red',
        neutral: 'border-line bg-bg-2 text-ink-80',
      },
    },
    defaultVariants: {
      tone: 'info',
    },
  },
);

const toneIconMap: Record<NonNullable<VariantProps<typeof bannerVariants>['tone']>, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
  neutral: Info,
};

export interface InfoBannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof bannerVariants> {
  title?: React.ReactNode;
  /** Custom icon override. Defaults to the icon mapped to `tone`. */
  icon?: LucideIcon;
  /** If provided, renders a dismiss button that fires `onDismiss`. */
  onDismiss?: () => void;
}

export const InfoBanner = forwardRef<HTMLDivElement, InfoBannerProps>(
  (
    { className, tone = 'info', title, icon, children, onDismiss, ...props },
    ref,
  ) => {
    const Icon = icon ?? toneIconMap[tone ?? 'info'];
    return (
      <div
        ref={ref}
        role="status"
        className={cn(bannerVariants({ tone }), className)}
        {...props}
      >
        <Icon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 text-xs">
          {title && <p className="font-medium">{title}</p>}
          {children && <div className={cn(title && 'mt-0.5 opacity-90')}>{children}</div>}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              'shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-current',
            )}
            aria-label="Kapat"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  },
);
InfoBanner.displayName = 'InfoBanner';
