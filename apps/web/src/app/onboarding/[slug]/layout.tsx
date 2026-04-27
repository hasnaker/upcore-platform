import { notFound } from 'next/navigation';
import { WizardProgress } from '@/components/onboarding/WizardProgress';
import { getStepBySlug } from '@/app/onboarding/steps';
import { getDraft } from '@/app/onboarding/actions';

interface StepLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function StepLayout({ children, params }: StepLayoutProps) {
  const { slug } = await params;
  const step = getStepBySlug(slug);
  if (!step) notFound();

  const draft = await getDraft();
  const completed = draft?.data.completed_steps ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="lg:sticky lg:top-10 lg:self-start">
        <WizardProgress currentOrder={step.order} completedOrders={completed} />
      </aside>
      <section className="rounded-lg border border-line bg-bg p-8 shadow-sm">
        <header className="mb-6 border-b border-line pb-4">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-60">
            Adım {step.order}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {step.title}
          </h1>
          <p className="mt-2 text-sm text-ink-60">{step.description}</p>
        </header>
        {children}
      </section>
    </div>
  );
}
