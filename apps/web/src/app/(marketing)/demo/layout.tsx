import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demo Talep Et — 30 dk Canlı Gösterim',
  description:
    'UpCore demo talebi — kamu / holding / 300K+ başvuru segment özel sunum. 24 iş saati içinde dönüş, 14 günlük pilot imkânı.',
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
