import { test, expect } from "@playwright/test";
import { TEST_ASSESSMENT } from "../fixtures/data";

test.describe("Degerlendirme ve Sinav", () => {
  test("yeni degerlendirme olusturma (IK)", async ({ page }) => {
    await page.goto("/panel/degerlendirmeler");
    await page.waitForLoadState("networkidle");

    await page
      .getByRole("button", { name: "Yeni Degerlendirme" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Yeni Degerlendirme Olustur" })
    ).toBeVisible();

    // Fill assessment form
    await page.getByLabel("Baslik").fill(TEST_ASSESSMENT.title);
    await page.getByLabel("Aciklama").fill(TEST_ASSESSMENT.description);
    await page.getByLabel("Sure (dakika)").fill(String(TEST_ASSESSMENT.duration));
    await page
      .getByLabel("Gecme Puani (%)")
      .fill(String(TEST_ASSESSMENT.passingScore));

    // Add questions section
    await page.getByRole("button", { name: "Soru Ekle" }).click();

    // Add first question
    await page.getByLabel("Soru Metni").first().fill(
      "Mikroservis mimarisinde servisler arasi iletisim icin en uygun yaklasim hangisidir?"
    );
    await page.getByLabel("Secenek A").first().fill("Dogrudan veritabani erisimi");
    await page.getByLabel("Secenek B").first().fill("REST API veya mesaj kuyrugu");
    await page.getByLabel("Secenek C").first().fill("Dosya paylasimi");
    await page.getByLabel("Secenek D").first().fill("Global degiskenler");
    await page
      .getByLabel("Dogru Cevap")
      .first()
      .selectOption("B");

    await page.getByRole("button", { name: "Kaydet" }).click();

    await expect(
      page.getByText("Degerlendirme basariyla olusturuldu")
    ).toBeVisible();
  });

  test("degerlendirme listesini goruntuleme", async ({ page }) => {
    await page.goto("/panel/degerlendirmeler");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Degerlendirmeler" })
    ).toBeVisible();

    // Table headers
    const table = page.locator("table");
    await expect(table.getByText("Baslik")).toBeVisible();
    await expect(table.getByText("Durum")).toBeVisible();
    await expect(table.getByText("Katilimci")).toBeVisible();
  });

  test("aday degerlendirme sinavi (ATS)", async ({ page }) => {
    // Navigate to candidate assessment page (public link)
    await page.goto("/sinav/test-token-123");
    await page.waitForLoadState("networkidle");

    // Candidate info screen
    await expect(
      page.getByRole("heading", { name: /Degerlendirme|Sinav/ })
    ).toBeVisible();

    // Enter candidate info
    await page.getByLabel("Ad Soyad").fill("Aday Test Kullanici");
    await page.getByLabel("E-posta").fill("aday@test.com");
    await page.getByRole("button", { name: "Sinava Basla" }).click();

    // Timer should be visible
    await expect(page.locator('[data-testid="exam-timer"]')).toBeVisible();

    // Answer first question
    const firstQuestion = page.locator('[data-testid="question"]').first();
    await expect(firstQuestion).toBeVisible();

    // Select an answer
    await firstQuestion.getByRole("radio").first().click();

    // Navigate to next question
    const nextButton = page.getByRole("button", { name: "Sonraki" });
    if (await nextButton.isVisible()) {
      await nextButton.click();
    }

    // Submit exam (navigate to last question and submit)
    const submitButton = page.getByRole("button", { name: "Sinavi Bitir" });
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Confirm submission
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Gonder" })
        .click();

      await expect(
        page.getByText("Sinaviniz basariyla gonderildi")
      ).toBeVisible();
    }
  });

  test("degerlendirme sonuclarini goruntuleme (IK)", async ({ page }) => {
    await page.goto("/panel/degerlendirmeler");
    await page.waitForLoadState("networkidle");

    // Click on an assessment
    const firstRow = page.locator("table tbody tr").first();
    if ((await firstRow.count()) > 0) {
      await firstRow.click();
      await page.waitForURL("**/panel/degerlendirmeler/**");

      // Results tab
      await page.getByRole("tab", { name: "Sonuclar" }).click();

      await expect(page.getByText("Katilimci Sonuclari")).toBeVisible();

      // Should show pass/fail statistics
      await expect(page.getByText("Basarili")).toBeVisible();
      await expect(page.getByText("Basarisiz")).toBeVisible();
    }
  });

  test("degerlendirmeye aday davet etme", async ({ page }) => {
    await page.goto("/panel/degerlendirmeler");
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("table tbody tr").first();
    if ((await firstRow.count()) > 0) {
      await firstRow.click();
      await page.waitForURL("**/panel/degerlendirmeler/**");

      await page.getByRole("button", { name: "Aday Davet Et" }).click();

      await expect(
        page.getByRole("heading", { name: "Aday Davet" })
      ).toBeVisible();

      await page.getByLabel("E-posta Adresleri").fill("aday1@test.com, aday2@test.com");
      await page.getByRole("button", { name: "Davet Gonder" }).click();

      await expect(
        page.getByText("Davetler basariyla gonderildi")
      ).toBeVisible();
    }
  });

  test("degerlendirme linkini kopyalama", async ({ page }) => {
    await page.goto("/panel/degerlendirmeler");
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("table tbody tr").first();
    if ((await firstRow.count()) > 0) {
      await firstRow.click();
      await page.waitForURL("**/panel/degerlendirmeler/**");

      await page.getByRole("button", { name: "Link Kopyala" }).click();

      await expect(
        page.getByText("Link panoya kopyalandi")
      ).toBeVisible();
    }
  });
});
