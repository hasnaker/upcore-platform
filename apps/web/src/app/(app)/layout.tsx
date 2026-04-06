import { AppSidebar } from '@/components/app/AppSidebar';
import { AppTopbar } from '@/components/app/AppTopbar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth temporarily disabled for dev testing
  // await requireAuth();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fafafa]">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1200px] px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
