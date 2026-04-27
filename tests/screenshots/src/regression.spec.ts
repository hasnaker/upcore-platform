// -----------------------------------------------------------------------------
// regression.spec.ts — Visual regression baseline using Playwright's
// toHaveScreenshot(). Tolerates 3% pixel diff (font rendering, sub-pixel AA).
//
// First run (or `--update-snapshots`) writes baselines under `baselines/`.
// Subsequent runs compare pixel-for-pixel; diff images land under
// `test-results/` when mismatch > threshold.
// -----------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import { injectDemoAuth, disableAnimations, applyTheme, waitForSceneReady } from './capture-helpers';
import { ALL_SCENES } from './scenes';

test.describe.configure({ mode: 'serial' });

for (const scene of ALL_SCENES) {
  test(`regression: ${scene.module}/${scene.scene}`, async ({ page, context }) => {
    await injectDemoAuth(context);
    await page.goto(scene.path, { waitUntil: 'domcontentloaded' });
    await disableAnimations(page);
    await applyTheme(page, 'light');
    await waitForSceneReady(page, scene);

    await expect(page).toHaveScreenshot(`${scene.module}-${scene.scene}.png`, {
      fullPage: false,
      animations: 'disabled',
      caret: 'hide',
      // 3% pixel tolerance — accommodates OS font-rendering variance.
      maxDiffPixelRatio: 0.03,
      threshold: 0.2,
    });
  });
}
