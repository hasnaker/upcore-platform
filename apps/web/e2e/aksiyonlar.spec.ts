import { test, expect, type Route } from '@playwright/test';

// End-to-end kapsam — /aksiyonlar sayfası.
// Hermetik: bütün ağ istekleri intercept edilir, gerçek backend'e gitmez.
//
// İki temel senaryo:
//   1. Priority actions listelenir, filtre çalışır, "Tamamla" butonu feedback
//      endpoint'ine POST atar ve liste yenilenir.
//   2. Hata durumunda (500 dönen recap / priority) error state + tekrar dene
//      butonu görünür.

const TENANT_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

const priorityResponseActive = {
  actions: [
    {
      action_id: '11111111-1111-4111-8111-111111111111',
      type: 'burnout_check_in',
      target: {
        employee_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        team_id: null,
        name_masked: 'Mehmet Y.',
      },
      priority_score: 0.82,
      urgency: 0.9,
      impact: 0.8,
      actionability: 0.75,
      user_relevance: 0.7,
      title_tr: 'Mehmet Y. ile 1:1 planla — burnout riski yüksek',
      rationale_tr: 'BAT-12 skoru 3 ay üst üste yüksek; son 2 hafta fazla mesai.',
      suggested_within_hours: 24,
      supporting_signals: [
        'BAT-12-TR: 3.8/5 (yüksek)',
        'Fazla mesai: 22 saat (son 2 hafta)',
        'İzin kullanımı: %10 (düşük)',
      ],
      cta: { label_tr: 'Profili aç', href: '/calisanlar/eeeeeeee' },
    },
    {
      action_id: '22222222-2222-4222-8222-222222222222',
      type: 'hiring_urgent',
      target: {
        employee_id: null,
        team_id: 'tttttttt-tttt-4ttt-8ttt-tttttttttttt',
        name_masked: 'Satış Ekibi',
      },
      priority_score: 0.71,
      urgency: 0.65,
      impact: 0.85,
      actionability: 0.6,
      user_relevance: 0.55,
      title_tr: 'Satış Ekibi için acil işe alım — 2 pozisyon açık',
      rationale_tr: 'İki çalışan ayrıldı, yerine alım süreci başlatılmamış.',
      suggested_within_hours: 72,
      supporting_signals: ['Açık pozisyon: 2', 'Ortalama alım süresi: 45 gün'],
      cta: { label_tr: 'İlan yayınla', href: '/ats/ilanlar/yeni' },
    },
  ],
  cached: false,
  generated_at: new Date().toISOString(),
  ttl_seconds: 120,
};

const recapResponse = {
  period: '7d',
  generated_at: new Date().toISOString(),
  metrics: [
    { key: 'generated', label_tr: 'Üretilen Aksiyon', value: 18, change_vs_prev: 3, breakdown: [] },
    { key: 'completed', label_tr: 'Tamamlanan Aksiyon', value: 12, change_vs_prev: 2, breakdown: [] },
    { key: 'dismissed', label_tr: 'Reddedilen Aksiyon', value: 3, change_vs_prev: 0, breakdown: [] },
    { key: 'snoozed', label_tr: 'Ertelenen Aksiyon', value: 2, change_vs_prev: -1, breakdown: [] },
  ],
};

function jsonRoute(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

test.describe('Aksiyon Merkezi — /aksiyonlar', () => {
  test.beforeEach(async ({ page }) => {
    // Auth identity (page reads roles + tenant from /auth/me)
    await page.route('**/api/v1/auth/me', (route) =>
      jsonRoute(route, {
        id: USER_ID,
        tenant_id: TENANT_ID,
        email: 'hr@upcore.test',
        first_name: 'Deniz',
        last_name: 'Yılmaz',
        locale: 'tr',
        status: 'active',
        roles: ['hr_director'],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    );
  });

  test('priority listesi → filtre çalışır → tamamla feedback POST', async ({ page }) => {
    let completed = false;
    let refetched = 0;

    await page.route('**/api/v1/actions/next', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      refetched += 1;
      // Birinci fetch — iki aksiyon; complete'ten sonra liste tek aksiyonla döner.
      if (completed) {
        return jsonRoute(route, {
          ...priorityResponseActive,
          actions: priorityResponseActive.actions.slice(1),
        });
      }
      return jsonRoute(route, priorityResponseActive);
    });

    await page.route('**/api/v1/actions/recap**', (route) => jsonRoute(route, recapResponse));

    await page.route('**/api/v1/actions/complete', async (route) => {
      completed = true;
      return jsonRoute(route, { ok: true });
    });
    await page.route('**/api/v1/actions/dismiss', (route) => jsonRoute(route, { ok: true }));
    await page.route('**/api/v1/actions/snooze', (route) => jsonRoute(route, { ok: true }));

    await page.goto('/aksiyonlar');

    // Başlık + 2 aksiyon kartı
    await expect(page.getByRole('heading', { name: /aksiyon merkezi/i })).toBeVisible();
    await expect(page.getByText('Mehmet Y. ile 1:1 planla — burnout riski yüksek')).toBeVisible();
    await expect(page.getByText('Satış Ekibi için acil işe alım — 2 pozisyon açık')).toBeVisible();

    // Filtre: Tükenmişlik → sadece burnout kartı kalır
    await page.getByRole('button', { name: /^tükenmişlik$/i }).click();
    await expect(page.getByText('Mehmet Y. ile 1:1 planla — burnout riski yüksek')).toBeVisible();
    await expect(page.getByText('Satış Ekibi için acil işe alım — 2 pozisyon açık')).toHaveCount(0);

    // Filtreyi sıfırla
    await page.getByRole('button', { name: /^tümü$/i }).click();
    await expect(page.getByText('Satış Ekibi için acil işe alım — 2 pozisyon açık')).toBeVisible();

    // Haftalık Recap metrics
    await expect(page.getByText(/son 7 günün aksiyon metrikleri/i)).toBeVisible();
    await expect(page.getByText('18')).toBeVisible(); // üretilen
    await expect(page.getByText('12')).toBeVisible(); // tamamlanan

    // İlk aksiyonu tamamla — üstteki Onayla butonu
    const firstCard = page.locator('text=Mehmet Y. ile 1:1 planla').locator('xpath=ancestor::div[3]').first();
    await firstCard.getByRole('button', { name: /onayla/i }).first().click();

    // Complete endpoint'i çağrıldı → liste yenilendi → burnout kartı kayboldu
    await expect(page.getByText('Mehmet Y. ile 1:1 planla — burnout riski yüksek')).toHaveCount(0, {
      timeout: 5_000,
    });
    expect(refetched).toBeGreaterThanOrEqual(2);
  });

  test('priority endpoint 500 dönünce error state + tekrar dene butonu', async ({ page }) => {
    let fails = 0;
    await page.route('**/api/v1/actions/next', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      fails += 1;
      if (fails === 1) {
        return jsonRoute(route, { error: 'upstream_unavailable', message: 'Action center indisponible' }, 500);
      }
      return jsonRoute(route, priorityResponseActive);
    });
    await page.route('**/api/v1/actions/recap**', (route) => jsonRoute(route, recapResponse));

    await page.goto('/aksiyonlar');

    await expect(page.getByRole('alert')).toContainText(/aksiyonlar alınamadı/i);
    const retry = page.getByRole('button', { name: /tekrar dene/i });
    await expect(retry).toBeVisible();

    // Tekrar denediğimizde liste yüklenmeli
    await retry.click();
    await expect(page.getByText('Mehmet Y. ile 1:1 planla — burnout riski yüksek')).toBeVisible({
      timeout: 10_000,
    });
  });
});
