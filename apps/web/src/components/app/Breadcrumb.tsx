'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const PATH_LABELS: Record<string, string> = {
  'panel': 'Aksiyon Merkezi',
  'executive': 'Yönetici Paneli',
  'calisanlar': 'Çalışanlar',
  'yeni': 'Yeni Çalışan',
  'duzenle': 'Düzenle',
  'departmanlar': 'Departmanlar',
  'izinler': 'İzinler',
  'belgeler': 'Belgeler',
  'tukenmislik': 'Tükenmişlik',
  'anketler': 'Anketler',
  'cevapla': 'Anketi Cevapla',
  'sonuclar': 'Sonuçlar',
  'degerlendirmeler': 'Değerlendirmeler',
  'guclu-yonler': 'Güçlü Yönler',
  'kesfet': 'Keşfet',
  'performans': 'Performans',
  '9box': '9-Box Matrisi',
  'kariyer': 'Kariyer & Mobilite',
  'succession': 'Yedekleme Planı',
  'ucretlendirme': 'Ücretlendirme',
  'egitim': 'Eğitim & Gelişim',
  'baglilik': 'Bağlılık',
  'is-akislari': 'İş Akışları',
  'tahminler': 'AI Tahminler',
  'onboarding-yonetimi': 'Onboarding',
  'organizasyon': 'Organizasyon',
  'raporlar': 'Raporlar',
  'analytics': 'Analitik',
  'aksiyonlar': 'Aksiyonlar',
  'ayarlar': 'Ayarlar',
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Don't show breadcrumb on root-level pages (only 1 segment)
  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label = PATH_LABELS[seg] || seg;
    const isLast = i === segments.length - 1;
    // Skip UUID segments in breadcrumb display
    const isUuid = /^[0-9a-f]{8}-/.test(seg);
    if (isUuid) return { href, label: 'Detay', isLast };
    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1 text-[12px]" aria-label="Breadcrumb">
      <Link href="/panel" className="text-[#888] hover:text-[#111] transition">
        Ana Sayfa
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-[#ccc]" />
          {crumb.isLast ? (
            <span className="font-medium text-[#111]">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="text-[#888] hover:text-[#111] transition">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
