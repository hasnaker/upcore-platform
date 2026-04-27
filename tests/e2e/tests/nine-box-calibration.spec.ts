/**
 * P5 E2E: 9-kutu kalibrasyon toplantisi.
 */
import { test, expect } from "@playwright/test";

test.describe("9-Kutu Kalibrasyon", () => {
  test("toplanti modu: drag-drop, onay ve tarihce", async ({ page }) => {
    await page.goto("/panel/performans/9-kutu");
    await page.getByRole("button", { name: "Yeni Kalibrasyon" }).click();
    await page.getByLabel("Baslik").fill("Q2 2026 Liderlik Kalibrasyonu");
    await page.getByLabel("Katilimcilar").fill("CEO, CHRO, CTO");
    await page.getByRole("button", { name: "Toplantiyi Baslat" }).click();

    // Drag-drop simule et (test-id ile)
    const card = page.locator('[data-testid="employee-card-ahmet"]');
    const box = page.locator('[data-testid="box-high-high"]');
    await card.dragTo(box);

    await expect(box).toContainText("Ahmet");

    // Toplantiyi kilitle
    await page.getByRole("button", { name: "Kalibrasyonu Kilitle" }).click();
    await page.getByLabel("Onay Kodu").fill("CHRO-2026");
    await page.getByRole("button", { name: "Onay" }).click();

    await expect(page.getByText("Kalibrasyon kilitlendi")).toBeVisible();
    await expect(page.getByText(/Versiyon 1/)).toBeVisible();
  });
});
