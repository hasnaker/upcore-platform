// Viewport definitions used by Playwright projects + scene captures.
// Desktop matches marketing site hero breakpoints; mobile matches iPhone SE/13 Pro width.

export const DESKTOP_VIEWPORT = { width: 1920, height: 1080 } as const;
export const MOBILE_VIEWPORT = { width: 375, height: 812 } as const;

export type Viewport = 'desktop' | 'mobile';
export type Theme = 'light' | 'dark';

export interface ViewportConfig {
  readonly name: Viewport;
  readonly width: number;
  readonly height: number;
  readonly deviceScaleFactor: number;
}

export const VIEWPORTS: Record<Viewport, ViewportConfig> = {
  desktop: { name: 'desktop', ...DESKTOP_VIEWPORT, deviceScaleFactor: 2 },
  mobile: { name: 'mobile', ...MOBILE_VIEWPORT, deviceScaleFactor: 2 },
};
