import { test, expect } from "@playwright/test";

test.describe("Ayarlar", () => {
  test("profil bilgilerini guncelleme", async ({ page }) => {
    await page.goto("/panel/ayarlar/profil");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Profil Ayarlari" })
    ).toBeVisible();

    // Update name
    const nameInput = page.getByLabel("Ad Soyad");
    await expect(nameInput).toBeVisible();
    const currentName = await nameInput.inputValue();

    await nameInput.clear();
    await nameInput.fill("Guncellenmis Isim");

    // Update phone
    await page.getByLabel("Telefon").clear();
    await page.getByLabel("Telefon").fill("+905551112233");

    await page.getByRole("button", { name: "Kaydet" }).click();

    await expect(
      page.getByText("Profil bilgileri guncellendi")
    ).toBeVisible();

    // Revert name
    await nameInput.clear();
    await nameInput.fill(currentName);
    await page.getByRole("button", { name: "Kaydet" }).click();
  });

  test("sifre degistirme", async ({ page }) => {
    await page.goto("/panel/ayarlar/guvenlik");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Guvenlik Ayarlari" })
    ).toBeVisible();

    await page.getByLabel("Mevcut Sifre").fill("Test.Admin.2024!");
    await page.getByLabel("Yeni Sifre", { exact: true }).fill("Yeni.Sifre.2024!");
    await page.getByLabel("Yeni Sifre Tekrar").fill("Yeni.Sifre.2024!");

    await page.getByRole("button", { name: "Sifreyi Degistir" }).click();

    await expect(
      page.getByText("Sifre basariyla degistirildi")
    ).toBeVisible();

    // Revert password
    await page.getByLabel("Mevcut Sifre").fill("Yeni.Sifre.2024!");
    await page.getByLabel("Yeni Sifre", { exact: true }).fill("Test.Admin.2024!");
    await page.getByLabel("Yeni Sifre Tekrar").fill("Test.Admin.2024!");
    await page.getByRole("button", { name: "Sifreyi Degistir" }).click();
  });

  test("bildirim tercihlerini degistirme", async ({ page }) => {
    await page.goto("/panel/ayarlar/bildirimler");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Bildirim Ayarlari" })
    ).toBeVisible();

    // Toggle notifications
    const emailToggle = page.getByLabel("E-posta Bildirimleri");
    await expect(emailToggle).toBeVisible();

    const pushToggle = page.getByLabel("Push Bildirimleri");
    await expect(pushToggle).toBeVisible();

    // Toggle one off and on
    await emailToggle.click();
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByText("Bildirim ayarlari guncellendi")).toBeVisible();

    // Toggle back
    await emailToggle.click();
    await page.getByRole("button", { name: "Kaydet" }).click();
  });

  test("faturalama bilgilerini goruntuleme", async ({ page }) => {
    await page.goto("/panel/ayarlar/faturalama");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Faturalama" })
    ).toBeVisible();

    // Plan info
    await expect(page.getByText("Mevcut Plan")).toBeVisible();
    await expect(page.getByText("Fatura Gecmisi")).toBeVisible();

    // Usage stats
    await expect(page.getByText("Kullanim")).toBeVisible();
  });

  test("sirket ayarlarini goruntuleme (admin)", async ({ page }) => {
    await page.goto("/panel/ayarlar/sirket");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Sirket Ayarlari" })
    ).toBeVisible();

    // Company info fields
    await expect(page.getByLabel("Sirket Adi")).toBeVisible();
    await expect(page.getByLabel("Vergi Numarasi")).toBeVisible();
    await expect(page.getByLabel("Adres")).toBeVisible();
  });

  test("dil tercihini degistirme", async ({ page }) => {
    await page.goto("/panel/ayarlar/profil");
    await page.waitForLoadState("networkidle");

    const languageSelect = page.getByLabel("Dil");
    await expect(languageSelect).toBeVisible();

    // Should be Turkish by default
    await expect(languageSelect).toHaveValue("tr");
  });

  test("ayarlar sayfasinda navigasyon", async ({ page }) => {
    await page.goto("/panel/ayarlar");
    await page.waitForLoadState("networkidle");

    // Navigation links
    const navLinks = [
      { name: "Profil", url: "/profil" },
      { name: "Guvenlik", url: "/guvenlik" },
      { name: "Bildirimler", url: "/bildirimler" },
      { name: "Faturalama", url: "/faturalama" },
    ];

    for (const link of navLinks) {
      const navItem = page.getByRole("link", { name: link.name });
      await expect(navItem).toBeVisible();
    }
  });
});
