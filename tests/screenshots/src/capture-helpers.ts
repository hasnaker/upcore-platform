// -----------------------------------------------------------------------------
// capture-helpers.ts — shared Playwright helpers for screenshot scenes.
// -----------------------------------------------------------------------------

import type { Page, BrowserContext, TestInfo } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { Scene, Module } from './scenes';
import type { Theme, Viewport } from './viewports';

// Resolve the marketing output directory relative to this file, which lives in
// upcore-platform/tests/screenshots/src/. The marketing site is at
// upcore-platform/apps/marketing/public/screenshots/.
// Works under both CJS (Playwright default) and ESM runners.
function resolveRootRelative(...segments: readonly string[]): string {
  // In CJS (Playwright default transpile), __dirname is defined.
  // In ESM, fallback to process.cwd() which Playwright sets to the config dir.
  const dir =
    typeof __dirname !== 'undefined'
      ? __dirname
      : path.resolve(process.cwd(), 'src');
  return path.resolve(dir, ...segments);
}

export const OUTPUT_DIR = resolveRootRelative(
  '..',
  '..',
  '..',
  'apps',
  'marketing',
  'public',
  'screenshots',
);

/** Inject a demo admin session so the dashboard routes render without real auth. */
export async function injectDemoAuth(context: BrowserContext): Promise<void> {
  // The app currently has auth disabled in development (apps/web/src/app/(app)/layout.tsx),
  // but we still ship a bypass cookie + JWT-shaped token so that when auth is
  // re-enabled via NEXT_PUBLIC_E2E_BYPASS_AUTH, the session is available.
  const demoJWT = [
    // Header (alg=none marker — test-only)
    'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0',
    // Payload — demo admin
    btoa(
      JSON.stringify({
        sub: 'demo-admin',
        tenant_id: '00000000-0000-0000-0000-0000000000d0',
        tenant_slug: 'demo-co',
        email: 'admin@demo.upcore.dev',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      }),
    )
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_'),
    '', // empty signature — accepted only when E2E_BYPASS_AUTH=1
  ].join('.');

  await context.addCookies([
    {
      name: '__upcore_demo_session',
      value: demoJWT,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'upcore_e2e_bypass',
      value: '1',
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Seed storage so client-side hydration picks up tenant info.
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('upcore.tenant_slug', 'demo-co');
      window.localStorage.setItem('upcore.tenant_id', '00000000-0000-0000-0000-0000000000d0');
      window.localStorage.setItem('upcore.user_role', 'admin');
    } catch {
      /* storage unavailable in some contexts — ignore */
    }
  });
}

