#!/usr/bin/env node
/**
 * UpCore docs — toplu sayfa üretim.
 * İçerik markdown olarak aynı dizindeki content-*.md dosyalarındadır.
 *
 * Her dosyada sayfalar "===PAGE id=... title=... pos=N===" başlıkları ile ayrılır.
 *
 * Yerleşim kuralı:
 *   content-ik-modul-<modul>.md  → docs/ik/modul/<modul>/...
 *   content-<other>.md           → docs/ik/modul/<other>/...  (varsayılan - geri uyum)
 *   content-admin.md             → docs/admin/... (id "tenant-foo" → docs/admin/tenant/foo.md)
 *   content-developer.md         → docs/developer/... (id "api-foo" → docs/developer/api/foo.md)
 *   content-ml-cards.md          → docs/developer/ml/...
 */

import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, "content");
const DOCS_ROOT = join(__dirname, "..", "docs");

const PAGE_REGEX = /^===PAGE\s+id=(\S+)\s+title=(.+?)\s+pos=(\d+)===\s*$/;

const ROUTING = {
  performans: { base: "ik/modul/performans", splitId: false },
  mobility: { base: "ik/modul/mobility", splitId: false },
  gelistirme: { base: "ik/modul/gelistirme", splitId: false },
  "ik-ops": { base: "ik/modul/ik-ops", splitId: false },
  analitik: { base: "ik/modul/analitik", splitId: false },
  kvkk: { base: "ik/modul/kvkk", splitId: false },
  admin: { base: "admin", splitId: true },
  developer: { base: "developer", splitId: true },
  "ml-cards": { base: "developer/ml", splitId: false },
};

async function processFile(file) {
  const name = file.replace(/\.md$/, "").replace(/^content-/, "");
  const route = ROUTING[name] || { base: `ik/modul/${name}`, splitId: false };
  const full = await readFile(join(CONTENT_DIR, file), "utf8");
  const lines = full.split("\n");
  let current = null;
  const pages = [];
  for (const line of lines) {
    const m = line.match(PAGE_REGEX);
    if (m) {
      if (current) pages.push(current);
      current = { id: m[1], title: m[2].trim(), pos: Number(m[3]), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) pages.push(current);

  for (const p of pages) {
    let targetDir, fileId;
    if (route.splitId) {
      // id = "group-slug" → docs/admin/group/slug.md
      const idx = p.id.indexOf("-");
      if (idx <= 0) {
        // no group — put at root
        targetDir = join(DOCS_ROOT, route.base);
        fileId = p.id;
      } else {
        const group = p.id.slice(0, idx);
        fileId = p.id.slice(idx + 1);
        targetDir = join(DOCS_ROOT, route.base, group);
      }
    } else {
      targetDir = join(DOCS_ROOT, route.base);
      fileId = p.id;
    }
    await mkdir(targetDir, { recursive: true });
    const fm = `---\nid: ${fileId}\ntitle: ${JSON.stringify(p.title)}\nsidebar_position: ${p.pos}\n---\n\n`;
    const filePath = join(targetDir, `${fileId}.md`);
    await writeFile(filePath, fm + p.body.join("\n").trim() + "\n", "utf8");
    console.log("✓", filePath);
  }
  return pages.length;
}

const files = (await readdir(CONTENT_DIR)).filter((f) => f.startsWith("content-") && f.endsWith(".md"));
let total = 0;
for (const f of files) total += await processFile(f);
console.log(`\nToplam üretilen: ${total} sayfa, ${files.length} dosyadan.`);
