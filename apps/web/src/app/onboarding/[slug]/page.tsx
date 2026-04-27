import { notFound } from 'next/navigation';
import { Step1Company } from '@/components/onboarding/Step1Company';
import { Step2AdminUser } from '@/components/onboarding/Step2AdminUser';
import { Step3ModulesPlan } from '@/components/onboarding/Step3ModulesPlan';
import { Step4EmployeesImport } from '@/components/onboarding/Step4EmployeesImport';
import { Step5OrgChart } from '@/components/onboarding/Step5OrgChart';
import { Step6SSO } from '@/components/onboarding/Step6SSO';
import { Step7KVKK } from '@/components/onboarding/Step7KVKK';
import { Step8PayrollSGK } from '@/components/onboarding/Step8PayrollSGK';
import { Step9Integrations } from '@/components/onboarding/Step9Integrations';
import { Step10Summary } from '@/components/onboarding/Step10Summary';
import { WizardNavFooter } from '@/components/onboarding/WizardNavFooter';
import {
  getStepBySlug,
  nextStepSlug,
  prevStepSlug,
  ONBOARDING_STEPS,
} from '@/app/onboarding/steps';
import { getDraft } from '@/app/onboarding/actions';

interface StepPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ONBOARDING_STEPS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: StepPageProps) {
  const { slug } = await params;
  const step = getStepBySlug(slug);
  return { title: step ? `${step.title} · Kurulum` : 'Kurulum' };
}

export default async function StepPage({ params }: StepPageProps) {
  const { slug } = await params;
  const step = getStepBySlug(slug);
  if (!step) notFound();

  const next = nextStepSlug(step.order);
  const prev = prevStepSlug(step.order);
  const draft = await getDraft();

  return (
    <div className="space-y-8">
      <StepBody slug={slug} draft={draft} nextSlug={next} />
      {step.order !== 10 && <WizardNavFooter prevSlug={prev} />}
    </div>
  );
}

interface StepBodyProps {
  slug: string;
  draft: Awaited<ReturnType<typeof getDraft>>;
  nextSlug: string | null;
}

function StepBody({ slug, draft, nextSlug }: StepBodyProps) {
  switch (slug) {
    case 'sirket':
      return <Step1Company draft={draft} nextSlug={nextSlug} />;
    case 'yonetici':
      return <Step2AdminUser draft={draft} nextSlug={nextSlug} />;
    case 'modul':
      return <Step3ModulesPlan draft={draft} nextSlug={nextSlug} />;
    case 'calisan':
      return <Step4EmployeesImport draft={draft} nextSlug={nextSlug} />;
    case 'organizasyon':
      return <Step5OrgChart draft={draft} nextSlug={nextSlug} />;
    case 'sso':
      return <Step6SSO draft={draft} nextSlug={nextSlug} />;
    case 'kvkk':
      return <Step7KVKK draft={draft} nextSlug={nextSlug} />;
    case 'bordro':
      return <Step8PayrollSGK draft={draft} nextSlug={nextSlug} />;
    case 'entegrasyon':
      return <Step9Integrations draft={draft} nextSlug={nextSlug} />;
    case 'ozet':
      return <Step10Summary draft={draft} />;
    default:
      notFound();
  }
}
