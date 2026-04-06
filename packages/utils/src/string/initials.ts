/**
 * Avatar initials extraction from Turkish names.
 */
import { turkishSafeUpperCase } from '../turkish/diacritics';

/**
 * Extracts initials from a Turkish name for avatar display.
 * Takes the first letter of the first name and the first letter of the last name.
 *
 * @example
 * getInitials("Mehmet Ali", "Yılmaz")    // "MY"
 * getInitials("Ayşe", "Öztürk-Demir")    // "AÖ"
 * getInitials("Fatma", "")                // "F"
 */
export const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName.trim();
  const last = lastName.trim();

  let initials = '';

  if (first.length > 0) {
    // Use Array.from for multi-byte chars (İ, etc.)
    const firstChar = Array.from(first)[0];
    if (firstChar) {
      initials += turkishSafeUpperCase(firstChar);
    }
  }

  if (last.length > 0) {
    const lastChar = Array.from(last)[0];
    if (lastChar) {
      initials += turkishSafeUpperCase(lastChar);
    }
  }

  return initials;
};
