import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'Kayıt Ol',
  description: "Upcore'a ücretsiz kayıt olun — 14 gün deneme, kredi kartı gerekmez.",
};

export default function KayitPage() {
  return (
    <div className="flex flex-col items-center">
      <SignUp
        routing="hash"
        signInUrl="/giris"
        fallbackRedirectUrl="/onboarding"
      />
    </div>
  );
}
