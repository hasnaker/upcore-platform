/**
 * Motion tokens. Three durations cover everything in Upcore:
 * - fast (150ms): hover / press / focus transitions
 * - base (200ms): appear / disappear of inline UI (dropdowns, tooltips)
 * - slow (300ms): larger surfaces (dialogs, drawers)
 */
export const duration = {
  instant: '0ms',
  fast: '150ms',
  base: '200ms',
  slow: '300ms',
} as const;

export const easing = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

/**
 * Composite transition strings for Tailwind's `transition` utility.
 */
export const transitions = {
  colors: `background-color ${duration.fast} ${easing.standard}, border-color ${duration.fast} ${easing.standard}, color ${duration.fast} ${easing.standard}, fill ${duration.fast} ${easing.standard}, stroke ${duration.fast} ${easing.standard}`,
  opacity: `opacity ${duration.fast} ${easing.standard}`,
  transform: `transform ${duration.base} ${easing.standard}`,
  all: `all ${duration.fast} ${easing.standard}`,
} as const;

export type DurationToken = keyof typeof duration;
export type EasingToken = keyof typeof easing;
