import { test as setup, expect } from "@playwright/test";
import { TEST_USERS } from "../fixtures/auth";

/**
 * Global setup: authenticate test users and save storage state.
 * Runs once before all test projects.
 */

const STORAGE_DIR = "tests/.auth";

setup("authenticate as admin", async ({ page }) => {
  const user = TEST_USERS.admin;

  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(user.email);
  await page.getByLabel("Sifre").fill(user.password);
  await page.getByRole("button", { name: "Giris Yap" }).click();

  await page.waitForURL("**/panel/**", { timeout: 15_000 });
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

  await page.context().storageState({ path: `${STORAGE_DIR}/user.json` });
  await page.context().storageState({ path: `${STORAGE_DIR}/admin.json` });
});

setup("authenticate as hr manager", async ({ page }) => {
  const user = TEST_USERS.hrManager;

  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(user.email);
  await page.getByLabel("Sifre").fill(user.password);
  await page.getByRole("button", { name: "Giris Yap" }).click();

  await page.waitForURL("**/panel/**", { timeout: 15_000 });
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

  await page.context().storageState({ path: `${STORAGE_DIR}/hr.json` });
});

setup("authenticate as employee", async ({ page }) => {
  const user = TEST_USERS.employee;

  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(user.email);
  await page.getByLabel("Sifre").fill(user.password);
  await page.getByRole("button", { name: "Giris Yap" }).click();

  await page.waitForURL("**/panel/**", { timeout: 15_000 });
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

  await page.context().storageState({ path: `${STORAGE_DIR}/employee.json` });
});
