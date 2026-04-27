/**
 * P5 E2E: Rotasyon onay zinciri (calisan -> mevcut yonetici -> hedef yonetici -> IK).
 */
import { test, expect } from "@playwright/test";

test.describe("Rotasyon — 4 katmanli onay zinciri", () => {
  test("calisan talep -> 3 onaydan gecer -> aktive olur", async ({ page }) => {
    // Calisan talep olustur
    await page.goto("/panel/rotasyon/basvur");
    await page.getByLabel("Hedef Departman").selectOption("Pazarlama");
    await page.getByLabel("Neden").fill("Marka iletisimi alaninda gelisim istiyorum");
    await page.getByRole("button", { name: "Gonder" }).click();
    await expect(page.getByText("Basvurunuz onay zincirine girdi")).toBeVisible();

    // Onay 1: mevcut yonetici
    await page.goto("/panel/onaylar?tip=rotasyon");
    await page.getByRole("button", { name: "Onayla" }).first().click();
    await page.getByLabel("Not").fill("Destekliyorum.");
    await page.getByRole("button", { name: "Gonder" }).click();

    // Onay 2: hedef yonetici
    await page.getByRole("button", { name: "Onayla" }).first().click();
    await page.getByRole("button", { name: "Gonder" }).click();

    // Onay 3: IK
    await page.getByRole("button", { name: "Onayla" }).first().click();
    await page.getByLabel("Baslangic Tarihi").fill("2026-06-01");
    await page.getByRole("button", { name: "Finalize Et" }).click();

    await expect(page.getByText("Rotasyon aktiflesti")).toBeVisible();
  });
});
