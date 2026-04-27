'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';
import { CommandPalette } from './CommandPalette';
import { HelpWidget } from '@/components/support/HelpWidget';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fafafa]">
      {/* A11y: Skip-to-content — klavye kullanıcısı Tab'ladığında görünür olur */}
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[60] inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-white shadow focus:not-sr-only focus-visible:not-sr-only"
      >
        Ana içeriğe atla
      </a>

      {/* Global Search (Cmd+K) */}
      <CommandPalette />
      <HelpWidget />

      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 transition-opacity"
            onClick={closeSidebar}
            aria-hidden="true"
          />
          {/* Sidebar panel */}
          <div className="relative z-50 flex">
            <AppSidebar />
            <button
              onClick={closeSidebar}
              className="absolute right-2 top-3 rounded-lg p-1.5 text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#111]"
              aria-label="Menüyü kapat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar onMenuToggle={toggleSidebar} />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto focus:outline-none"
        >
          <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
