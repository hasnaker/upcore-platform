'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { abandonDraft } from '@/app/onboarding/actions';

interface WizardNavFooterProps {
  prevSlug: string | null;
}

export function WizardNavFooter({ prevSlug }: WizardNavFooterProps) {
  const router = useRouter();
  const [isPending, start] = useTransition();

  const handleLater = () => {
    if (!confirm('Taslak terk edilecek. Yeni bir kurulum başlatmak için yeniden giriş yapmanız gerekir. Devam etmek istiyor musunuz?')) {
      return;
    }
    start(async () => {
      await abandonDraft();
      router.push('/');
    });
  };

  return (
    <footer className="flex items-center justify-between border-t border-line pt-6">
      <div>
        {prevSlug ? (
          <Link href={`/onboarding/${prevSlug}`} className="text-sm text-ink-60 hover:text-ink">
            ← Önceki adım
          </Link>
        ) : (
          <span />
        )}
      </div>
      <button
        type="button"
        onClick={handleLater}
        disabled={isPending}
        className="text-xs text-ink-60 underline-offset-4 hover:underline disabled:opacity-50"
      >
        {isPending ? 'Kapatılıyor…' : 'Daha sonra tamamla'}
      </button>
    </footer>
  );
}