/** Disables CSS transitions, animations, smooth scrolling, and caret blink for deterministic capture. */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
      }
      html { scroll-behavior: auto !important; }
      /* Hide anything marked explicitly as noise (cursors, busy spinners) */
      [data-screenshot-hide] { visibility: hidden !important; }
    `,
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

/** Applies dark / light theme by toggling the html[data-theme] attribute. */
export async function applyTheme(page: Page, theme: Theme): Promise<void> {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((t) => {
    document.documentElement.dataset['theme'] = t;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(t);
  }, theme);
}

/** Waits until the scene's key element is present and network is idle. */
export async function waitForSceneReady(page: Page, scene: Scene): Promise<void> {
  if (scene.waitFor) {
    await page
      .locator(scene.waitFor)
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => {
        /* fall through — page may render before selector for some routes */
      });
  }
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {
    /* networkidle is best-effort for streaming routes */
  });
  // Brief stabilization for any post-paint chart draws.
  await page.waitForTimeout(400);
}

/** Runs any scene-specific setup hook. */
export async function runSceneSetup(page: Page, scene: Scene): Promise<void> {
  if (!scene.setup) return;
  switch (scene.setup) {
    case 'openDrillDown':
      await page
        .getByRole('button', { name: /drill|detay|aç/i })
        .first()
        .click({ timeout: 3_000 })
        .catch(() => {
          /* optional */
        });
      break;
    case 'openRadar':
      await page
        .getByRole('tab', { name: /radar|grafik/i })
        .first()
        .click({ timeout: 3_000 })
        .catch(() => {
          /* optional */
        });
      break;
    case 'openNineBox':
      await page
        .getByRole('button', { name: /kalibrasyon|toplantı/i })
        .first()
        .click({ timeout: 3_000 })
        .catch(() => {
          /* optional */
        });
      break;
    case 'expandCard':
      await page
        .locator('[data-expand], [aria-expanded="false"]')
        .first()
        .click({ timeout: 3_000 })
        .catch(() => {
          /* optional */
        });
      break;
  }
  await page.waitForTimeout(300);
}

/** Computes the output filename: <module>-<scene>-<viewport>-<theme>.webp */
export function outputFilename(
  scene: Scene,
  viewport: Viewport,
  theme: Theme,
  ext: 'webp' | 'png' = 'webp',
): string {
  return `${scene.module}-${scene.scene}-${viewport}-${theme}.${ext}`;
}

/** Full absolute output path for a given capture. */
export function outputPath(
  scene: Scene,
  viewport: Viewport,
  theme: Theme,
  ext: 'webp' | 'png' = 'webp',
): string {
  return path.join(OUTPUT_DIR, outputFilename(scene, viewport, theme, ext));
}

/** Ensures the output directory exists. */
export async function ensureOutputDir(): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

/**
 * Captures a PNG via Playwright and writes both .png and .webp to disk.
 * WebP conversion uses the Playwright-bundled Chromium `image.jpeg` encoder
 * path — because Chromium itself doesn't expose WebP from `page.screenshot`,
 * we rely on the browser's `toDataURL('image/webp')` inside a temporary page.
 */
export async function capturePngAndWebp(
  page: Page,
  pngPath: string,
  webpPath: string,
): Promise<void> {
  const pngBuffer = await page.screenshot({
    type: 'png',
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
    scale: 'device',
  });
  await fs.writeFile(pngPath, pngBuffer);

  // Convert PNG → WebP through an in-browser canvas (keeps zero-dep footprint).
  const webpBuffer = await pngToWebp(page, pngBuffer);
  await fs.writeFile(webpPath, webpBuffer);
}

async function pngToWebp(page: Page, png: Buffer): Promise<Buffer> {
  const dataURL = `data:image/png;base64,${png.toString('base64')}`;
  const webpBase64 = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('image decode failed'));
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable');
    ctx.drawImage(img, 0, 0);
    const url = canvas.toDataURL('image/webp', 0.92);
    const parts = url.split(',');
    if (parts.length < 2 || !parts[1]) {
      throw new Error('webp encoder returned empty payload');
    }
    return parts[1];
  }, dataURL);

  return Buffer.from(webpBase64, 'base64');
}

/** Appends the scene metadata to a manifest json used by the marketing site. */
export async function appendManifest(entry: {
  readonly module: Module | string;
  readonly scene: string;
  readonly viewport: Viewport;
  readonly theme: Theme;
  readonly file: string;
  readonly alt: string;
  readonly capturedAt: string;
}): Promise<void> {
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  let current: Array<Record<string, unknown>> = [];
  try {
    const raw = await fs.readFile(manifestPath, 'utf-8');
    current = JSON.parse(raw) as Array<Record<string, unknown>>;
  } catch {
    current = [];
  }
  // Deduplicate by (module+scene+viewport+theme)
  const key = `${entry.module}|${entry.scene}|${entry.viewport}|${entry.theme}`;
  const filtered = current.filter(
    (c) => `${c['module']}|${c['scene']}|${c['viewport']}|${c['theme']}` !== key,
  );
  filtered.push(entry);
  await fs.writeFile(manifestPath, JSON.stringify(filtered, null, 2), 'utf-8');
}

/** Convenience wrapper: logs to TestInfo's attachment for CI visibility. */
export async function recordAttachment(
  testInfo: TestInfo,
  name: string,
  file: string,
): Promise<void> {
  await testInfo.attach(name, { path: file, contentType: 'image/webp' });
}
