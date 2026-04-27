#!/usr/bin/env node
/**
 * 17 servis için API referans sayfalarını + OpenAPI YAML'larını static/openapi/
 * klasörüne yerleştirir. Yerine geçen servis spec'i varsa (services/<id>/api/openapi.yaml),
 * orada değilse fallback olarak static/openapi/<id>.yaml korunur.
 *
 * Üretilen sayfalar: docs/developer/api/<id>.mdx — ApiReference component'ine
 * sarmalanmış.
 */

import { readFile, writeFile, mkdir, access, copyFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = join(__dirname, "..");
const SERVICES_ROOT = join(__dirname, "..", "..", "..", "services");
const STATIC_OPENAPI_DIR = join(DOCS_ROOT, "static", "openapi");
const API_DOCS_DIR = join(DOCS_ROOT, "docs", "developer", "api");

const SERVICES = [
  { id: "auth", name: "Auth", title: "Auth Servisi API Referansı", pos: 10 },
  { id: "tenant", name: "Tenant", title: "Tenant Servisi API Referansı", pos: 11 },
  { id: "employee", name: "Employee", title: "Employee Servisi API Referansı", pos: 12 },
  { id: "organization", name: "Organization", title: "Organization Servisi API Referansı", pos: 13 },
  { id: "leave", name: "Leave", title: "Leave Servisi API Referansı", pos: 14 },
  { id: "document", name: "Document", title: "Document Servisi API Referansı", pos: 15 },
  { id: "assessment", name: "Assessment", title: "Assessment Servisi API Referansı", pos: 16 },
  { id: "survey", name: "Survey", title: "Survey Servisi API Referansı", pos: 17 },
  { id: "intervention", name: "Intervention", title: "Intervention Servisi API Referansı", pos: 18 },
  { id: "performance", name: "Performance", title: "Performance Servisi API Referansı", pos: 19 },
  { id: "mobility", name: "Mobility", title: "Mobility Servisi API Referansı", pos: 20 },
  { id: "ats", name: "ATS", title: "ATS Servisi API Referansı", pos: 21 },
  { id: "notification", name: "Notification", title: "Notification Servisi API Referansı", pos: 22 },
  { id: "bordro", name: "Bordro", title: "Bordro Servisi API Referansı", pos: 23 },
  { id: "billing", name: "Billing", title: "Billing Servisi API Referansı", pos: 24 },
  { id: "audit", name: "Audit", title: "Audit Servisi API Referansı", pos: 25 },
  { id: "gateway", name: "API Gateway", servicePath: "api-gateway", title: "API Gateway Referansı", pos: 26 },
];

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

await mkdir(STATIC_OPENAPI_DIR, { recursive: true });
await mkdir(API_DOCS_DIR, { recursive: true });

for (const s of SERVICES) {
  const relPath = s.servicePath || s.id;
  const fromService = join(SERVICES_ROOT, relPath, "api", "openapi.yaml");
  const toStatic = join(STATIC_OPENAPI_DIR, `${s.id}.yaml`);

  if (await exists(fromService)) {
    await copyFile(fromService, toStatic);
    console.log(`✓ ${s.id} spec → kaynak servisinden kopyalandı`);
  } else if (await exists(toStatic)) {
    console.log(`• ${s.id} spec → static fallback kullanılıyor`);
  } else {
    console.warn(`[uyarı] ${s.id} için spec bulunamadı, sayfa oluşturulmadı.`);
    continue;
  }

  const mdx = `---
id: ${s.id}
title: ${JSON.stringify(s.title)}
sidebar_position: ${s.pos}
slug: /developer/api/${s.id}
description: UpCore ${s.name} servisi için OpenAPI 3.1 referansı, endpoint listesi, "Try it out" sandbox.
---

import ApiReference from "@site/src/components/ApiReference";

<ApiReference specId="${s.id}" title="${s.title}" tryItEnabled={true} />
`;
  const filePath = join(API_DOCS_DIR, `${s.id}.mdx`);
  await writeFile(filePath, mdx, "utf8");
  console.log(`  → sayfa: docs/developer/api/${s.id}.mdx`);
}

console.log(`\n✓ ${SERVICES.length} API referans sayfası + static spec hazır.`);
