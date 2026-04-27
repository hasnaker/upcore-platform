import { test, expect, type Route } from "@playwright/test";

/**
 * Succession (Yedekleme) E2E — İK akışı.
 *
 * Senaryo:
 *   1. İK → /admin/succession/pozisyonlar açılır, 2 kritik pozisyon görünür.
 *   2. 1. pozisyona "Havuz detayı" ile girilir → /admin/succession/havuz/[planId]
 *      ready_now / 1y / 2y üç kolon render edilir.
 *   3. "Aday ekle" modalı açılır, çalışan aranır, seçilir, eklenir (POST).
 *   4. Mevcut bir adayın readiness'i ready_now → ready_1y değiştirilir (PATCH).
 *   5. /kariyer sayfasında 9-kutu grid → "high_potential" segmenti tıklanınca
 *      succession önerisi linki render edilir.
 *
 * Network Mocking: backend henüz test env'de hazır değilse API çağrıları
 * route() ile fake data döndürür. Bu test hem mock'ta hem gerçek stack'te
 * çalışabilir (mock default).
 */

const PLAN_A = "11111111-1111-1111-1111-111111111111";
const PLAN_B = "22222222-2222-2222-2222-222222222222";
const CAND_EXISTING = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const EMP_NEW = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const CYCLE_ACTIVE = "fffff111-1111-1111-1111-111111111111";

