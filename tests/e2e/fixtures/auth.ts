import { test as base, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Test user credentials
// ---------------------------------------------------------------------------
export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: "admin" | "hr_manager" | "employee";
  tenantSlug: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: "admin@test.upcore.io",
    password: "Test.Admin.2024!",
    name: "Test Admin",
    role: "admin",
    tenantSlug: "test-sirket",
  },
  hrManager: {
    email: "ik@test.upcore.io",
    password: "Test.HR.2024!",
    name: "Ayse Yilmaz",
    role: "hr_manager",
    tenantSlug: "test-sirket",
  },
  employee: {
    email: "calisan@test.upcore.io",
    password: "Test.Emp.2024!",
    name: "Mehmet Demir",
    role: "employee",
    tenantSlug: "test-sirket",
  },
};

// ---------------------------------------------------------------------------
// Login helper
// ---------------------------------------------------------------------------
export const login = async (
  page: Page,
  user: TestUser = TEST_USERS.admin
): Promise<void> => {
  await page.goto("/giris");
  await page.waitForLoadState("networkidle");

  // Fill login form
  await page.getByLabel("E-posta").fill(user.email);
  await page.getByLabel("Sifre").fill(user.password);
  await page.getByRole("button", { name: "Giris Yap" }).click();

  // Wait for redirect to dashboard
  await page.waitForURL("**/panel/**", { timeout: 15_000 });
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
};

// ---------------------------------------------------------------------------
// Fixtures: extend base test with authenticated page
// ---------------------------------------------------------------------------
interface AuthFixtures {
  adminPage: Page;
  hrPage: Page;
  employeePage: Page;
}

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "tests/.auth/admin.json",
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  hrPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "tests/.auth/hr.json",
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  employeePage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "tests/.auth/employee.json",
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
