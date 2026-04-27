#!/usr/bin/env node
/**
 * UpCore docs — Lighthouse CI runner.
 *
 * Build sonrası 3 kritik sayfada Lighthouse testi çalıştırır.
 * Hedef: SEO 95+, Performance 90+, Accessibility 95+, Best Practices 95+.
 *
 * Gerekli: `npm i -D lighthouse chrome-launcher`.
 * Hedef URL'ler CI'da env var ile override edilebilir.
 */

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const TARGETS = [
  process.env.LH_HOME_URL || "http://localhost:3100/",
  process.env.LH_IK_URL ||
    "http://localhost:3100/docs/ik/hizli-baslangic/ilk-15-dakika",
  process.env.LH_DEV_URL ||
    "http://localhost:3100/docs/developer/api/genel-bakis",
];

const THRESHOLDS = {
  performance: 0.9,
  accessibility: 0.95,
  "best-practices": 0.95,
  seo: 0.95,
};

async function runLighthouse(url) {
  console.log(`\n▶ Lighthouse → ${url}`);
  return new Promise((resolve, reject) => {
    const cp = spawn(
      "npx",
      [
        "--yes",
        "lighthouse",
        url,
        "--output=json",
        "--output=html",
        `--output-path=./.lighthouse/${encodeURIComponent(url)}`,
        "--chrome-flags=--headless=new --no-sandbox",
        "--preset=desktop",
        "--quiet",
      ],
      { stdio: "inherit", shell: false },
    );
    cp.on("error", reject);
    cp.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`lighthouse exited ${code}`));
    });
  });
}

async function parseReport(url) {
  const path = `./.lighthouse/${encodeURIComponent(url)}.report.json`;
  const text = await (await fetch("file://" + process.cwd() + "/" + path)).text();
  const data = JSON.parse(text);
  const scores = {};
  for (const cat of Object.keys(THRESHOLDS)) {
    scores[cat] = data.categories[cat]?.score ?? 0;
  }
  return scores;
}

let failed = false;
for (const url of TARGETS) {
  try {
    await runLighthouse(url);
    await sleep(250);
    const scores = await parseReport(url);
    console.log("  Skor:", scores);
    for (const [cat, threshold] of Object.entries(THRESHOLDS)) {
      if (scores[cat] < threshold) {
        console.error(
          `  ✗ ${cat} = ${scores[cat]} < ${threshold} (${url})`,
        );
        failed = true;
      } else {
        console.log(`  ✓ ${cat} = ${scores[cat]} (>= ${threshold})`);
      }
    }
  } catch (err) {
    console.error(`[hata] ${url}:`, err.message);
    failed = true;
  }
}

if (failed) {
  console.error("\n✗ Lighthouse eşikleri sağlanamadı.");
  process.exit(1);
}
console.log("\n✓ Tüm Lighthouse eşikleri geçti.");
