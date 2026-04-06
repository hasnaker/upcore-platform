/**
 * Upcore Nordic Minimal color palette.
 *
 * The palette favors neutrals and negative space, with a single violet accent
 * (#5E5CE6) used sparingly for interactive states and focus rings. Semantic
 * colors use a soft/solid pair so surfaces can pair a tinted background with
 * its saturated counterpart at AA contrast.
 */
export const colors = {
  // Neutral surfaces
  bg: '#FFFFFF',
  bg2: '#FAFAFA',
  bg3: '#F5F5F5',

  // Ink (text) — 5 stops
  ink: '#0A0A0A',
  ink80: '#262626',
  ink60: '#525252',
  ink40: '#A3A3A3',
  ink20: '#D4D4D4',

  // Lines / separators
  line: '#EDEDED',

  // Brand accent (violet)
  accent: '#5E5CE6',
  accentSoft: '#EEF0FD',

  // Semantic — solid + soft pairs
  red: '#DC2626',
  redSoft: '#FEE2E2',
  amber: '#D97706',
  amberSoft: '#FEF3C7',
  green: '#059669',
  greenSoft: '#D1FAE5',
  teal: '#0D9488',
  tealSoft: '#CCFBF1',
} as const;

export type ColorToken = keyof typeof colors;

/**
 * Semantic aliases used by components (maps to the base palette).
 */
export const semanticColors = {
  background: colors.bg,
  surface: colors.bg2,
  surfaceMuted: colors.bg3,
  border: colors.line,
  foreground: colors.ink,
  foregroundMuted: colors.ink60,
  foregroundSubtle: colors.ink40,
  primary: colors.accent,
  primarySoft: colors.accentSoft,
  danger: colors.red,
  dangerSoft: colors.redSoft,
  warning: colors.amber,
  warningSoft: colors.amberSoft,
  success: colors.green,
  successSoft: colors.greenSoft,
  info: colors.teal,
  infoSoft: colors.tealSoft,
} as const;

export type SemanticColorToken = keyof typeof semanticColors;
