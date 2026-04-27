/**
 * P5 E2E: 360 feedback tam dongusu.
 * Kendi + yonetici + akran + rapor-veren degerlendirmeleri.
 */
import { test, expect } from "@playwright/test";

test.describe("360 Feedback — tam dongu", () => {
  test("kurulum -> davet -> cevap -> rapor", async ({ page }) => {
    await page.goto("/panel/performans/360/yeni");
    await page.getByLabel("Hedef Calisan").fill("Ahmet Kaya");
    await page.getByRole("option", { name: /Ahmet Kaya/ }).click();

    // 4 paydas tipi
    await page.getByLabel("Kendi").check();
    await page.getByLabel("Yonetici").check();
    await page.getByLabel("Akran").check();
    await page.getByLabel("Rapor Veren").check();

    await page.getByRole("button", { name: "Davet Gonder" }).click();
    await expect(page.getByText("8 davet gonderildi")).toBeVisible();

    // Cevaplari simule et
    await page.goto("/360/katil?token=peer-1");
    await page.getByRole("radio", { name: "Katiliyorum" }).first().check();
    await page.getByRole("button", { name: "Gonder" }).click();

    // Rapor
    await page.goto("/panel/performans/360/raporlar");
    await expect(page.getByText(/Ahmet Kaya/)).toBeVisible();
    await expect(page.getByText(/Ortalama/)).toBeVisible();
    await expect(page.getByText(/Guclu Yonler/)).toBeVisible();
    await expect(page.getByText(/Gelistirilecek Alanlar/)).toBeVisible();
  });
});
