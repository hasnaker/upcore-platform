'use client';

import { useUser } from '@clerk/nextjs';
import { useAuthMe } from '@/hooks/useAuthMe';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
};

const formatDate = (): string =>
  new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

interface GreetingProps {
  /** Opsiyonel: aksiyon ve çalışan sayısı dışarıdan verilebilir. */
  pendingActionCount?: number;
  employeeCount?: number;
  tenantName?: string;
}

export const Greeting = ({
  pendingActionCount,
  employeeCount,
  tenantName,
}: GreetingProps) => {
  const greeting = getGreeting();
  const dateStr = formatDate();

  // Clerk session → hızlı isim görünümü (optimistic).
  const { user: clerkUser, isLoaded: clerkReady } = useUser();
  // Backend /me → tenant + roles + kanonik isim.
  const { firstName, isLoading: meLoading, isError: meError } = useAuthMe();

  const displayName =
    firstName ||
    clerkUser?.firstName ||
    clerkUser?.username ||
    clerkUser?.emailAddresses[0]?.emailAddress.split('@')[0] ||
    '';

  const subtitle = (() => {
    if (meError) return 'Profil bilgisi yüklenemedi — yeniden deneyin';
    if (meLoading && !clerkReady) return '';
    const parts: string[] = [];
    if (typeof pendingActionCount === 'number') {
      parts.push(
        pendingActionCount === 0
          ? 'Bekleyen aksiyon yok'
          : `Bugün ${pendingActionCount} aksiyon bekliyor`,
      );
    }
    if (tenantName) parts.push(tenantName);
    if (typeof employeeCount === 'number') {
      parts.push(`${employeeCount.toLocaleString('tr-TR')} çalışan`);
    }
    return parts.join(' · ');
  })();

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          {greeting}
          {displayName ? `, ${displayName}` : ''}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-[#525252]">{subtitle}</p>}
      </div>
      <p className="text-sm text-[#A3A3A3]">{dateStr}</p>
    </div>
  );
};
