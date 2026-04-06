import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'Giriş Yap',
  description: 'Upcore hesabınıza giriş yapın.',
};

export default function GirisPage() {
  return (
    <div className="flex flex-col items-center">
      <SignIn
        routing="hash"
        signUpUrl="/kayit"
        fallbackRedirectUrl="/panel"
      />
    </div>
  );
}
