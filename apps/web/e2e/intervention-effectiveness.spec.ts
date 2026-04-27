import { expect, test } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Intervention Effectiveness — İK dashboard → "Etkinlik" tab → tablo görünür →
// tıkla → detay drawer → 8 hafta trend chart.
//
// API çağrıları route.fulfill ile stublanır, böylece test deterministik olur
// ve servis ayakta olmasa bile çalışır.
// ─────────────────────────────────────────────────────────────────────────────

const SUMMARY_FIXTURE = {
  generated_at: '2026-04-20T12:00:00Z',
  items: [
    {
      intervention_id: '11111111-1111-1111-1111-111111111111',
      code: 'COACH-1ON1',
      title_tr: 'Bireysel Koçluk',
      category: 'coaching',
      evidence_tier: 'A',
      n_total: 14,
      n_completed: 14,
      cohens_d: 0.62,
      ci_low: 0.28,
      ci_high: 0.96,
      p_value: 0.004,
      mean_pre: 4.05,
      mean_post: 3.42,
      avg_bat_drop: -0.63,
      effect_category: 'medium',
      insufficient: false,
    },
    {
      intervention_id: '22222222-2222-2222-2222-222222222222',
      code: 'FLEX-REMOTE',
      title_tr: 'Esneklik Artırma',
      category: 'flexibility',
      evidence_tier: 'B',
      n_total: 4,
      n_completed: 4,
      cohens_d: null,
      ci_low: null,
      ci_high: null,
      p_value: null,
      mean_pre: null,
      mean_post: null,
      avg_bat_drop: null,
      effect_category: 'insufficient',
      insufficient: true,
    },
  ],
};

const TREND_FIXTURE = {
  weeks: 8,
  generated_at: '2026-04-20T12:00:00Z',
  series: [
    {
      intervention_id: '11111111-1111-1111-1111-111111111111',
      code: 'COACH-1ON1',
      title_tr: 'Bireysel Koçluk',
      points: Array.from({ length: 8 }).map((_, i) => {
        const week = new Date('2026-02-23T00:00:00Z');
        week.setUTCDate(week.getUTCDate() + i * 7);
        const hasData = i >= 3;
        return {
          week_start: week.toISOString(),
          n: hasData ? 12 : 0,
          cohens_d: hasData ? 0.5 + i * 0.04 : null,
          ci_low: hasData ? 0.2 + i * 0.03 : null,
          ci_high: hasData ? 0.8 + i * 0.05 : null,
        };
      }),
    },
  ],
};

const DETAIL_FIXTURE = {
  summary: SUMMARY_FIXTURE.items[0],
  trend: TREND_FIXTURE.series[0]!.points,
  entries: [
    {
      assignment_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      employee_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      pre_bat_score: 4.1,
      post_bat_score: 3.2,
      delta: -0.9,
      success: true,
      measured_at: '2026-04-10T10:00:00Z',
      horizon_weeks: 8,
    },
    {
      assignment_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      employee_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      pre_bat_score: 3.9,
      post_bat_score: 3.4,
      delta: -0.5,
      success: true,
      measured_at: '2026-04-12T10:00:00Z',
      horizon_weeks: 8,
    },
  ],
};

test.describe('Intervention Effectiveness panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/interventions/effectiveness/summary', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SUMMARY_FIXTURE),
      }),
    );
    await page.route(
      '**/api/v1/interventions/effectiveness/trends?**',
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(TREND_FIXTURE),
        }),
    );
    await page.route(
      /.*\/api\/v1\/interventions\/effectiveness\/[0-9a-f-]+\/detail.*/,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(DETAIL_FIXTURE),
        }),
    );
  });

  test('tablo görünür, CI braketli biçimde renderlanır ve yetersiz satır vurgulanır', async ({
    page,
  }) => {
    await page.goto('/tukenmislik');

    const panel = page.getByTestId('intervention-effectiveness');
    await expect(panel).toBeVisible();

    const table = page.getByTestId('effectiveness-table');
    await expect(table).toBeVisible();

    // Medium effect row must render CI bracketed.
    const mediumRow = page.getByTestId('effectiveness-row-COACH-1ON1');
    await expect(mediumRow).toContainText('d=0.62');
    await expect(mediumRow).toContainText('[0.28, 0.96]');
    await expect(mediumRow).toContainText('Orta');

    // Insufficient row must fall back to "Yetersiz veri" with no numeric d.
    const insufficientRow = page.getByTestId('effectiveness-row-FLEX-REMOTE');
    await expect(insufficientRow).toContainText('Yetersiz veri');
    await expect(insufficientRow).not.toContainText('d=');
  });

  test('satıra tıklayınca detay drawer açılır ve 8 haftalık trend grafiği görünür', async ({
    page,
  }) => {
    await page.goto('/tukenmislik');

    await page.getByTestId('effectiveness-open-detail-COACH-1ON1').click();

    const drawer = page.getByTestId('effectiveness-detail-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('Bireysel Koçluk');
    await expect(drawer).toContainText('d=0.62');
    await expect(drawer).toContainText('[0.28, 0.96]');

    // Trend chart renders one SVG per TrendChart instance — detail drawer has
    // a DetailTrend which uses the same chart component with test-id.
    await expect(
      drawer.getByTestId('effectiveness-trend-chart').first(),
    ).toBeVisible();

    // Per-employee entries must render with the delta highlighted.
    await expect(drawer).toContainText('Çalışan ölçümleri (2)');
  });

  test('CSV indir butonu yüklenen veriye ulaşamazsa disable kalır', async ({
    page,
  }) => {
    await page.route(
      '**/api/v1/interventions/effectiveness/summary',
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ generated_at: '', items: [] }),
        }),
    );
    await page.goto('/tukenmislik');
    await expect(page.getByTestId('effectiveness-empty')).toBeVisible();
    await expect(page.getByTestId('effectiveness-export-csv')).toBeDisabled();
  });
});
