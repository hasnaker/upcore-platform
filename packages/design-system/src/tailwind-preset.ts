import type { Config } from 'tailwindcss';
import { colors } from './tokens/colors';
import { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } from './tokens/typography';
import { spacing } from './tokens/spacing';
import { radii } from './tokens/radii';
import { shadows } from './tokens/shadows';
import { duration, easing } from './tokens/motion';

/**
 * Shared Tailwind preset consumed by apps/web and apps/admin. Both apps extend
 * this so tokens stay in lock-step with the design system package.
 *
 * Kebab-case variants (e.g. `text-ink-80`) mirror the TypeScript tokens
 * (`ink80`) so design intent survives both mediums.
 */
export const tailwindPreset = {
  content: [],
  theme: {
    extend: {
      colors: {
        bg: colors.bg,
        'bg-2': colors.bg2,
        'bg-3': colors.bg3,
        ink: {
          DEFAULT: colors.ink,
          80: colors.ink80,
          60: colors.ink60,
          40: colors.ink40,
          20: colors.ink20,
        },
        line: colors.line,
        accent: {
          DEFAULT: colors.accent,
          soft: colors.accentSoft,
        },
        red: {
          DEFAULT: colors.red,
          soft: colors.redSoft,
        },
        amber: {
          DEFAULT: colors.amber,
          soft: colors.amberSoft,
        },
        green: {
          DEFAULT: colors.green,
          soft: colors.greenSoft,
        },
        teal: {
          DEFAULT: colors.teal,
          soft: colors.tealSoft,
        },
      },
      fontFamily: {
        sans: fontFamily.sans as unknown as string[],
        mono: fontFamily.mono as unknown as string[],
      },
      fontSize,
      fontWeight: fontWeight as unknown as Record<string, string>,
      lineHeight: lineHeight as unknown as Record<string, string>,
      letterSpacing,
      spacing,
      borderRadius: radii,
      boxShadow: shadows,
      transitionDuration: {
        fast: duration.fast,
        base: duration.base,
        slow: duration.slow,
      },
      transitionTimingFunction: {
        standard: easing.standard,
        emphasized: easing.emphasized,
        decelerate: easing.decelerate,
        accelerate: easing.accelerate,
      },
      borderColor: {
        DEFAULT: colors.line,
      },
    },
  },
  plugins: [],
} satisfies Partial<Config>;

export default tailwindPreset;
