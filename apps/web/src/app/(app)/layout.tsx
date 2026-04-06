import { AppShell } from '@/components/app/AppShell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth temporarily disabled for dev testing
  // await requireAuth();

  return <AppShell>{children}</AppShell>;
}
