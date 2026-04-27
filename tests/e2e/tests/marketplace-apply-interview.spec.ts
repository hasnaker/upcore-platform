/**
 * P5 E2E: Ic ilan marketplace basvuru -> interview.
 */
import { test, expect } from "@playwright/test";

test.describe("Ic Ilan Marketplace", () => {
  test("ilan -> basvuru -> mulakat davet -> karar", async ({ page }) => {
    // HR ilan yayinlar
    await page.goto("/panel/mobility/ilanlar/yeni");
    await page.getByLabel("Pozisyon").fill("Kidemli Full-Stack Muhendis");
    await page.getByLabel("Departman").selectOption("Yazilim Gelistirme");
    await page.getByLabel("Aciklama").fill("3+ yil deneyim, Go/TS bilgisi.");
    await page.getByRole("button", { name: "Yayinla" }).click();

    // Calisan basvurur
    await page.goto("/panel/mobility/ilanlar");
    await page.getByRole("link", { name: /Kidemli Full-Stack/ }).click();
    await page.getByRole("button", { name: "Basvur" }).click();
    await page.getByLabel("Mesaj").fill("Bu pozisyonda kendimi gelistirmek istiyorum.");
    await page.getByRole("button", { name: "Basvuruyu Gonder" }).click();
    await expect(page.getByText("Basvurunuz alindi")).toBeVisible();

    // Yonetici mulakat davet eder
    await page.goto("/panel/mobility/basvurular");
    await page.getByRole("button", { name: "Mulakat Planla" }).first().click();
    await page.getByLabel("Tarih").fill("2026-05-10T14:00");
    await page.getByRole("button", { name: "Davet Gonder" }).click();

    // Karar
    await page.getByRole("button", { name: "Karar Ver" }).first().click();
    await page.getByLabel("Sonuc").selectOption("offered");
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByText("Teklif gonderildi")).toBeVisible();
  });
});
