import { test, expect } from "@playwright/test";
import { TEST_EMPLOYEES } from "../fixtures/data";

test.describe("Calisan Yonetimi", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/panel/calisanlar");
    await page.waitForLoadState("networkidle");
  });

  test("calisan listesini goruntuleme", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Calisanlar" })).toBeVisible();

    // Table should be visible with headers
    const table = page.locator("table");
    await expect(table).toBeVisible();
    await expect(table.getByText("Ad Soyad")).toBeVisible();
    await expect(table.getByText("Departman")).toBeVisible();
    await expect(table.getByText("Pozisyon")).toBeVisible();
    await expect(table.getByText("Durum")).toBeVisible();
  });

  test("yeni calisan ekleme", async ({ page }) => {
    const employee = TEST_EMPLOYEES[0];

    await page.getByRole("button", { name: "Yeni Calisan" }).click();

    // Fill form
    await expect(
      page.getByRole("heading", { name: "Yeni Calisan Ekle" })
    ).toBeVisible();

    await page.getByLabel("Ad").fill(employee.firstName);
    await page.getByLabel("Soyad").fill(employee.lastName);
    await page.getByLabel("E-posta").fill(employee.email);
    await page.getByLabel("Telefon").fill(employee.phone);
    await page.getByLabel("TC Kimlik No").fill(employee.tcKimlikNo);
    await page.getByLabel("Dogum Tarihi").fill(employee.birthDate);
    await page.getByLabel("Departman").selectOption(employee.department);
    await page.getByLabel("Pozisyon").fill(employee.position);
    await page.getByLabel("Ise Baslama Tarihi").fill(employee.startDate);

    await page.getByRole("button", { name: "Kaydet" }).click();

    // Verify success
    await expect(
      page.getByText("Calisan basariyla eklendi")
    ).toBeVisible();

    // Should appear in the list
    await page.goto("/panel/calisanlar");
    await expect(
      page.getByText(`${employee.firstName} ${employee.lastName}`)
    ).toBeVisible();
  });

  test("calisan arama", async ({ page }) => {
    const searchTerm = "Ahmet";

    const searchInput = page.getByPlaceholder("Calisan ara...");
    await searchInput.fill(searchTerm);

    // Wait for filtered results
    await page.waitForTimeout(500); // debounce
    await expect(page.getByText("Ahmet")).toBeVisible();

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
  });

  test("departmana gore filtreleme", async ({ page }) => {
    const departmentFilter = page.getByLabel("Departman Filtresi");
    await departmentFilter.selectOption("Yazilim Gelistirme");

    // Wait for filtered results
    await page.waitForLoadState("networkidle");

    // All visible employees should be from this department
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText("Yazilim Gelistirme");
    }
  });

  test("calisan detay sayfasini goruntuleme", async ({ page }) => {
    // Click first employee in list
    const firstRow = page.locator("table tbody tr").first();
    const employeeName = await firstRow
      .locator("td")
      .first()
      .textContent();
    await firstRow.click();

    // Should navigate to detail page
    await page.waitForURL("**/panel/calisanlar/**");

    // Verify detail sections
    await expect(
      page.getByRole("heading", { name: "Calisan Detayi" })
    ).toBeVisible();
    if (employeeName) {
      await expect(page.getByText(employeeName.trim())).toBeVisible();
    }

    // Tabs should be visible
    await expect(page.getByRole("tab", { name: "Genel Bilgiler" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Izinler" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Belgeler" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Performans" })).toBeVisible();
  });

  test("calisan bilgilerini guncelleme", async ({ page }) => {
    // Navigate to first employee
    await page.locator("table tbody tr").first().click();
    await page.waitForURL("**/panel/calisanlar/**");

    // Click edit
    await page.getByRole("button", { name: "Duzenle" }).click();

    // Update position
    const positionInput = page.getByLabel("Pozisyon");
    await positionInput.clear();
    await positionInput.fill("Lead Muhendis");

    await page.getByRole("button", { name: "Kaydet" }).click();

    await expect(
      page.getByText("Calisan bilgileri guncellendi")
    ).toBeVisible();
    await expect(page.getByText("Lead Muhendis")).toBeVisible();
  });

  test("calisan listesini CSV olarak disa aktarma", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Disa Aktar" }).click();
    await page.getByRole("menuitem", { name: "CSV" }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("calisanlar");
    expect(download.suggestedFilename()).toContain(".csv");
  });
});
