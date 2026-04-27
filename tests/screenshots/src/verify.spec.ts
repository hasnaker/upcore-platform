// -----------------------------------------------------------------------------
// verify.spec.ts — End-to-end verification that the capture pipeline produced
// every expected file on disk and that manifest.json is well-formed.
//
// Does NOT launch a browser beyond the minimal setup. Pure filesystem checks.
// -----------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ALL_SCENES, MODULES } from './scenes';
import { OUTPUT_DIR } from './capture-helpers';
import type { Theme, Viewport } from './viewports';

const THEMES: readonly Theme[] = ['light', 'dark'];
const VIEWPORTS: readonly Viewport[] = ['desktop', 'mobile'];

test('manifest.json exists and is well-formed', async () => {
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  const raw = await fs.readFile(manifestPath, 'utf-8');
  const entries = JSON.parse(raw);
  expect(Array.isArray(entries)).toBe(true);
  expect(entries.length).toBeGreaterThanOrEqual(ALL_SCENES.length * 2); // at least light+dark
});

test('at least 32 unique scenes captured', () => {
  expect(ALL_SCENES.length).toBeGreaterThanOrEqual(32);
});

test('every module has ≥ 3 scenes', () => {
  for (const mod of MODULES) {
    const count = ALL_SCENES.filter((s) => s.module === mod).length;
    expect(count, `module ${mod}`).toBeGreaterThanOrEqual(3);
  }
});

test('every scene produced webp + png for every viewport + theme', async () => {
  const missing: string[] = [];
  for (const scene of ALL_SCENES) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const webp = path.join(
          OUTPUT_DIR,
          `${scene.module}-${scene.scene}-${viewport}-${theme}.webp`,
        );
        const png = path.join(
          OUTPUT_DIR,
          `${scene.module}-${scene.scene}-${viewport}-${theme}.png`,
        );
        for (const p of [webp, png]) {
          try {
            const stat = await fs.stat(p);
            if (stat.size === 0) missing.push(`empty: ${p}`);
          } catch {
            missing.push(`missing: ${p}`);
          }
        }
      }
    }
  }
  expect(missing, missing.join('\n')).toEqual([]);
});

test('no real PII in filenames (no TCKN, no real email)', async () => {
  const files = await fs.readdir(OUTPUT_DIR);
  for (const f of files) {
    expect(f).not.toMatch(/\b\d{11}\b/); // TCKN-like 11 digits
    expect(f).not.toMatch(/@(?!demo\.upcore\.dev)/); // only demo emails allowed
  }
});
