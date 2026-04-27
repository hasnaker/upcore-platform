/**
 * P5 E2E: Succession havuz yonetimi.
 * ready_now / 1y / 2y slotlari, yedek ekleme, aciklik analizi.
 */
import { test, expect } from "@playwright/test";

test.describe("Succession Havuz", () => {
  test("kritik pozisyon -> 3 yedek slotu -> aciklik raporu", async ({ page }) => {
    await page.goto("/panel/mobility/succession");
    await page.getByRole("button", { name: "Yeni Kritik Pozisyon" }).click();
    await page.getByLabel("Pozisyon Baslik").fill("CTO");
    await page.getByLabel("Kritiklik Seviyesi").selectOption("yuksek");
    await page.getByRole("button", { name: "Kaydet" }).click();

    // Ready-now yedek ekle
    await page.getByRole("button", { name: "Yedek Ekle" }).click();
    await page.getByLabel("Aday").fill("Ahmet Kaya");
    await page.getByRole("option", { name: /Ahmet Kaya/ }).click();
    await page.getByLabel("Hazirlik").selectOption("ready_now");
    await page.getByRole("button", { name: "Kaydet" }).click();

    // 1y + 2y yedek
    await page.getByRole("button", { name: "Yedek Ekle" }).click();
    await page.getByLabel("Aday").fill("Zeynep Celik");
    await page.getByRole("option", { name: /Zeynep Celik/ }).click();
    await page.getByLabel("Hazirlik").selectOption("1y");
    await page.getByRole("button", { name: "Kaydet" }).click();

    // Aciklik raporu
    await page.goto("/panel/mobility/succession/aciklik-raporu");
    await expect(page.getByText("CTO")).toBeVisible();
    await expect(page.getByText(/2 yedek/)).toBeVisible();
  });
});
