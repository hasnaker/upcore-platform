/**
 * Shadow scale. Very restrained — Nordic surfaces rely on borders + background
 * shifts rather than elevation. The largest shadow is still subtle.
 */
export const shadows = {
  none: 'none',
  xs: '0 1px 2px rgba(10, 10, 10, 0.04)',
  sm: '0 1px 2px rgba(10, 10, 10, 0.05)',
  md: '0 2px 4px rgba(10, 10, 10, 0.06), 0 1px 2px rgba(10, 10, 10, 0.04)',
  lg: '0 8px 24px rgba(10, 10, 10, 0.08), 0 2px 6px rgba(10, 10, 10, 0.04)',
  focus: '0 0 0 2px #5E5CE6',
} as const;

export type ShadowToken = keyof typeof shadows;
