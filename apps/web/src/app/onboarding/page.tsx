import { redirect } from 'next/navigation';
import { ONBOARDING_STEPS } from './steps';

export default function OnboardingIndexPage() {
  const first = ONBOARDING_STEPS[0];
  if (!first) redirect('/panel');
  redirect(`/onboarding/${first.slug}`);
}
