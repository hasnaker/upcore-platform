import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

// Clerk test mode — developer env'de `E2E_TEST_USER` + `E2E_TEST_PASSWORD`
// için hazır Clerk test kullanıcısı yaratılır (Clerk Dashboard > Testing mode).
// Auth cookie bir kez toplanır, storageState ile diğer testlere aktarılır.

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  const email = process.env['E2E_TEST_USER'];
  const password = process.env['E2E_TEST_PASSWORD'];
  if (!email || !password) {
    setup.skip(true, 'E2E_TEST_USER + E2E_TEST_PASSWORD env required');
  }

  await page.goto('/giris');

  // Clerk default component selectors (v6):
  await page.getByLabel(/e.?mail/i).fill(email!);
  await page.getByRole('button', { name: /devam|continue/i }).click();

  await page.getByLabel(/şifre|password/i).fill(password!);
  await page.getByRole('button', { name: /giriş|sign in|continue/i }).click();

  // /panel'e redirect olmasını bekle
  await page.waitForURL(/\/panel|\/portal/);
  await expect(page.getByRole('heading')).toBeVisible();

  await page.context().storageState({ path: authFile });
});
