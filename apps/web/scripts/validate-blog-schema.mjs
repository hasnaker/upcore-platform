#!/usr/bin/env node
// UpCore blog Schema.org JSON-LD doğrulayıcısı.
// Build sonrası .next/server/app üzerindeki HTML çıktısı okunmaz,
// bunun yerine dev/prod URL'lerine HTTP isteği yaparak script[type="application/ld+json"]
// blokları toplanır ve her post için zorunlu alanlar sağlanmış mı diye kontrol edilir.
//
// Kullanım:
//   node scripts/validate-blog-schema.mjs [--base http://localhost:3000]
//
// Çıkış kodu:
//   0 = tüm kontroller OK
//   1 = en az bir şema hatası var

import { argv, exit } from 'node:process';

const BASE = argv.includes('--base')
  ? argv[argv.indexOf('--base') + 1]
  : 'http://localhost:3000';

const POSTS = [
  '2026-01-tukenmislik-nedir-mbi-vs-bat-tr',
  '2026-01-jdr-modeli-kaynak-gereksinim',
  '2026-02-9-kutu-kalibrasyonu-cinsiyet-onyargisi',
  '2026-02-belediyelerde-tukenmislik-2026',
  '2026-02-okr-vs-kpi-hangi-durum',
  '2026-03-ankara-holding-4000-calisan-8-hafta',
  '2026-03-holding-mobility-ic-ilan',
  '2026-03-samsun-sbb-657-pilot',
  '2026-03-startup-scaleup-ik-teknolojisi',
  '2026-04-kvkk-kurul-karari-calisan-verisi',
  '2026-04-neden-mind-garden-lisansi-almadik',
  '2026-04-prof-ayse-kocak-psikometrik-olcek',
];

const REQUIRED_ARTICLE = [
  '@type',
  'headline',
  'description',
  'datePublished',
  'author',
  'publisher',
  'mainEntityOfPage',
  'image',
  'wordCount',
];

async function fetchSchemas(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const html = await res.text();
  const matches = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  return matches.map((m) => {
    try {
      return JSON.parse(m[1]);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function validateArticle(slug, schemas) {
  const article = schemas.find((s) => s['@type'] === 'Article');
  if (!article) return [`Article schema missing for ${slug}`];
  const errors = [];
  for (const key of REQUIRED_ARTICLE) {
    if (!article[key]) errors.push(`${slug}: missing Article.${key}`);
  }
  if (article.author && article.author['@type'] !== 'Person') {
    errors.push(`${slug}: Article.author.@type must be Person`);
  }
  if (article.publisher && article.publisher['@type'] !== 'Organization') {
    errors.push(`${slug}: Article.publisher.@type must be Organization`);
  }
  const breadcrumb = schemas.find((s) => s['@type'] === 'BreadcrumbList');
  if (!breadcrumb) errors.push(`${slug}: BreadcrumbList missing`);
  return errors;
}

async function main() {
  const errors = [];
  for (const slug of POSTS) {
    try {
      const url = `${BASE}/blog/${slug}`;
      const schemas = await fetchSchemas(url);
      const slugErrors = validateArticle(slug, schemas);
      if (slugErrors.length) errors.push(...slugErrors);
      else console.log(`OK  ${slug} (${schemas.length} schemas)`);
    } catch (e) {
      errors.push(`${slug}: ${e.message}`);
    }
  }
  console.log('');
  if (errors.length) {
    console.error('Schema validation failed:');
    for (const e of errors) console.error(' -', e);
    exit(1);
  } else {
    console.log(`All ${POSTS.length} posts passed Schema.org validation.`);
  }
}

main().catch((e) => {
  console.error(e);
  exit(1);
});
