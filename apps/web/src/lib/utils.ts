type ClassValue = string | number | boolean | null | undefined | ClassValue[] | { [key: string]: boolean | null | undefined };

/**
 * Minimal class-name combiner. The design-system ships a richer `cn()`
 * via `@upcore/design-system/utils`; this local helper avoids pulling the
 * full package into client bundles just for className joining.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (value: ClassValue): void => {
    if (!value) return;
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      for (const v of value) walk(v);
      return;
    }
    if (typeof value === 'object') {
      for (const [key, on] of Object.entries(value)) {
        if (on) out.push(key);
      }
    }
  };
  for (const input of inputs) walk(input);
  return out.join(' ');
}

export function formatDateTR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function slugify(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 63);
}
