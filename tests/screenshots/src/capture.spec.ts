// -----------------------------------------------------------------------------
// capture.spec.ts — Runs every (scene × theme) tuple for the active project's
// viewport. The "capture-desktop" and "capture-mobile" Playwright projects
// share this file but execute with different viewport + deviceScaleFactor.
// -----------------------------------------------------------------------------

import { test } from '@playwright/test';
import {
  injectDemoAuth,
  disableAnimations,
  applyTheme,
  waitForSceneReady,
  runSceneSetup,
  capturePngAndWebp,
  outputPath,
  appendManifest,
  ensureOutputDir,
  recordAttachment,
} from './capture-helpers';
import { ALL_SCENES } from './scenes';
import type { Theme, Viewport } from './viewports';

const THEMES: readonly Theme[] = ['light', 'dark'];

test.beforeAll(async () => {
  await ensureOutputDir();
});

for (const scene of ALL_SCENES) {
  for (const theme of THEMES) {
    test(`${scene.module}/${scene.scene} [${theme}]`, async ({ page, context }, testInfo) => {
      // Determine viewport from the active project name.
      const viewport: Viewport = testInfo.project.name.includes('mobile') ? 'mobile' : 'desktop';

      await injectDemoAuth(context);
      await page.goto(scene.path, { waitUntil: 'domcontentloaded' });
      await disableAnimations(page);
      await applyTheme(page, theme);
      await waitForSceneReady(page, scene);
      await runSceneSetup(page, scene);
      // Final settle after setup interactions.
      await page.waitForTimeout(250);

      const webpPath = outputPath(scene, viewport, theme, 'webp');
      const pngPath = outputPath(scene, viewport, theme, 'png');

      await capturePngAndWebp(page, pngPath, webpPath);

      await appendManifest({
        module: scene.module,
        scene: scene.scene,
        viewport,
        theme,
        file: `screenshots/${scene.module}-${scene.scene}-${viewport}-${theme}.webp`,
        alt: scene.altTr,
        capturedAt: new Date().toISOString(),
      });

      await recordAttachment(testInfo, `${scene.module}-${scene.scene}-${viewport}-${theme}`, webpPath);
    });
  }
}
