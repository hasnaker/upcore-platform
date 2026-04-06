/**
 * Corner radii. Nordic Minimal uses consistent 6–8px on interactive surfaces,
 * 10–12px on cards/modals, 14px only on overlay sheets.
 */
export const radii = {
  none: '0px',
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '10px',
  xl: '12px',
  '2xl': '14px',
  full: '9999px',
} as const;

export type RadiusToken = keyof typeof radii;
