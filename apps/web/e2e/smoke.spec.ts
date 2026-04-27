import { test, expect } from '@playwright/test';

// Smoke suite — 5 kritik akış. Her biri <10 sn tamamlanır.
// Başarısızsa deploy gating devreye girer.

test.describe('Smoke — kritik akışlar', () => {
  test('panel: dashboard yüklenir ve başlık görünür', async ({ page }) => {
    await page.goto('/panel');
    await expect(page.getByRole('heading')).toContainText(/aksiyon merkezi|panel|dashboard/i);
  });

  test('calisanlar: liste görünür', async ({ page }) => {
    await page.goto('/calisanlar');
    await expect(page).toHaveURL(/\/calisanlar/);
    await expect(page.locator('table, [role="table"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('izin talep: sayfa açılıyor ve form hazır', async ({ page }) => {
    await page.goto('/portal/izin');
    await expect(page.getByRole('button', { name: /talep|request/i }).first()).toBeVisible();
  });

  test('ayarlar: kvkk-export sayfası yükleniyor', async ({ page }) => {
    await page.goto('/ayarlar/kvkk-export');
    await expect(page.getByRole('heading')).toContainText(/KVKK/i);
  });

  test('api-keys: CRUD modal açılıyor', async ({ page }) => {
    await page.goto('/ayarlar/api-keys');
    await page.getByRole('button', { name: /yeni anahtar/i }).click();
    await expect(page.getByText(/tek seferlik|yalnızca bir kez/i)).toBeVisible();
  });
});
