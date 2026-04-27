import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

// PWA web app manifest — iOS + Android "Ana ekrana ekle".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: 'UpCore',
    description: siteConfig.description,
    start_url: '/panel',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#5e5ce6',
    lang: 'tr-TR',
    categories: ['business', 'productivity', 'hr'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
