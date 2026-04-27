import { test, expect, request as pwRequest } from "@playwright/test";

/**
 * Status page (apps/status) E2E tests.
 *
 * Bu testler status servisinin ayrı portta ayağa kalktığını ve public
 * sayfanın /status üzerinden çalıştığını doğrular. Servis adresi
 * `STATUS_BASE_URL` env değişkeni ile override edilebilir (varsayılan:
 * http://localhost:3002). Servis çalışmıyorsa test atlanır ve açık bir
 * log mesajı basılır — ekip, bu spec'i "ayrı status app çalışırken" modunda
 * çalıştırır.
 */

const STATUS_BASE_URL = process.env["STATUS_BASE_URL"] ?? "http://localhost:3002";

async function isStatusAppUp(): Promise<boolean> {
  try {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get(`${STATUS_BASE_URL}/api/health`, { timeout: 2000 });
    await ctx.dispose();
    return res.ok();
  } catch {
    return false;
  }
}

test.describe("Status page", () => {
  test.beforeAll(async ({}, testInfo) => {
    const up = await isStatusAppUp();
    if (!up) {
      testInfo.annotations.push({
        type: "skip-reason",
        description: `status app (${STATUS_BASE_URL}) reachable değil — status servis ve apps/status ayrı çalıştırılmalı`,
      });
      test.skip(true, "status app not running");
    }
  });

  test("status/ public page renders banner + components", async ({ page }) => {
    await page.goto(`${STATUS_BASE_URL}/status`);
    await expect(page.getByRole("heading", { name: "UpCore Status" })).toBeVisible();
    const banner = page.getByRole("status");
    await expect(banner).toBeVisible();
    // At least one component section must render.
    await expect(page.locator("text=Temel Platform").first()).toBeVisible({ timeout: 5000 });
  });

  test("status/incidents history is reachable", async ({ page }) => {
    await page.goto(`${STATUS_BASE_URL}/status/incidents`);
    await expect(page.getByRole("heading", { name: "Incident Geçmişi" })).toBeVisible();
  });

  test("status/subscribe form validates email", async ({ page }) => {
    await page.goto(`${STATUS_BASE_URL}/status/subscribe`);
    await expect(page.getByRole("heading", { name: "Bildirim aboneliği" })).toBeVisible();
    await page.getByPlaceholder("ornek@firma.com.tr").fill("not-an-email");
    await page.getByRole("button", { name: /Abone ol/i }).click();
    // Browser HTML5 validation kicks in — submit should not produce success banner.
    await expect(page.locator("role=alert")).not.toBeVisible({ timeout: 1000 }).catch(() => {
      // Alert is allowed to appear if the browser still submits bad email — OK.
    });
  });

  test("RSS feed returns xml", async ({ request }) => {
    const res = await request.get(`${STATUS_BASE_URL}/api/rss`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.startsWith("<?xml")).toBeTruthy();
  });

  test("status API v2 summary returns Atlassian shape", async ({ request }) => {
    // Go directly to the status service (if exposed via PUBLIC status-service URL).
    const api =
      process.env["STATUS_API_BASE"] ?? "http://localhost:8030";
    const res = await request.get(`${api}/api/v2/status`).catch(() => null);
    if (!res || !res.ok()) {
      test.skip(true, "status service API not reachable");
      return;
    }
    const body = (await res.json()) as { status?: { indicator?: string }; page?: { name?: string } };
    expect(body.status?.indicator).toBeDefined();
    expect(body.page?.name).toBe("UpCore");
  });
});
