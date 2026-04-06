import { test, expect } from "@playwright/test";
import { TEST_TENANT } from "../fixtures/data";

test.describe("Kurulum ve Onboarding", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // fresh session

  test("yeni sirket olusturma (tenant creation)", async ({ page }) => {
    // Register a new user first
    await page.goto("/kayit");
    await page.getByLabel("Ad").fill("Kurucu");
    await page.getByLabel("Soyad").fill("Kullanici");
    await page.getByLabel("E-posta").fill("kurucu@test-onboarding.upcore.io");
    await page.getByLabel("Sifre", { exact: true }).fill("Kurulum.2024!");
    await page.getByLabel("Sifre Tekrar").fill("Kurulum.2024!");
    await page.getByLabel("Kullanim kosullarini kabul ediyorum").check();
    await page.getByRole("button", { name: "Kayit Ol" }).click();

    // Should land on onboarding page
    await page.waitForURL("**/onboarding/**");
    await expect(page.getByText("Hosgeldiniz")).toBeVisible();

    // Step 1: Company info
    await expect(page.getByText("Sirket Bilgileri")).toBeVisible();
    await page.getByLabel("Sirket Adi").fill(TEST_TENANT.companyName);
    await page.getByLabel("Vergi Numarasi").fill(TEST_TENANT.taxId);
    await page.getByLabel("Adres").fill(TEST_TENANT.address);
    await page.getByLabel("Sehir").selectOption(TEST_TENANT.city);
    await page.getByLabel("Telefon").fill(TEST_TENANT.phone);
    await page.getByRole("button", { name: "Devam" }).click();

    // Step 2: Company size & sector
    await expect(page.getByText("Sirket Detaylari")).toBeVisible();
    await page.getByLabel("Calisan Sayisi").selectOption(TEST_TENANT.employeeCount);
    await page.getByLabel("Sektor").selectOption(TEST_TENANT.sector);
    await page.getByRole("button", { name: "Devam" }).click();

    // Step 3: Module selection
    await expect(page.getByText("Modul Secimi")).toBeVisible();
    await page.getByLabel("Calisan Yonetimi").check();
    await page.getByLabel("Izin Yonetimi").check();
    await page.getByLabel("Anket ve Nabiz Olcumu").check();
    await page.getByLabel("Tukenmislik Analizi").check();
    await page.getByRole("button", { name: "Devam" }).click();

    // Step 4: Confirmation
    await expect(page.getByText("Kurulumu Tamamla")).toBeVisible();
    await expect(page.getByText(TEST_TENANT.companyName)).toBeVisible();
    await page.getByRole("button", { name: "Kurulumu Baslat" }).click();

    // Should redirect to dashboard
    await page.waitForURL("**/panel/**", { timeout: 30_000 });
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(
      page.getByText("Kurulum basariyla tamamlandi")
    ).toBeVisible();
  });

  test("onboarding adimlarini geri-ileri gecis", async ({ page }) => {
    await page.goto("/kayit");
    await page.getByLabel("Ad").fill("Test");
    await page.getByLabel("Soyad").fill("Gecis");
    await page.getByLabel("E-posta").fill("test-gecis@test-onboarding.upcore.io");
    await page.getByLabel("Sifre", { exact: true }).fill("Gecis.2024!");
    await page.getByLabel("Sifre Tekrar").fill("Gecis.2024!");
    await page.getByLabel("Kullanim kosullarini kabul ediyorum").check();
    await page.getByRole("button", { name: "Kayit Ol" }).click();
    await page.waitForURL("**/onboarding/**");

    // Step 1
    await page.getByLabel("Sirket Adi").fill("Gecis Test A.S.");
    await page.getByLabel("Vergi Numarasi").fill("9999999999");
    await page.getByRole("button", { name: "Devam" }).click();

    // Step 2 - go back
    await expect(page.getByText("Sirket Detaylari")).toBeVisible();
    await page.getByRole("button", { name: "Geri" }).click();

    // Should preserve step 1 data
    await expect(page.getByLabel("Sirket Adi")).toHaveValue("Gecis Test A.S.");
    await expect(page.getByLabel("Vergi Numarasi")).toHaveValue("9999999999");
  });
});
