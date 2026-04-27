/**
 * P5 E2E: Mudahale -> consent -> 8 hafta etki dogrulama.
 */
import { test, expect } from "@playwright/test";

test.describe("Koruma Modulu — mudahale tam dongusu", () => {
  test("mudahale atama -> consent -> 8 hafta sonra etki raporu", async ({ page }) => {
    // 1) Aksiyon Merkezi'nden yuksek risk listesini ac
    await page.goto("/panel/koruma/aksiyon-merkezi");
    await page.getByRole("row").filter({ hasText: /yuksek/i }).first().click();

    // 2) Mudahale onerisini sec
    await page.getByRole("button", { name: "Mudahale Oner" }).click();
    await expect(page.getByText("Thompson Sampling")).toBeVisible();
    await page.getByRole("radio", { name: /CBT tabanli/i }).check();
    await page.getByRole("button", { name: "Calisana Oner" }).click();

    // 3) Calisan consent sayfasina gider (simulated)
    await page.goto("/consent/mudahale/token/test-consent-token");
    await page.getByLabel("KVKK aydinlatma metnini okudum").check();
    await page.getByLabel("Veri isleme iznini veriyorum").check();
    await page.getByRole("button", { name: "Onayliyorum" }).click();
    await expect(page.getByText("Onayiniz alindi")).toBeVisible();

    // 4) 8 hafta sonra etki raporu (test fixture tarafi ilerletilmis olsun)
    await page.goto("/panel/koruma/etki-raporu?case=latest");
    await expect(page.getByText(/Cohen.*d/)).toBeVisible();
    await expect(page.getByText(/hafta.*8/)).toBeVisible();
  });
});
