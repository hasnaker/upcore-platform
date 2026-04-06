/**
 * Typography tokens. Inter is loaded via @next/font or an app-level @font-face
 * rule. The scale is conservative (8 steps) — Nordic Minimal prefers density
 * over variety.
 */
export const fontFamily = {
  sans: [
    'Inter',
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  mono: [
    'JetBrains Mono',
    'ui-monospace',
    'SFMono-Regular',
    'Menlo',
    'Monaco',
    'Consolas',
    'monospace',
  ],
} as const;

/**
 * Inter OpenType features we always enable: ss01 (alternate single-story a),
 * cv11 (alternate g), and tnum (tabular numerals for tables).
 */
export const fontFeatureSettings = '"ss01", "cv11", "tnum"';

export const fontSize = {
  xs: '0.75rem', // 12
  sm: '0.8125rem', // 13
  base: '0.875rem', // 14 — default body
  md: '0.9375rem', // 15
  lg: '1rem', // 16
  xl: '1.125rem', // 18
  '2xl': '1.375rem', // 22
  '3xl': '1.75rem', // 28
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
} as const;

export const letterSpacing = {
  tight: '-0.01em',
  normal: '0',
  wide: '0.02em',
} as const;

export type FontSizeToken = keyof typeof fontSize;
export type FontWeightToken = keyof typeof fontWeight;
