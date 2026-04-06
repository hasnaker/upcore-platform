import { test, expect } from "@playwright/test";

test.describe("Tukenmislik Analizi", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/panel/tukenmislik");
    await page.waitForLoadState("networkidle");
  });

  test("tukenmislik isi haritasini goruntuleme", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Tukenmislik Analizi" })
    ).toBeVisible();

    // Heatmap should be visible
    const heatmap = page.locator('[data-testid="burnout-heatmap"]');
    await expect(heatmap).toBeVisible();

    // Legend should show risk levels
    await expect(page.getByText("Dusuk Risk")).toBeVisible();
    await expect(page.getByText("Orta Risk")).toBeVisible();
    await expect(page.getByText("Yuksek Risk")).toBeVisible();
    await expect(page.getByText("Kritik")).toBeVisible();
  });

  test("kritik tukenmislik riskindeki calisanlari goruntuleme", async ({
    page,
  }) => {
    // Click on critical risk section
    await page.getByRole("tab", { name: "Kritik Calisanlar" }).click();

    const criticalSection = page.locator(
      '[data-testid="critical-employees"]'
    );
    await expect(criticalSection).toBeVisible();

    // Should show employee cards with risk details
    const cards = criticalSection.locator('[data-testid="employee-risk-card"]');
    const count = await cards.count();

    if (count > 0) {
      const firstCard = cards.first();
      // Each card should show name, department, risk score
      await expect(firstCard.getByText(/Risk Skoru/)).toBeVisible();
      await expect(firstCard.getByText(/Departman/)).toBeVisible();
    }
  });

  test("departman bazinda tukenmislik raporu", async ({ page }) => {
    await page.getByRole("tab", { name: "Departman Raporu" }).click();

    // Department breakdown should be visible
    await expect(page.getByText("Departman Bazinda Analiz")).toBeVisible();

    // Chart or table should render
    const chart = page.locator('[data-testid="department-burnout-chart"]');
    await expect(chart).toBeVisible();
  });

  test("trend grafigini goruntuleme", async ({ page }) => {
    await page.getByRole("tab", { name: "Trend" }).click();

    // Trend chart should be visible
    const trendChart = page.locator('[data-testid="burnout-trend-chart"]');
    await expect(trendChart).toBeVisible();

    // Time range filter
    await page.getByRole("button", { name: "Son 6 Ay" }).click();
    await page.waitForLoadState("networkidle");
  });

  test("calisan tukenmislik detayina gitme", async ({ page }) => {
    await page.getByRole("tab", { name: "Kritik Calisanlar" }).click();

    const cards = page.locator('[data-testid="employee-risk-card"]');
    const count = await cards.count();

    if (count > 0) {
      await cards.first().click();

      // Should navigate to employee burnout detail
      await page.waitForURL("**/panel/tukenmislik/calisan/**");

      await expect(
        page.getByRole("heading", { name: "Calisan Tukenmislik Detayi" })
      ).toBeVisible();

      // Should show dimension breakdown
      await expect(page.getByText("Fiziksel Tukenme")).toBeVisible();
      await expect(page.getByText("Duygusal Tukenme")).toBeVisible();
      await expect(page.getByText("Duyarsizlasma")).toBeVisible();
      await expect(page.getByText("Kisisel Basari")).toBeVisible();
    }
  });

  test("tukenmislik raporu indirme", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Rapor Indir" }).click();
    await page.getByRole("menuitem", { name: "PDF" }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("tukenmislik");
    expect(download.suggestedFilename()).toContain(".pdf");
  });

  test("risk esik degerlerini ayarlama", async ({ page }) => {
    await page.getByRole("button", { name: "Ayarlar" }).click();

    await expect(
      page.getByRole("heading", { name: "Risk Esik Degerleri" })
    ).toBeVisible();

    // Verify threshold inputs
    await expect(page.getByLabel("Dusuk Risk Esigi")).toBeVisible();
    await expect(page.getByLabel("Orta Risk Esigi")).toBeVisible();
    await expect(page.getByLabel("Yuksek Risk Esigi")).toBeVisible();
  });
});
