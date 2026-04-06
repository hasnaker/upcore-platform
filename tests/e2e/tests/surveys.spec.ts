import { test, expect } from "@playwright/test";
import { BAT_12_TR_QUESTIONS } from "../fixtures/data";

test.describe("Anketler ve Nabiz Olcumu", () => {
  test("BAT-12-TR nabiz anketini doldurma", async ({ page }) => {
    await page.goto("/panel/anketler");
    await page.waitForLoadState("networkidle");

    // Find active BAT-12-TR survey
    const surveyCard = page
      .locator('[data-testid="survey-card"]')
      .filter({ hasText: "BAT-12-TR" })
      .first();

    if ((await surveyCard.count()) === 0) {
      // Might be listed differently
      await page.getByText("Nabiz Anketi").first().click();
    } else {
      await surveyCard.getByRole("button", { name: "Anketi Baslat" }).click();
    }

    // Should be on survey page
    await expect(
      page.getByRole("heading", { name: /Tukenmislik.*Anketi|BAT-12/ })
    ).toBeVisible();

    // Answer each question (select "Bazen" / middle option for all)
    for (let i = 0; i < BAT_12_TR_QUESTIONS.length; i++) {
      const question = BAT_12_TR_QUESTIONS[i];

      // Wait for question to be visible
      await expect(page.getByText(question.text)).toBeVisible();

      // Select middle option (index 2 = "Bazen")
      await page
        .getByRole("radio", { name: question.options[2] })
        .first()
        .click();

      // Go to next question (if not last)
      if (i < BAT_12_TR_QUESTIONS.length - 1) {
        const nextButton = page.getByRole("button", { name: "Sonraki" });
        if (await nextButton.isVisible()) {
          await nextButton.click();
        }
      }
    }

    // Submit survey
    await page.getByRole("button", { name: "Anketi Tamamla" }).click();

    // Confirmation dialog
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Gonder" })
      .click();

    await expect(
      page.getByText("Anket basariyla tamamlandi")
    ).toBeVisible();
  });

  test("aktif anketleri listeleme", async ({ page }) => {
    await page.goto("/panel/anketler");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Anketler" })
    ).toBeVisible();

    // Should show active surveys section
    await expect(page.getByText("Aktif Anketler")).toBeVisible();
  });

  test("tamamlanan anketleri goruntuleme", async ({ page }) => {
    await page.goto("/panel/anketler");
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: "Tamamlananlar" }).click();

    // If there are completed surveys, they should show
    const completedSection = page.locator('[data-testid="completed-surveys"]');
    await expect(completedSection).toBeVisible();
  });

  test("anket sonuclarini goruntuleme (IK)", async ({ page }) => {
    await page.goto("/panel/anketler/sonuclar");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Anket Sonuclari" })
    ).toBeVisible();

    // Should show aggregate results
    await expect(page.getByText("Katilim Orani")).toBeVisible();
    await expect(page.getByText("Ortalama Skor")).toBeVisible();
  });

  test("yeni anket olusturma (IK)", async ({ page }) => {
    await page.goto("/panel/anketler/yonet");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Yeni Anket" }).click();

    await expect(
      page.getByRole("heading", { name: "Yeni Anket Olustur" })
    ).toBeVisible();

    // Select BAT-12-TR template
    await page.getByLabel("Anket Sablonu").selectOption("BAT-12-TR");
    await page.getByLabel("Anket Adi").fill("Mart 2026 Nabiz Anketi");
    await page
      .getByLabel("Hedef Grup")
      .selectOption("Tum Calisanlar");
    await page.getByLabel("Baslangic Tarihi").fill("2026-04-15");
    await page.getByLabel("Bitis Tarihi").fill("2026-04-22");

    await page.getByRole("button", { name: "Olustur" }).click();

    await expect(
      page.getByText("Anket basariyla olusturuldu")
    ).toBeVisible();
  });
});
