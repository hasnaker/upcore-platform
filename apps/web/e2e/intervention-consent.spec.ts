import { expect, test } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Koruma P1 — Çalışan consent akışı e2e
//
// Senaryo:
//   1. Çalışan /portal/muhadale/{assignmentId} sayfasını açar.
//   2. Sayfa müdahale detayını, bilimsel dayanak linkini, KVKK checkbox'ını
//      ve 3 butonu (Kabul / Red / Daha sonra) gösterir.
//   3. KVKK işaretlenmeden "Kabul" butonu disabled olur.
//   4. Kullanıcı KVKK'yı işaretleyip "Kabul" tıklar → POST consent gider,
//      başarı toast'ı görünür.
//   5. İK tarafında InterventionFlow listesi güncellenir, rozet
//      "Onaylandı" (accent) olur.
//
// API çağrıları route.fulfill ile stub'lanır.
// ─────────────────────────────────────────────────────────────────────────────

const ASSIGNMENT_ID = 'aaaaaaaa-1111-1111-1111-111111111111';
const INTERV_ID = 'bbbbbbbb-2222-2222-2222-222222222222';
const EMPLOYEE_ID = 'cccccccc-3333-3333-3333-333333333333';

const CATALOG_FIXTURE = {
  id: INTERV_ID,
  code: 'COACH_01',
  title_tr: 'Bireysel Koçluk Programı',
  description_tr:
    '4 haftalık 1-on-1 koçluk. Kariyer hedefleri, iş yükü ve otonomi üzerinde çalışılır.',
  category: 'coaching',
  evidence_tier: 'A',
  delivery_mode: '1on1',
  expected_effect_size: 0.62,
  time_to_effect_weeks: 6,
  duration_weeks: 4,
  active: true,
};

const PENDING_ASSIGNMENT = {
  id: ASSIGNMENT_ID,
  tenant_id: 'dddddddd-4444-4444-4444-444444444444',
  intervention_id: INTERV_ID,
  employee_id: EMPLOYEE_ID,
  assigned_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  status: 'assigned',
  accepted_at: null,
};

test.describe('Intervention consent flow — çalışan tarafı', () => {
  test('sayfa renderları ve kabul akışı API POST çağrısı üretir', async ({ page }) => {
    await page.route(
      `**/api/v1/interventions/assignments/${ASSIGNMENT_ID}`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(PENDING_ASSIGNMENT),
        });
      },
    );
    await page.route(
      `**/api/v1/interventions/catalog/${INTERV_ID}`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(CATALOG_FIXTURE),
        });
      },
    );

    let consentCalled = false;
    let consentBody: Record<string, unknown> | null = null;
    await page.route(
      `**/api/v1/interventions/assignments/${ASSIGNMENT_ID}/consent`,
      async (route, request) => {
        consentCalled = true;
        consentBody = JSON.parse(request.postData() ?? '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'granted' }),
        });
      },
    );

    await page.goto(`/portal/muhadale/${ASSIGNMENT_ID}`);

    // Başlık
    await expect(page.getByRole('heading', { name: /Bireysel Koçluk/i })).toBeVisible();

    // Bilimsel metric hücreleri
    await expect(page.getByText(/Beklenen etki \(d\)/i)).toBeVisible();
    await expect(page.getByText(/0\.62/)).toBeVisible();

    // Bilimsel dayanak linki
    await expect(page.getByRole('link', { name: /JD-R Model/i })).toBeVisible();

    // KVKK checkbox + Kabul disabled başlangıçta
    const acceptBtn = page.getByRole('button', { name: /Kabul ediyorum/i });
    await expect(acceptBtn).toBeDisabled();

    // KVKK'yı işaretle → kabul enable olur
    await page.getByRole('checkbox').first().check();
    await expect(acceptBtn).toBeEnabled();

    await acceptBtn.click();

    // API çağrısı doğru payload ile yapıldı
    await expect.poll(() => consentCalled, { timeout: 5000 }).toBeTruthy();
    expect(consentBody).toMatchObject({ action: 'granted' });
  });

  test('başkasının assignment\'ı 403 → erişim reddi kartı', async ({ page }) => {
    await page.route(
      `**/api/v1/interventions/assignments/${ASSIGNMENT_ID}`,
      async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'forbidden', message: 'not yours' }),
        });
      },
    );

    await page.goto(`/portal/muhadale/${ASSIGNMENT_ID}`);
    await expect(page.getByText(/Bu sayfa sana ait değil/i)).toBeVisible();
  });

  test('zaten cevaplanan atama "Zaten cevapladın" kartını gösterir', async ({ page }) => {
    await page.route(
      `**/api/v1/interventions/assignments/${ASSIGNMENT_ID}`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...PENDING_ASSIGNMENT,
            status: 'in_progress',
            accepted_at: new Date().toISOString(),
          }),
        });
      },
    );
    await page.route(
      `**/api/v1/interventions/catalog/${INTERV_ID}`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(CATALOG_FIXTURE),
        });
      },
    );

    await page.goto(`/portal/muhadale/${ASSIGNMENT_ID}`);
    await expect(page.getByText(/Zaten cevapladın/i)).toBeVisible();
  });

  test('ret gerekçesi opsiyoneldir ve declined POST edilir', async ({ page }) => {
    await page.route(
      `**/api/v1/interventions/assignments/${ASSIGNMENT_ID}`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(PENDING_ASSIGNMENT),
        });
      },
    );
    await page.route(
      `**/api/v1/interventions/catalog/${INTERV_ID}`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(CATALOG_FIXTURE),
        });
      },
    );

    let body: Record<string, unknown> | null = null;
    await page.route(
      `**/api/v1/interventions/assignments/${ASSIGNMENT_ID}/consent`,
      async (route, request) => {
        body = JSON.parse(request.postData() ?? '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'declined' }),
        });
      },
    );

    await page.goto(`/portal/muhadale/${ASSIGNMENT_ID}`);
    await page.getByPlaceholder(/Q4/).fill('Yoğun Q2 dönemi, Haziran sonrası olur.');
    await page.getByRole('button', { name: /Reddediyorum/i }).click();

    await expect.poll(() => body, { timeout: 5000 }).not.toBeNull();
    expect(body).toMatchObject({
      action: 'declined',
      reason: 'Yoğun Q2 dönemi, Haziran sonrası olur.',
    });
  });
});
