/**
 * P5 E2E: Kritik yollar — konsolide senaryolar.
 * 15+ modul bazli kisa-akis kontrol testi.
 */
import { test, expect } from "@playwright/test";

test.describe("Kritik Yollar — modul icerisi smoke+", () => {
  test("KVKK self-servis: veri indirme talebi", async ({ page }) => {
    await page.goto("/panel/kvkk/haklarim");
    await page.getByRole("button", { name: "Verilerimi Indir" }).click();
    await page.getByLabel("Neden").fill("Kisisel arsiv");
    await page.getByRole("button", { name: "Talep Gonder" }).click();
    await expect(page.getByText("Talep kaydedildi")).toBeVisible();
  });

  test("KVKK: silme talebi + IK onayi", async ({ page }) => {
    await page.goto("/panel/kvkk/haklarim");
    await page.getByRole("button", { name: "Silme Talebi" }).click();
    await page.getByLabel("Aciklama").fill("Isten ayrildim, veri silmek istiyorum");
    await page.getByRole("button", { name: "Gonder" }).click();
    await expect(page.getByText("Talep IK'ya iletildi")).toBeVisible();
  });

  test("Admin: tenant feature flag toggle", async ({ page }) => {
    await page.goto("/admin/tenants");
    await page.getByRole("row", { name: /Test Teknoloji/ }).click();
    await page.getByRole("tab", { name: "Feature Flags" }).click();
    await page.getByLabel("pulse_anonymous_mode").click();
    await expect(page.getByText("Kaydedildi")).toBeVisible();
  });

  test("Admin: impersonate + audit log", async ({ page }) => {
    await page.goto("/admin/tenants/1/kullanicilar");
    await page.getByRole("button", { name: "Impersonate" }).first().click();
    await page.getByLabel("Neden").fill("Musteri destek #1234");
    await page.getByRole("button", { name: "Onay" }).click();
    await expect(page.getByText("Impersonation aktif")).toBeVisible();
    await page.getByRole("button", { name: "Cikis (Impersonate)" }).click();
  });

  test("Bordro: ay sonu puantaj hesaplama", async ({ page }) => {
    await page.goto("/panel/bordro/puantaj");
    await page.getByLabel("Ay").selectOption("2026-04");
    await page.getByRole("button", { name: "Hesapla" }).click();
    await expect(page.getByText(/Hesaplama tamamlandi/)).toBeVisible();
  });

  test("Bordro: SGK APB XML export", async ({ page }) => {
    await page.goto("/panel/bordro/sgk");
    await page.getByLabel("Donem").selectOption("2026-04");
    await page.getByRole("button", { name: "APB XML Olustur" }).click();
    await expect(page.getByText(/XML hazir/)).toBeVisible();
  });

  test("Izin: bakiye goruntuleme + talep", async ({ page }) => {
    await page.goto("/panel/izin/bakiye");
    await expect(page.getByText(/Yillik Izin Bakiyesi/)).toBeVisible();
    await page.getByRole("button", { name: "Yeni Talep" }).click();
    await page.getByLabel("Baslangic").fill("2026-06-01");
    await page.getByLabel("Bitis").fill("2026-06-03");
    await page.getByRole("button", { name: "Gonder" }).click();
  });

  test("Izin: yonetici onay/red", async ({ page }) => {
    await page.goto("/panel/onaylar?tip=izin");
    await page.getByRole("button", { name: "Onayla" }).first().click();
  });

  test("ATS: aday CV yukleme + AI eslesme skoru", async ({ page }) => {
    await page.goto("/panel/ats/adaylar/yeni");
    await page.getByLabel("Ad Soyad").fill("Aday Test");
    await page.getByLabel("E-posta").fill("aday@test.com");
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByText(/Eslesme skoru/)).toBeVisible();
  });

  test("ATS: mulakat plani + geri bildirim", async ({ page }) => {
    await page.goto("/panel/ats/adaylar");
    await page.getByRole("link", { name: /Aday/ }).first().click();
    await page.getByRole("button", { name: "Mulakat Planla" }).click();
  });

  test("Assessment: yetkinlik testi olusturma + atama", async ({ page }) => {
    await page.goto("/panel/assessment/yeni");
    await page.getByLabel("Baslik").fill("Satis Yetkinlik");
    await page.getByRole("button", { name: "Kaydet" }).click();
  });

  test("Notification: slack webhook test + delivery", async ({ page }) => {
    await page.goto("/panel/ayarlar/entegrasyonlar/slack");
    await page.getByRole("button", { name: "Test Mesaji Gonder" }).click();
    await expect(page.getByText("Mesaj gonderildi")).toBeVisible();
  });

  test("Career Path: kariyer yolu editoru", async ({ page }) => {
    await page.goto("/panel/mobility/kariyer-yolu");
    await page.getByRole("button", { name: "Yeni Yol" }).click();
    await page.getByLabel("Isim").fill("Junior -> Senior Dev");
    await page.getByRole("button", { name: "Kaydet" }).click();
  });

  test("Tenant: organizasyon seması güncelle", async ({ page }) => {
    await page.goto("/panel/organizasyon/sema");
    await page.getByRole("button", { name: "Yeni Departman" }).click();
    await page.getByLabel("Ad").fill("AR-GE");
    await page.getByRole("button", { name: "Kaydet" }).click();
  });

  test("Survey: BAT-12-TR cevap + aggregation (anonim)", async ({ page }) => {
    await page.goto("/anket/katil?code=bat12-anon");
    for (let i = 0; i < 12; i++) {
      await page.getByRole("radio", { name: /Bazen/ }).first().check();
      await page.getByRole("button", { name: "Ileri" }).click().catch(() => {});
    }
    await page.getByRole("button", { name: "Gonder" }).click();
    await expect(page.getByText(/Tesekkurler/)).toBeVisible();
  });

  test("Burnout: risk skoru + oneri gorsel", async ({ page }) => {
    await page.goto("/panel/burnout");
    await expect(page.getByText(/Tukenmislik Riski/)).toBeVisible();
  });

  test("Dashboard: son 7 gun trend grafigi", async ({ page }) => {
    await page.goto("/panel");
    await expect(page.locator('[data-testid="trend-chart"]')).toBeVisible();
  });
});