async function mockBackend(page: import("@playwright/test").Page) {
  // State we mutate to reflect POST/PATCH/DELETE.
  const candidates = new Map<
    string,
    Array<{
      id: string;
      plan_id: string;
      candidate_employee_id: string;
      readiness: string;
      fit_score: number;
      gaps_tr: string;
      rank: number;
      created_at: string;
      updated_at: string;
    }>
  >();
  candidates.set(PLAN_A, [
    {
      id: CAND_EXISTING,
      plan_id: PLAN_A,
      candidate_employee_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      readiness: "ready_now",
      fit_score: 85,
      gaps_tr: "Bütçe yönetimi",
      rank: 1,
      created_at: "2026-03-01T08:00:00Z",
      updated_at: "2026-03-01T08:00:00Z",
    },
  ]);
  candidates.set(PLAN_B, []);

  const criticalItems = [
    {
      plan_id: PLAN_A,
      position_id: "pos-a",
      position_title_tr: "Satış Müdürü",
      department_tr: "Satış",
      risk_level: "high",
      criticality_tr: "Gelirin %40'ı",
      incumbent_employee_id: "emp-a",
      incumbent_full_name: "Ayşe Yılmaz",
      candidate_count: 1,
      ready_now_count: 1,
      updated_at: "2026-04-01T10:00:00Z",
    },
    {
      plan_id: PLAN_B,
      position_id: "pos-b",
      position_title_tr: "Mühendislik Müdürü",
      department_tr: "Mühendislik",
      risk_level: "critical",
      criticality_tr: "Teknik liderlik",
      incumbent_employee_id: "emp-b",
      incumbent_full_name: "Burak Aydın",
      candidate_count: 0,
      ready_now_count: 0,
      updated_at: "2026-04-02T09:00:00Z",
    },
  ];

  // Gateway is served at the same origin by the web app proxy layer in dev;
  // intercept everything matching /api/v1/mobility/succession-plans.
  await page.route("**/api/v1/mobility/succession-plans/critical**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: criticalItems, total: criticalItems.length }),
    });
  });

  await page.route(
    /\/api\/v1\/mobility\/succession-plans\/([0-9a-f-]+)\/candidates$/,
    async (route: Route) => {
      const url = new URL(route.request().url());
      const match = url.pathname.match(
        /\/api\/v1\/mobility\/succession-plans\/([0-9a-f-]+)\/candidates$/,
      );
      const planId = match?.[1] ?? "";
      const method = route.request().method();

      if (method === "GET") {
        const list = candidates.get(planId) ?? [];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ candidates: list, total: list.length }),
        });
        return;
      }

      if (method === "POST") {
        const body = route.request().postDataJSON() as {
          candidate_employee_id: string;
          readiness: string;
          fit_score?: number;
          gaps_tr?: string;
          rank?: number;
        };
        const list = candidates.get(planId) ?? [];
        const newCand = {
          id: `new-${Date.now()}`,
          plan_id: planId,
          candidate_employee_id: body.candidate_employee_id,
          readiness: body.readiness,
          fit_score: body.fit_score ?? 0,
          gaps_tr: body.gaps_tr ?? "",
          rank: body.rank ?? list.length + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        list.push(newCand);
        candidates.set(planId, list);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newCand),
        });
        return;
      }

      await route.continue();
    },
  );

  await page.route(
    /\/api\/v1\/mobility\/succession-plans\/([0-9a-f-]+)\/candidates\/([0-9a-z-]+)$/,
    async (route: Route) => {
      const url = new URL(route.request().url());
      const match = url.pathname.match(
        /\/api\/v1\/mobility\/succession-plans\/([0-9a-f-]+)\/candidates\/([0-9a-z-]+)$/,
      );
      const planId = match?.[1] ?? "";
      const candidateId = match?.[2] ?? "";
      const method = route.request().method();

      if (method === "PATCH") {
        const body = route.request().postDataJSON() as {
          readiness: string;
          fit_score?: number;
        };
        const list = candidates.get(planId) ?? [];
        const c = list.find((x) => x.id === candidateId);
        if (c) {
          c.readiness = body.readiness;
          if (body.fit_score != null) c.fit_score = body.fit_score;
          c.updated_at = new Date().toISOString();
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(c ?? {}),
        });
        return;
      }

      if (method === "DELETE") {
        const list = candidates.get(planId) ?? [];
        candidates.set(
          planId,
          list.filter((x) => x.id !== candidateId),
        );
        await route.fulfill({ status: 204, body: "" });
        return;
      }

      await route.continue();
    },
  );

  // Employee search autocomplete.
  await page.route("**/api/v1/employees/search**", async (route: Route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get("q") ?? "";
    if (q.toLowerCase().includes("meh")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: EMP_NEW,
              ad: "Mehmet",
              soyad: "Kaya",
              employee_no: "E1001",
              email_is: "mehmet.kaya@upcore.io",
              department_name: "Satış",
              position_name: "Kıdemli Satış Uzmanı",
            },
          ],
          total: 1,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], total: 0 }),
    });
  });

  // Performance cycles + nine-box grid (for /kariyer route).
  await page.route("**/api/v1/performance/cycles**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: CYCLE_ACTIVE,
            tenant_id: "t1",
            name_tr: "2026 Q2",
            cycle_type: "quarterly",
            period_start: "2026-04-01",
            period_end: "2026-06-30",
            status: "active",
            created_at: "2026-04-01T00:00:00Z",
            updated_at: "2026-04-01T00:00:00Z",
          },
        ],
        total: 1,
      }),
    });
  });

  await page.route("**/api/v1/performance/nine-box/grid**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "nb-1",
            cycle_id: CYCLE_ACTIVE,
            employee_id: "emp-hp-1",
            performance_band: "medium",
            potential_band: "high",
            box_label: "Yüksek Potansiyel",
            talent_segment: "high_potential",
            created_at: "2026-04-10T00:00:00Z",
            updated_at: "2026-04-10T00:00:00Z",
          },
          {
            id: "nb-2",
            cycle_id: CYCLE_ACTIVE,
            employee_id: "emp-star-1",
            performance_band: "high",
            potential_band: "high",
            box_label: "Yıldız",
            talent_segment: "star",
            created_at: "2026-04-10T00:00:00Z",
            updated_at: "2026-04-10T00:00:00Z",
          },
          {
            id: "nb-3",
            cycle_id: CYCLE_ACTIVE,
            employee_id: "emp-core-1",
            performance_band: "medium",
            potential_band: "medium",
            box_label: "Kilit Oyuncu",
            talent_segment: "core_player",
            created_at: "2026-04-10T00:00:00Z",
            updated_at: "2026-04-10T00:00:00Z",
          },
        ],
        total: 3,
      }),
    });
  });
}

