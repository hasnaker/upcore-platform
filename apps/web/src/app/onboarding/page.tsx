import type { Metadata } from 'next';
import { OrgSetupForm } from '@/components/onboarding/OrgSetupForm';

export const metadata: Metadata = {
  title: 'Kurulum',
  description: 'Şirketinizi oluşturun ve kuruluma başlayın.',
};

export default function OnboardingPage() {
  return (
    <div className="rounded-lg border border-line bg-bg p-8 shadow-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Şirketinizi kurun</h1>
        <p className="mt-2 text-sm text-ink-60">
          Kurulumu tamamlayın — 2 dakika sürer, sonrasında ekibinizi davet edebilirsiniz.
        </p>
      </div>
      <OrgSetupForm />
    </div>
  );
}
