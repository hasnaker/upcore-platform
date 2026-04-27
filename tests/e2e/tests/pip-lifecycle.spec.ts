/**
 * P5 E2E: PIP baslat -> check-in -> kapat.
 */
import { test, expect } from "@playwright/test";

test.describe("PIP (Performans Iyilestirme Plani) yasam dongusu", () => {
  test("baslat -> 3 check-in -> basarili kapanis", async ({ page }) => {
    await page.goto("/panel/performans/pip/yeni");
    await page.getByLabel("Calisan").fill("Ali Yildiz");
    await page.getByRole("option", { name: /Ali Yildiz/ }).click();
    await page.getByLabel("Neden").selectOption("performance");
    await page.getByLabel("Ozet").fill("Satis hedefleri 2 ceyrek ust uste %60 alti.");
    await page.getByLabel("Baslangic").fill("2026-04-01");
    await page.getByLabel("Sure (gun)").fill("60");
    await page.getByRole("button", { name: "Hedef Ekle" }).click();
    await page.getByLabel("Hedef 1 Aciklama").fill("Aylik 8 randevu");
    await page.getByLabel("Hedef 1 Olculebilir").fill("CRM'de onayli 8 toplanti");
    await page.getByRole("button", { name: "PIP Baslat" }).click();
    await expect(page.getByText("PIP taslak olarak kaydedildi")).toBeVisible();

    await page.getByRole("button", { name: "Yayinla" }).click();
    await expect(page.getByText("PIP aktif")).toBeVisible();

    // Check-in 1
    await page.getByRole("button", { name: "Check-in Ekle" }).click();
    await page.getByLabel("Ilerleme").selectOption("on_track");
    await page.getByLabel("Yorum").fill("Ilk ay 6/8 tamamlandi, yolunda.");
    await page.getByRole("button", { name: "Kaydet" }).click();

    // Basarili kapanis
    await page.getByRole("button", { name: "PIP Kapat" }).click();
    await page.getByLabel("Sonuc").selectOption("successful");
    await page.getByRole("button", { name: "Tamamla" }).click();

    await expect(page.getByText("PIP basariyla tamamlandi")).toBeVisible();
  });
});
