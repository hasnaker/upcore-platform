'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Breadcrumb } from './Breadcrumb';

const PAGE_TITLES: Record<string, string> = {
  '/panel': 'Aksiyon Merkezi',
  '/executive': 'Yönetici Paneli',
  '/calisanlar': 'Çalışanlar',
  '/departmanlar': 'Departmanlar',
  '/izinler': 'İzinler',
  '/belgeler': 'Belgeler',
  '/tukenmislik': 'Tükenmişlik',
  '/anketler': 'Anketler',
  '/degerlendirmeler': 'Değerlendirmeler',
  '/guclu-yonler': 'Güçlü Yönler',
  '/performans': 'Performans Yönetimi',
  '/kariyer': 'Kariyer & Mobilite',
  '/analytics': 'Analitik',
  '/aksiyonlar': 'Aksiyonlar',
  '/ayarlar': 'Ayarlar',
};

interface Notification {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  body: string;
  source: string;
  createdAt: string;
  read: boolean;
}

const PRIORITY_CONFIG = {
  critical: { color: '#DC2626', bg: '#FEE2E2', label: 'Kritik' },
  high: { color: '#D97706', bg: '#FEF3C7', label: 'Yüksek' },
  medium: { color: '#5E5CE6', bg: '#f0f0ff', label: 'Orta' },
  low: { color: '#059669', bg: '#D1FAE5', label: 'Düşük' },
};

interface AppTopbarProps {
  onMenuToggle?: () => void;
}

export function AppTopbar({ onMenuToggle }: AppTopbarProps) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? 'Upcore';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => {
        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#f0f0f0] bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-1.5 text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#111] md:hidden"
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-[15px] font-semibold text-[#111]">{title}</h1>
          <Breadcrumb />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-lg border border-[#eee] bg-[#fafafa] px-3 py-1.5 md:flex">
          <svg className="h-3.5 w-3.5 text-[#aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[12px] text-[#aaa]">Ara...</span>
          <kbd className="ml-4 rounded border border-[#e5e5e5] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#bbb]">⌘K</kbd>
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative rounded-lg p-2 text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#111]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[380px] overflow-hidden rounded-xl border border-[#f0f0f0] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] px-4 py-3">
                <span className="text-[13px] font-semibold text-[#111]">Bildirimler</span>
                <span className="rounded-full bg-[#f0f0ff] px-2 py-0.5 text-[11px] font-semibold text-[#5E5CE6]">
                  {unreadCount} yeni
                </span>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-[#888]">
                    Bildirim yok
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => {
                    const config = PRIORITY_CONFIG[n.priority];
                    return (
                      <div key={n.id} className="flex gap-3 border-b border-[#f8f8f8] px-4 py-3 transition hover:bg-[#fafafa]">
                        <div
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: config.bg }}
                        >
                          <span className="text-[10px] font-bold" style={{ color: config.color }}>
                            {n.type === 'risk' ? '!' : n.type === 'deadline' ? '⏰' : n.type === 'feedback' ? '360' : '•'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-[#111]">{n.title}</span>
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                              style={{ background: config.bg, color: config.color }}
                            >
                              {config.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#666]">{n.body}</p>
                          <span className="mt-1 text-[10px] text-[#aaa]">{n.source}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {notifications.length > 0 && (
                <div className="border-t border-[#f0f0f0] p-2">
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="w-full rounded-lg py-2 text-center text-[12px] font-medium text-[#5E5CE6] transition hover:bg-[#f0f0ff]"
                  >
                    Tüm Bildirimleri Gör
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
