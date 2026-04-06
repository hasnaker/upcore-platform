/**
 * cn() utility — combines clsx and tailwind-merge for conditional class names.
 * Shared between @upcore/utils and @upcore/design-system.
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names with Tailwind CSS conflict resolution.
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary', 'px-6')
 * // → "py-2 px-6 bg-primary" (px-4 overridden by px-6)
 */
export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};
