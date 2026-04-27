// Türkçe karakterleri ASCII'ye indirger ve URL-safe slug üretir.
// Heading id'leri ve dahili karşılaştırmalar için tek kaynak.

const TR_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

export function slugify(input: string): string {
  const lowered = Array.from(input)
    .map((ch) => TR_MAP[ch] ?? ch)
    .join('')
    .toLowerCase();
  return lowered
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}
