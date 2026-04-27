import Link from 'next/link';
import { ONBOARDING_STEPS, type OnboardingStep } from '@/app/onboarding/steps';
import { cn } from '@/lib/utils';

interface WizardProgressProps {
  currentOrder: number;
  completedOrders?: number[];
}

export const WizardProgress = ({
  currentOrder,
  completedOrders = [],
}: WizardProgressProps) => {
  return (
    <nav aria-label="Kurulum adımları" className="space-y-1">
      <div className="mb-4 text-xs font-medium uppercase tracking-wider text-ink-60">
        Kurulum · {currentOrder}/{ONBOARDING_STEPS.length}
      </div>
      <ol className="space-y-1">
        {ONBOARDING_STEPS.map((step) => (
          <StepRow
            key={step.slug}
            step={step}
            current={step.order === currentOrder}
            completed={completedOrders.includes(step.order)}
          />
        ))}
      </ol>
    </nav>
  );
};

interface StepRowProps {
  step: OnboardingStep;
  current: boolean;
  completed: boolean;
}

const StepRow = ({ step, current, completed }: StepRowProps) => {
  const state = current ? 'current' : completed ? 'completed' : 'pending';

  return (
    <li>
      <Link
        href={`/onboarding/${step.slug}`}
        aria-current={current ? 'step' : undefined}
        className={cn(
          'flex items-start gap-3 rounded-md border px-3 py-2 text-sm transition-colors',
          state === 'current' && 'border-ink bg-bg text-ink',
          state === 'completed' && 'border-line bg-bg-2 text-ink-70 hover:bg-bg',
          state === 'pending' && 'border-line bg-bg-2 text-ink-60 hover:bg-bg',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[10px] font-semibold',
            state === 'current' && 'border-ink bg-ink text-bg',
            state === 'completed' && 'border-line bg-line text-ink',
            state === 'pending' && 'border-line bg-bg text-ink-60',
          )}
        >
          {completed ? '✓' : step.order}
        </span>
        <span className="flex flex-col">
          <span className="font-medium">
            {step.title}
            {step.optional ? <span className="ml-1 text-ink-60">· opsiyonel</span> : null}
          </span>
          <span className="text-xs text-ink-60">{step.description}</span>
        </span>
      </Link>
    </li>
  );
};
