import { test, expect } from "@playwright/test";
import { TEST_ACTIONS } from "../fixtures/data";

test.describe("Aksiyon Merkezi", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/panel/aksiyonlar");
    await page.waitForLoadState("networkidle");
  });

  test("aksiyon merkezini goruntuleme", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Aksiyon Merkezi" })
    ).toBeVisible();

    // Summary cards should be visible
    await expect(page.getByText("Bekleyen Aksiyonlar")).toBeVisible();
    await expect(page.getByText("Devam Eden")).toBeVisible();
    await expect(page.getByText("Tamamlanan")).toBeVisible();
  });

  test("aksiyon listesini filtreleme", async ({ page }) => {
    // Filter by priority
    await page.getByLabel("Oncelik").selectOption("Kritik");
    await page.waitForLoadState("networkidle");

    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText("Kritik");
    }

    // Filter by type
    await page.getByLabel("Oncelik").selectOption(""); // reset
    await page
      .getByLabel("Aksiyon Turu")
      .selectOption("Tukenmislik Mudahalesi");
    await page.waitForLoadState("networkidle");
  });

  test("aksiyonu onaylama", async ({ page }) => {
    // Find a pending action
    const pendingRow = page
      .locator("table tbody tr")
      .filter({ hasText: "Beklemede" })
      .first();

    if ((await pendingRow.count()) > 0) {
      await pendingRow.getByRole("button", { name: "Incele" }).click();

      // Action detail dialog
      await expect(
        page.getByRole("heading", { name: "Aksiyon Detayi" })
      ).toBeVisible();

      // Verify action fields
      await expect(page.getByText("Aciklama")).toBeVisible();
      await expect(page.getByText("Oncelik")).toBeVisible();
      await expect(page.getByText("Atanan Kisi")).toBeVisible();

      // Approve the action
      await page.getByRole("button", { name: "Onayla" }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Onayla" })
        .click();

      await expect(
        page.getByText("Aksiyon onaylandi")
      ).toBeVisible();
    }
  });

  test("aksiyonu reddetme", async ({ page }) => {
    const pendingRow = page
      .locator("table tbody tr")
      .filter({ hasText: "Beklemede" })
      .first();

    if ((await pendingRow.count()) > 0) {
      await pendingRow.getByRole("button", { name: "Incele" }).click();

      await page.getByRole("button", { name: "Reddet" }).click();
      await page
        .getByLabel("Red Nedeni")
        .fill("Mudahale plani yeniden degerlendirilmeli");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Reddet" })
        .click();

      await expect(
        page.getByText("Aksiyon reddedildi")
      ).toBeVisible();
    }
  });

  test("aksiyon detay sayfasina gitme", async ({ page }) => {
    const firstRow = page.locator("table tbody tr").first();
    const count = await firstRow.count();

    if (count > 0) {
      await firstRow.click();
      await page.waitForURL("**/panel/aksiyonlar/**");

      await expect(
        page.getByRole("heading", { name: "Aksiyon Detayi" })
      ).toBeVisible();

      // Should show timeline
      await expect(page.getByText("Aksiyon Gecmisi")).toBeVisible();
    }
  });

  test("aksiyonu tamamlandi olarak isaretleme", async ({ page }) => {
    const activeRow = page
      .locator("table tbody tr")
      .filter({ hasText: "Devam Ediyor" })
      .first();

    if ((await activeRow.count()) > 0) {
      await activeRow.getByRole("button", { name: "Incele" }).click();

      await page.getByRole("button", { name: "Tamamlandi" }).click();
      await page.getByLabel("Sonuc Notu").fill("Mudahale plani basariyla uygulandi");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Tamamla" })
        .click();

      await expect(
        page.getByText("Aksiyon tamamlandi olarak isaretlendi")
      ).toBeVisible();
    }
  });

  test("AI onerilerini goruntuleme", async ({ page }) => {
    // AI recommendations section
    const aiSection = page.locator('[data-testid="ai-recommendations"]');

    if ((await aiSection.count()) > 0) {
      await expect(aiSection).toBeVisible();
      await expect(aiSection.getByText("AI Onerileri")).toBeVisible();

      // Each recommendation should have an action button
      const recommendations = aiSection.locator(
        '[data-testid="recommendation-card"]'
      );
      if ((await recommendations.count()) > 0) {
        await expect(
          recommendations.first().getByRole("button", { name: "Uygula" })
        ).toBeVisible();
      }
    }
  });
});
