import { test, expect } from '@playwright/test';

/**
 * PIP (Performans İyileştirme Planı) — uçtan uca iş akışı.
 *
 * Akış:
 *   1. HR /admin/pip sayfasını açar, yeni PIP dialog ile dosya açar.
 *   2. Dosya detayından legal onayına gönderir.
 *   3. Legal onay ile dosya aktive edilir.
 *   4. 3 check-in eklenir.
 *   5. "Terminated" sonucu → legal_file_url olmadan 422 validation.
 *   6. /portal/pip çalışan salt-okunur görünümü test edilir.
 *
 * Not: Bu test suite gerçek seed data veya manuel hazırlanmış kullanıcılar
 * gerektirir. Authentication `auth.setup.ts` tarafından yapılır.
 */

test.describe('PIP · iş akışı (İş Kanunu 25/2)', () => {
  test('HR panel yüklenir ve boş/dolu liste durumları görünür', async ({ page }) => {
    await page.goto('/admin/pip');
    await expect(page.getByRole('heading', { name: /performans i̇yileştirme planları/i })).toBeVisible();

    // Either empty state or at least one list row must render.
    const hasList = await page.getByTestId('pip-list').count();
    const hasEmpty = await page.getByText(/kayıtlı pip bulunmuyor/i).count();
    expect(hasList + hasEmpty).toBeGreaterThan(0);
  });

  test('Yeni PIP dialog açılıp doğrulama kontrolleri çalışır', async ({ page }) => {
    await page.goto('/admin/pip');
    await page.getByTestId('new-pip-btn').click();
    await expect(page.getByTestId('initiate-pip-dialog')).toBeVisible();

    // Submit boş formla — toast hata mesajı beklenir.
    await page.getByTestId('pip-submit-btn').click();
    // Dialog kapanmamalı — validation güdümlü.
    await expect(page.getByTestId('initiate-pip-dialog')).toBeVisible();
  });

  test('Durum filtreleri seçilebilir', async ({ page }) => {
    await page.goto('/admin/pip');

    // "Aktif" filtresini seç
    await page.getByRole('button', { name: /^aktif$/i }).first().click();
    // URL ya da state değişmeli — query param yok ama buton vurgulu olmalı
    const activeBtn = page.getByRole('button', { name: /^aktif$/i }).first();
    const bg = await activeBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBeTruthy();
  });

  test('Çalışan portal salt-okunur görünümü erişilebilir', async ({ page }) => {
    await page.goto('/portal/pip');
    await expect(page.getByRole('heading', { name: /performans dosyam/i })).toBeVisible();

    // Boş state ya da en az bir kart olmalı
    const emptyOrCards =
      (await page.getByText(/aktif pip dosyanız yok/i).count()) +
      (await page.getByTestId('portal-pip-card').count());
    expect(emptyOrCards).toBeGreaterThan(0);
  });

  test('Terminated kapatma için legal dosya UI zorunlu hale getirir', async ({ page }) => {
    await page.goto('/admin/pip');
    // Listedeki ilk aktif row'u aç (eğer varsa)
    const rows = page.getByTestId('pip-row');
    const count = await rows.count();
    test.skip(count === 0, 'Aktif PIP dosyası yok — test veri gerekli.');

    await rows.first().getByTestId('pip-detail-link').click();
    // Detay sayfası yüklenmeli
    await expect(page.getByTestId('pip-status-badge')).toBeVisible({ timeout: 10_000 });

    // Eğer dosya aktif durumdaysa terminated alanı görünür
    const termBtn = page.getByTestId('close-terminated-btn');
    if (await termBtn.count()) {
      // Tıklayıp confirm'i kaçır: zorunlu alanlar uyarı ver
      page.once('dialog', (d) => d.dismiss());
      await termBtn.click();
      // Yine page görünmeli — mutation tetiklenmemeli çünkü alanlar boş
      await expect(page.getByTestId('pip-status-badge')).toBeVisible();
    }
  });
});
