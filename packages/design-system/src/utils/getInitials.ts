/**
 * Get up to two uppercase initials from a person's name.
 *
 * Handles Turkish characters (İ, Ş, Ğ, Ü, Ö, Ç) correctly via `toLocaleUpperCase('tr-TR')`.
 */
export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const parts: string[] = [];
  if (firstName) {
    const first = firstName.trim().charAt(0);
    if (first) parts.push(first);
  }
  if (lastName) {
    const last = lastName.trim().charAt(0);
    if (last) parts.push(last);
  }
  return parts.join('').toLocaleUpperCase('tr-TR');
}