test.describe("Succession (Yedekleme) planlama", () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
  });

  test("İK: kritik pozisyon listesini açar, 2 pozisyon görür", async ({ page }) => {
    await page.goto("/admin/succession/pozisyonlar");
    await expect(
      page.getByRole("heading", { name: "Kritik Pozisyon Haritası" }),
    ).toBeVisible();

    const rows = page.getByTestId("critical-position-row");
    await expect(rows).toHaveCount(2);
    await expect(page.getByText("Satış Müdürü")).toBeVisible();
    await expect(page.getByText("Mühendislik Müdürü")).toBeVisible();
  });

  test("Havuz detayı: 3 kolon (ready_now/1y/2y) görünür, mevcut aday ready_now kolonundadır", async ({
    page,
  }) => {
    await page.goto(`/admin/succession/havuz/${PLAN_A}`);
    await expect(page.getByTestId("succession-board")).toBeVisible();
    await expect(page.getByTestId("column-ready_now")).toBeVisible();
    await expect(page.getByTestId("column-ready_1y")).toBeVisible();
    await expect(page.getByTestId("column-ready_2y")).toBeVisible();

    // Mevcut aday ready_now kolonunda olmalı.
    const cards = page.getByTestId("candidate-card");
    await expect(cards).toHaveCount(1);
    const readyNowCol = page.getByTestId("column-ready_now");
    await expect(readyNowCol.getByTestId("candidate-card")).toHaveCount(1);
  });

  test("Aday ekle: arama → seç → POST → liste güncellenir", async ({ page }) => {
    await page.goto(`/admin/succession/havuz/${PLAN_B}`);
    await page.getByTestId("add-candidate-btn").click();

    await expect(page.getByTestId("add-candidate-modal")).toBeVisible();
    await page.getByTestId("employee-search-input").fill("Mehmet");

    // Seçenek görünür, tıklanır.
    await expect(page.getByTestId("employee-option").first()).toBeVisible();
    await page.getByTestId("employee-option").first().click();

    // Readiness seç.
    await page.getByTestId("readiness-select-modal").selectOption("ready_1y");

    // Onay.
    await page.getByTestId("confirm-add-candidate").click();

    // Modal kapandı ve kart geldi.
    await expect(page.getByTestId("add-candidate-modal")).toBeHidden();
    await expect(
      page.getByTestId("column-ready_1y").getByTestId("candidate-card"),
    ).toHaveCount(1);
  });

  test("Readiness değiştir: ready_now → ready_1y (PATCH)", async ({ page }) => {
    await page.goto(`/admin/succession/havuz/${PLAN_A}`);
    const card = page.getByTestId("candidate-card").first();
    await card.getByTestId("readiness-select").selectOption("ready_1y");

    // Kart ready_1y kolonuna geçmiş olmalı.
    await expect(
      page.getByTestId("column-ready_1y").getByTestId("candidate-card"),
    ).toHaveCount(1);
    await expect(
      page.getByTestId("column-ready_now").getByTestId("candidate-card"),
    ).toHaveCount(0);
  });

  test("9-kutu grid: high_potential segmenti tıklanınca succession önerisi render edilir", async ({
    page,
  }) => {
    await page.goto("/kariyer");
    // İç pozisyonlar (default) sekmesi.
    await expect(page.getByTestId("nine-box-grid")).toBeVisible();

    // high_potential hücresi görünür + succession badge var.
    const cell = page.getByTestId("box-cell-high_potential");
    await expect(cell).toBeVisible();
    await expect(cell.getByTestId("succession-suggestion-badge")).toBeVisible();

    // Tıklanınca segment drawer + succession önerisi render edilir.
    await cell.click();
    await expect(page.getByTestId("segment-drawer")).toBeVisible();
    await expect(
      page.getByTestId("succession-suggestion-link").first(),
    ).toBeVisible();
  });
});
