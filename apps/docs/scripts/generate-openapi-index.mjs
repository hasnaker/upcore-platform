#!/usr/bin/env node
/**
 * UpCore docs — OpenAPI index üretici.
 *
 * 17 servisin OpenAPI spec'lerini birleştirip `static/openapi/index.json`
 * dosyasında listeler. Bu dosya llms.txt + developer/api genel-bakış tarafından
 * okunabilir.
 */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = join(__dirname, "..");
const SERVICES_ROOT = join(__dirname, "..", "..", "..", "services");
const STATIC_OPENAPI_DIR = join(DOCS_ROOT, "static", "openapi");

const SERVICES = [
  { id: "auth", name: "Auth" },
  { id: "tenant", name: "Tenant" },
  { id: "employee", name: "Employee" },
  { id: "organization", name: "Organization" },
  { id: "leave", name: "Leave" },
  { id: "document", name: "Document" },
  { id: "assessment", name: "Assessment" },
  { id: "survey", name: "Survey", fallback: true },
  { id: "intervention", name: "Intervention", fallback: true },
  { id: "performance", name: "Performance", fallback: true },
  { id: "mobility", name: "Mobility", fallback: true },
  { id: "ats", name: "ATS", fallback: true },
  { id: "notification", name: "Notification", fallback: true },
  { id: "bordro", name: "Bordro", fallback: true },
  { id: "billing", name: "Billing" },
  { id: "audit", name: "Audit" },
  { id: "api-gateway", name: "API Gateway", path: "api-gateway" },
];

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function parseOpenApiMinimal(yamlText) {
  // Çok basit OpenAPI metadata çıkarımı — tam parser değil.
  // Prod build'da swagger-parser kullanılır; burada index üretimi için yeter.
  const titleMatch = yamlText.match(/^\s*title:\s*(.+)$/m);
  const versionMatch = yamlText.match(/^\s*version:\s*(.+)$/m);
  const openapiMatch = yamlText.match(/^openapi:\s*(.+)$/m);
  return {
    title: titleMatch ? titleMatch[1].replace(/["']/g, "").trim() : "Untitled",
    version: versionMatch ? versionMatch[1].replace(/["']/g, "").trim() : "0.0.0",
    openapi: openapiMatch ? openapiMatch[1].replace(/["']/g, "").trim() : "3.1.0",
  };
}

const out = [];

for (const s of SERVICES) {
  const relPath = s.path || s.id;
  const serviceSpecPath = join(SERVICES_ROOT, relPath, "api", "openapi.yaml");
  const fallbackSpecPath = join(STATIC_OPENAPI_DIR, `${s.id}.yaml`);

  let specFile = null;
  if (await exists(serviceSpecPath)) {
    specFile = serviceSpecPath;
  } else if (await exists(fallbackSpecPath)) {
    specFile = fallbackSpecPath;
  } else {
    console.warn(`[uyarı] ${s.id} için spec bulunamadı, atlandı.`);
    continue;
  }

  const yamlText = await readFile(specFile, "utf8");
  const meta = parseOpenApiMinimal(yamlText);
  out.push({
    id: s.id,
    name: s.name,
    title: meta.title,
    version: meta.version,
    openapi: meta.openapi,
    source: specFile.replace(DOCS_ROOT, "."),
    docs_url: `/docs/developer/api/${s.id}`,
  });
}

await mkdir(STATIC_OPENAPI_DIR, { recursive: true });
await writeFile(
  join(STATIC_OPENAPI_DIR, "index.json"),
  JSON.stringify({ generated_at: new Date().toISOString(), services: out }, null, 2),
  "utf8",
);

console.log(`✓ OpenAPI index üretildi: ${out.length} servis`);
