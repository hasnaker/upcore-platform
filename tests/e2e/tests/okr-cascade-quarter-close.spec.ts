/**
 * P5 E2E: OKR kaskad + ceyrek kapanisi.
 */
import { test, expect } from "@playwright/test";

test.describe("Performans — OKR kaskad ve ceyrek kapanisi", () => {
  test("sirket OKR'si -> departman -> birey kaskadi", async ({ page }) => {
    await page.goto("/panel/performans/okr/yeni");
    await page.getByLabel("Seviye").selectOption("sirket");
    await page.getByLabel("Hedef").fill("2026 Q2 NPS 40+ olsun");
    await page.getByRole("button", { name: "Key Result Ekle" }).click();
    await page.getByLabel("Key Result 1").fill("NPS 30 -> 40");
    await page.getByRole("button", { name: "Kaydet" }).click();

    // Departman seviyesinde alt OKR
    await page.getByRole("button", { name: "Departmana Yansit" }).click();
    await page.getByLabel("Departman").selectOption("Musteri Basarisi");
    await page.getByRole("button", { name: "Olustur" }).click();

    // Birey seviyesinde alt OKR
    await page.getByRole("button", { name: "Bireylere Yansit" }).click();
    await page.getByRole("button", { name: "Otomatik Ata" }).click();

    await expect(page.getByText("3 seviye kaskad olusturuldu")).toBeVisible();
  });

  test("ceyrek kapanisi: self-score -> manager score -> final puan", async ({ page }) => {
    await page.goto("/panel/performans/okr?q=Q2-2026");
    await page.getByRole("button", { name: "Ceyreki Kapat" }).click();
    await page.getByLabel("Self Score").fill("0.7");
    await page.getByLabel("Yorum").fill("Hedeflerin %70'ine ulastim");
    await page.getByRole("button", { name: "Gonder" }).click();
    await expect(page.getByText("Yoneticinize iletildi")).toBeVisible();
  });
});
