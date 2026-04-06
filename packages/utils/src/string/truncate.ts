/**
 * Safe text truncation with ellipsis, respecting multi-byte characters.
 */

/**
 * Truncates a string to the given max length, appending an ellipsis if truncated.
 * Will not split multi-byte characters.
 *
 * @param s       - Input string
 * @param maxLen  - Maximum length of the result (including ellipsis)
 * @param ellipsis - Ellipsis string (default: "...")
 *
 * @example
 * truncate("Hello World", 8)  // "Hello..."
 * truncate("Hi", 10)          // "Hi"
 */
export const truncate = (s: string, maxLen: number, ellipsis: string = '...'): string => {
  if (s.length <= maxLen) return s;

  const truncLen = maxLen - ellipsis.length;
  if (truncLen <= 0) return ellipsis.slice(0, maxLen);

  // Use Array.from to handle multi-byte characters correctly
  const chars = Array.from(s);
  if (chars.length <= maxLen) return s;

  return chars.slice(0, truncLen).join('') + ellipsis;
};

/**
 * Truncates a string in the middle, preserving start and end.
 *
 * @example
 * truncateMiddle("abcdefghijklmnop", 10)  // "abcd...nop"
 */
export const truncateMiddle = (s: string, maxLen: number): string => {
  if (s.length <= maxLen) return s;

  const ellipsis = '...';
  const availableLen = maxLen - ellipsis.length;
  if (availableLen <= 0) return ellipsis.slice(0, maxLen);

  const frontLen = Math.ceil(availableLen / 2);
  const backLen = Math.floor(availableLen / 2);

  const chars = Array.from(s);
  const front = chars.slice(0, frontLen).join('');
  const back = chars.slice(-backLen).join('');

  return `${front}${ellipsis}${back}`;
};
