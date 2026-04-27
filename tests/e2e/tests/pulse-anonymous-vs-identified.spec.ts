/**
 * P5 E2E: Pulse anketi — anonim ve identified mod toggle.
 * Anonim modda cevap sahibinin isim/TCKN disari vurulmaz.
 */
import { test, expect } from "@playwright/test";

test.describe("Pulse Anketi — anonim / identified mod", () => {
  test("anonim mod: cevap gonderildikten sonra isim gorunmez", async ({ page }) => {
    await page.goto("/panel/anketler/yeni");
    await page.getByLabel("Anket Adi").fill("Q2 Pulse — Anonim");
    await page.getByLabel("Anonim Mod").check();
    await page.getByLabel("BAT-12-TR").check();
    await page.getByRole("button", { name: "Yayinla" }).click();

    // Cevap ver
    await page.goto("/anket/katil?code=auto-anon");
    await page.getByRole("button", { name: "Bazen", exact: true }).first().click();
    await page.getByRole("button", { name: "Gonder" }).click();

    // Admin sonuc panelinde "Anonim" etiketi gorunmeli
    await page.goto("/panel/anketler/son");
    await expect(page.getByText("Anonim")).toBeVisible();
    await expect(page.getByText(/ahmet|fatma|ali/i)).toHaveCount(0);
  });

  test("identified mod: cevap sahibinin adi gorunur", async ({ page }) => {
    await page.goto("/panel/anketler/yeni");
    await page.getByLabel("Anket Adi").fill("Q2 Pulse — Identified");
    await page.getByLabel("Kimlikli Mod").check();
    await page.getByLabel("BAT-12-TR").check();
    await page.getByRole("button", { name: "Yayinla" }).click();

    await page.goto("/panel/anketler/son");
    await expect(page.getByText("Kimlikli")).toBeVisible();
  });
});
