// Tarih/sayı formatlama — Türkçe yerel ayar.
// date-fns / dayjs bağımlılığı yerine Intl API kullanılır.

export function formatBlogDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatBlogDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
