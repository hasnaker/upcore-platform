import Script from 'next/script';

// Plausible Analytics — cookie-less, GDPR/KVKK tam uyumlu.
// NEXT_PUBLIC_PLAUSIBLE_DOMAIN tanımlı değilse hiçbir şey render etmez,
// bu sayede dev / preview ortamları temiz kalır.
// Scroll-depth ve outbound-link plugin'leri standart olarak açılır.
export function PlausibleAnalytics() {
  const domain = process.env['NEXT_PUBLIC_PLAUSIBLE_DOMAIN'];
  const scriptSrc =
    process.env['NEXT_PUBLIC_PLAUSIBLE_SRC'] ??
    'https://plausible.io/js/script.outbound-links.tagged-events.js';
  if (!domain) return null;
  return (
    <Script
      defer
      strategy="afterInteractive"
      data-domain={domain}
      src={scriptSrc}
    />
  );
}
