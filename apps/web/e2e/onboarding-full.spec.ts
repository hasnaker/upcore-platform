import { test, expect } from '@playwright/test';

// Onboarding wizard — full end-to-end flow across all 10 steps. Ports the
// SKILL.md acceptance criteria into actionable browser tests.
//
// Pre-req: a fresh Clerk test user that does NOT yet have a committed tenant
// (i.e. their in-progress draft is valid). In CI we reset the draft via
// /onboarding/abandon at the top of each scenario.

const STEPS: Array<{ slug: string; heading: RegExp }> = [
  { slug: 'sirket', heading: /şirket/i },
  { slug: 'yonetici', heading: /admin|yönetici/i },
  { slug: 'modul', heading: /modül/i },
  { slug: 'calisan', heading: /çalışan/i },
  { slug: 'organizasyon', heading: /organizasyon/i },
  { slug: 'sso', heading: /oturum|sso/i },
  { slug: 'kvkk', heading: /kvkk/i },
  { slug: 'bordro', heading: /sgk|bordro/i },
  { slug: 'entegrasyon', heading: /entegrasyon/i },
  { slug: 'ozet', heading: /özet|kurul/i },
];

test.describe('Onboarding wizard — 10 adım uçtan uca', () => {
  test.beforeEach(async ({ request }) => {
    // Best-effort abandon of any in-progress draft so each scenario starts
    // clean. Ignores errors when there's nothing to abandon.
    await request.post('/api/onboarding/reset').catch(() => {});
  });

  test('Index /onboarding → Step 1 yönlendirmesi', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/onboarding\/sirket/);
  });

  test('Tüm adımlarda sidebar + başlık görünür', async ({ page }) => {
    for (const step of STEPS) {
      await page.goto(`/onboarding/${step.slug}`);
      // Progress sidebar should list all 10 steps.
      await expect(page.getByRole('navigation', { name: /kurulum adımları/i })).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toContainText(step.heading);
    }
  });

  test('Step 1: şirket kayıt + Step 2 yönlendirme', async ({ page }) => {
    await page.goto('/onboarding/sirket');
    await page.getByLabel(/şirket adı/i).fill('E2E Test A.Ş.');
    await page.getByLabel(/şirket url/i).fill('e2e-test-sirket');
    // KOBİ şablonu
    await page.getByLabel(/kobi/i).check().catch(() => {});
    await page.getByRole('button', { name: /kaydet ve devam et/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/yonetici/, { timeout: 10_000 });
  });

  test('Step 4 CSV: örnek dosya indir butonu görünür', async ({ page }) => {
    await page.goto('/onboarding/calisan');
    // Switch to CSV mode
    await page.getByRole('button', { name: /csv yükle/i }).click();
    await expect(page.getByText(/örnek csv.*indir/i)).toBeVisible();
  });

  test('Step 4 manuel: en fazla 5 satır eklenebilir', async ({ page }) => {
    await page.goto('/onboarding/calisan');
    // Default is manual mode with 1 row.
    await expect(page.getByText(/1\s*\/\s*5/)).toBeVisible();
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /çalışan ekle/i }).click();
    }
    await expect(page.getByText(/5\s*\/\s*5/)).toBeVisible();
    // Button is disabled at cap.
    await expect(page.getByRole('button', { name: /çalışan ekle/i })).toBeDisabled();
  });

  test('Step 5 org chart: 3 şablondan biri seçilebilir', async ({ page }) => {
    await page.goto('/onboarding/organizasyon');
    await expect(page.getByRole('button', { name: /hiyerarşik/i })).toBeVisible();
    await page.getByRole('button', { name: /matris/i }).click();
    // Matrix template seeds at least one "Ortak:" department row.
    await expect(page.locator('input[value*="Ortak"]').first()).toBeVisible();
  });

  test('Step 7 KVKK: 3 aydınlatma metni alanı görünür', async ({ page }) => {
    await page.goto('/onboarding/kvkk');
    await expect(page.getByText(/çalışan aydınlatma metni/i)).toBeVisible();
    await expect(page.getByText(/aday aydınlatma metni/i)).toBeVisible();
    await expect(page.getByText(/ziyaretçi aydınlatma metni/i)).toBeVisible();
  });

  test('Step 10 özet: kuruluma başla butonu görünür', async ({ page }) => {
    await page.goto('/onboarding/ozet');
    await expect(page.getByRole('button', { name: /kuruluma başla/i })).toBeVisible();
  });

  test('Draft reload: bir adım sonrası kaldığı yerden devam', async ({ page }) => {
    // Step 1: şirket bilgisini kaydet
    await page.goto('/onboarding/sirket');
    await page.getByLabel(/şirket adı/i).fill('Reload Test');
    await page.getByLabel(/şirket url/i).fill('reload-test-co');
    await page.getByRole('button', { name: /kaydet ve devam et/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/yonetici/, { timeout: 10_000 });

    // Index'e dönüp tekrar /onboarding'e gel — sidebar adım 1'i "completed" göstermeli
    await page.goto('/onboarding/sirket');
    const companyInput = page.getByLabel(/şirket adı/i);
    await expect(companyInput).toHaveValue('Reload Test');
  });

  test('Daha sonra tamamla: anasayfaya döner', async ({ page }) => {
    await page.goto('/onboarding/yonetici');
    // Auto-confirm the native confirm() dialog.
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /daha sonra tamamla/i }).click();
    await expect(page).toHaveURL(/\/(?:$|\?)/, { timeout: 10_000 });
  });
});
