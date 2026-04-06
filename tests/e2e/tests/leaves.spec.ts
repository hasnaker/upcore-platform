import { test, expect } from "@playwright/test";
import { TEST_LEAVE_REQUEST, TEST_LEAVE_TYPES } from "../fixtures/data";

test.describe("Izin Yonetimi", () => {
  test("izin talebi olusturma", async ({ page }) => {
    await page.goto("/panel/izinler");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Yeni Izin Talebi" }).click();

    // Fill leave request form
    await expect(
      page.getByRole("heading", { name: "Izin Talebi" })
    ).toBeVisible();

    await page
      .getByLabel("Izin Turu")
      .selectOption(TEST_LEAVE_REQUEST.type);
    await page
      .getByLabel("Baslangic Tarihi")
      .fill(TEST_LEAVE_REQUEST.startDate);
    await page
      .getByLabel("Bitis Tarihi")
      .fill(TEST_LEAVE_REQUEST.endDate);
    await page.getByLabel("Aciklama").fill(TEST_LEAVE_REQUEST.reason);

    // Verify calculated days
    await expect(
      page.getByText(`${TEST_LEAVE_REQUEST.days} is gunu`)
    ).toBeVisible();

    await page.getByRole("button", { name: "Talep Olustur" }).click();

    await expect(
      page.getByText("Izin talebi basariyla olusturuldu")
    ).toBeVisible();
  });

  test("izin talebini onaylama (IK yoneticisi)", async ({ page }) => {
    await page.goto("/panel/izinler/onay-bekleyenler");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Onay Bekleyen Izinler" })
    ).toBeVisible();

    // Find a pending request
    const pendingRow = page
      .locator("table tbody tr")
      .filter({ hasText: "Beklemede" })
      .first();

    if ((await pendingRow.count()) > 0) {
      // Open approval dialog
      await pendingRow.getByRole("button", { name: "Incele" }).click();

      await expect(
        page.getByRole("heading", { name: "Izin Talebi Detayi" })
      ).toBeVisible();

      // Approve
      await page.getByRole("button", { name: "Onayla" }).click();

      // Confirm approval
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Onayla" })
        .click();

      await expect(
        page.getByText("Izin talebi onaylandi")
      ).toBeVisible();
    }
  });

  test("izin talebini reddetme", async ({ page }) => {
    await page.goto("/panel/izinler/onay-bekleyenler");
    await page.waitForLoadState("networkidle");

    const pendingRow = page
      .locator("table tbody tr")
      .filter({ hasText: "Beklemede" })
      .first();

    if ((await pendingRow.count()) > 0) {
      await pendingRow.getByRole("button", { name: "Incele" }).click();

      await page.getByRole("button", { name: "Reddet" }).click();

      // Fill rejection reason
      await page.getByLabel("Red Nedeni").fill("Proje teslim tarihi nedeniyle uygun degildir");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Reddet" })
        .click();

      await expect(
        page.getByText("Izin talebi reddedildi")
      ).toBeVisible();
    }
  });

  test("izin bakiyesini kontrol etme", async ({ page }) => {
    await page.goto("/panel/izinler");
    await page.waitForLoadState("networkidle");

    // Check balance cards
    const balanceSection = page.locator('[data-testid="leave-balance"]');
    await expect(balanceSection).toBeVisible();

    // Verify each leave type balance is shown
    await expect(balanceSection.getByText("Yillik Izin")).toBeVisible();
    await expect(balanceSection.getByText("Kalan")).toBeVisible();
    await expect(balanceSection.getByText("Kullanilan")).toBeVisible();
  });

  test("izin gecmisini goruntuleme", async ({ page }) => {
    await page.goto("/panel/izinler");
    await page.waitForLoadState("networkidle");

    // Switch to history tab
    await page.getByRole("tab", { name: "Izin Gecmisi" }).click();

    const table = page.locator("table");
    await expect(table).toBeVisible();
    await expect(table.getByText("Izin Turu")).toBeVisible();
    await expect(table.getByText("Tarih")).toBeVisible();
    await expect(table.getByText("Durum")).toBeVisible();
  });

  test("izin takvimini goruntuleme", async ({ page }) => {
    await page.goto("/panel/izinler/takvim");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Izin Takvimi" })
    ).toBeVisible();

    // Calendar should be visible
    await expect(page.locator('[data-testid="leave-calendar"]')).toBeVisible();
  });

  test("izin turlerini listeleme", async ({ page }) => {
    await page.goto("/panel/izinler");

    await page.getByRole("button", { name: "Yeni Izin Talebi" }).click();

    const selectOptions = page.getByLabel("Izin Turu");
    await selectOptions.click();

    // Verify standard leave types exist
    for (const leaveType of TEST_LEAVE_TYPES.slice(0, 3)) {
      await expect(page.getByRole("option", { name: leaveType })).toBeVisible();
    }
  });
});
