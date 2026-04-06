import { test, expect } from "@playwright/test";
import { TEST_USERS } from "../fixtures/auth";

test.describe("Kimlik Dogrulama", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // no pre-auth

  test("basarili giris yapma", async ({ page }) => {
    const user = TEST_USERS.admin;

    await page.goto("/giris");
    await expect(page).toHaveTitle(/Giris/);

    await page.getByLabel("E-posta").fill(user.email);
    await page.getByLabel("Sifre").fill(user.password);
    await page.getByRole("button", { name: "Giris Yap" }).click();

    await page.waitForURL("**/panel/**");
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(page.getByText(user.name)).toBeVisible();
  });

  test("hatali sifre ile giris denemesi", async ({ page }) => {
    await page.goto("/giris");

    await page.getByLabel("E-posta").fill(TEST_USERS.admin.email);
    await page.getByLabel("Sifre").fill("yanlis-sifre-123");
    await page.getByRole("button", { name: "Giris Yap" }).click();

    await expect(
      page.getByText("E-posta veya sifre hatali")
    ).toBeVisible();
    await expect(page).toHaveURL(/\/giris/);
  });

  test("bos form ile giris denemesi", async ({ page }) => {
    await page.goto("/giris");

    await page.getByRole("button", { name: "Giris Yap" }).click();

    await expect(page.getByText("E-posta zorunludur")).toBeVisible();
    await expect(page.getByText("Sifre zorunludur")).toBeVisible();
  });

  test("gecersiz e-posta formati", async ({ page }) => {
    await page.goto("/giris");

    await page.getByLabel("E-posta").fill("gecersiz-email");
    await page.getByLabel("Sifre").fill("birSifre123!");
    await page.getByRole("button", { name: "Giris Yap" }).click();

    await expect(
      page.getByText("Gecerli bir e-posta adresi giriniz")
    ).toBeVisible();
  });

  test("kayit olma", async ({ page }) => {
    await page.goto("/kayit");
    await expect(page).toHaveTitle(/Kayit/);

    await page.getByLabel("Ad").fill("Yeni");
    await page.getByLabel("Soyad").fill("Kullanici");
    await page.getByLabel("E-posta").fill("yeni.kullanici@test.upcore.io");
    await page.getByLabel("Sifre", { exact: true }).fill("Guclu.Sifre.2024!");
    await page.getByLabel("Sifre Tekrar").fill("Guclu.Sifre.2024!");
    await page.getByLabel("Kullanim kosullarini kabul ediyorum").check();

    await page.getByRole("button", { name: "Kayit Ol" }).click();

    // Should redirect to email verification or onboarding
    await expect(page).toHaveURL(/\/(dogrulama|onboarding)/);
  });

  test("cikis yapma", async ({ page }) => {
    // First login
    const user = TEST_USERS.admin;
    await page.goto("/giris");
    await page.getByLabel("E-posta").fill(user.email);
    await page.getByLabel("Sifre").fill(user.password);
    await page.getByRole("button", { name: "Giris Yap" }).click();
    await page.waitForURL("**/panel/**");

    // Open user menu
    await page.getByTestId("user-menu").click();
    await page.getByRole("menuitem", { name: "Cikis Yap" }).click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/giris/);

    // Verify can't access dashboard
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/giris/);
  });

  test("sifre sifirlama talebi", async ({ page }) => {
    await page.goto("/giris");
    await page.getByRole("link", { name: "Sifremi Unuttum" }).click();

    await expect(page).toHaveURL(/\/sifre-sifirlama/);
    await page.getByLabel("E-posta").fill(TEST_USERS.admin.email);
    await page.getByRole("button", { name: "Sifirlama Linki Gonder" }).click();

    await expect(
      page.getByText("Sifre sifirlama linki e-posta adresinize gonderildi")
    ).toBeVisible();
  });
});
