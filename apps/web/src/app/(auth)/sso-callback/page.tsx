import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
        <p className="mt-4 text-sm text-ink-60">Giriş yapılıyor…</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
