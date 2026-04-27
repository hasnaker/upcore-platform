// Türkçe okuma hızı ortalaması (200 WPM) bazlı basit okuma süresi tahmini.
// `reading-time` paketinin bağımlı muadili; markdown işaretlerini eler,
// sadece anlamlı kelime sayar.

export function computeReadingTime(markdown: string): {
  minutes: number;
  words: number;
} {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = stripped ? stripped.split(' ').length : 0;
  const minutes = Math.max(1, Math.round(words / 200));
  return { minutes, words };
}
