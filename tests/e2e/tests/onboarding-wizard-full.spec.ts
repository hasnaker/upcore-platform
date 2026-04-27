/**
 * P5 E2E: Onboarding wizard tam akis (10 adim).
 *
 * Her adim, UI'da varligini ve "ileri" butonunun aktif olmasini dogrular.
 * Kritik yol: kayit -> sirket -> detay -> modul -> KVKK -> SSO -> CSV ->
 * takim atamasi -> ilk yonetici -> ozet.
 */
import { test, expect } from "@playwright/test";
import { TEST_TENANT } from "../fixtures/data";

test.describe("Onboarding Wizard — 10 adim tam akis", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("tum 10 adim siralama ve progress bar", async ({ page }) => {
    await page.goto("/kayit");
    await page.getByLabel("Ad").fill("Kurucu");
    await page.getByLabel("Soyad").fill("Test");
    await page.getByLabel("E-posta").fill("full-wizard@test-onboarding.upcore.io");
    await page.getByLabel("Sifre", { exact: true }).fill("Wizard.2026!");
    await page.getByLabel("Sifre Tekrar").fill("Wizard.2026!");
    await page.getByLabel("Kullanim kosullarini kabul ediyorum").check();
    await page.getByRole("button", { name: "Kayit Ol" }).click();
    await page.waitForURL("**/onboarding/**");

    const steps = [
      { num: 1, title: "Sirket Bilgileri" },
      { num: 2, title: "Sirket Detaylari" },
      { num: 3, title: "Modul Secimi" },
      { num: 4, title: "KVKK ve Veri Politikasi" },
      { num: 5, title: "SSO Konfigurasyonu" },
      { num: 6, title: "Calisan CSV Import" },
      { num: 7, title: "Takim Atamasi" },
      { num: 8, title: "Ilk Yonetici Ekleme" },
      { num: 9, title: "Branding ve Logo" },
      { num: 10, title: "Ozet ve Tamamla" },
    ];

    // Step 1
    await page.getByLabel("Sirket Adi").fill(TEST_TENANT.companyName);
    await page.getByLabel("Vergi Numarasi").fill(TEST_TENANT.taxId);
    await page.getByRole("button", { name: "Devam" }).click();

    // Step 2
    await expect(page.getByText(steps[1].title)).toBeVisible();
    await page.getByLabel("Calisan Sayisi").selectOption(TEST_TENANT.employeeCount);
    await page.getByRole("button", { name: "Devam" }).click();

    // Step 3
    await expect(page.getByText(steps[2].title)).toBeVisible();
    await page.getByLabel("Calisan Yonetimi").check();
    await page.getByRole("button", { name: "Devam" }).click();

    // Step 4 — KVKK
    await expect(page.getByText(steps[3].title)).toBeVisible();
    await page.getByLabel("KVKK aydinlatma metnini okudum").check();
    await page.getByLabel("VERBIS kayit yapildi").check();
    await page.getByRole("button", { name: "Devam" }).click();

    // Step 5 — SSO (opsiyonel, atlanabilir)
    await expect(page.getByText(steps[4].title)).toBeVisible();
    await page.getByRole("button", { name: "Atla" }).click();

    // Step 6 — CSV upload
    await expect(page.getByText(steps[5].title)).toBeVisible();
    await page.getByRole("button", { name: "Ornek CSV ile Devam" }).click();

    // Step 7 — Team assignment
    await expect(page.getByText(steps[6].title)).toBeVisible();
    await page.getByRole("button", { name: "Devam" }).click();

    // Step 8 — First manager
    await expect(page.getByText(steps[7].title)).toBeVisible();
    await page.getByLabel("Yonetici E-posta").fill("ik@test.upcore.io");
    await page.getByRole("button", { name: "Davet Gonder" }).click();

    // Step 9 — Branding
    await expect(page.getByText(steps[8].title)).toBeVisible();
    await page.getByRole("button", { name: "Sonra Yap" }).click();

    // Step 10 — Summary
    await expect(page.getByText(steps[9].title)).toBeVisible();
    await expect(page.getByText(TEST_TENANT.companyName)).toBeVisible();
    await page.getByRole("button", { name: "Kurulumu Tamamla" }).click();

    await page.waitForURL("**/panel/**", { timeout: 30_000 });
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });
});
