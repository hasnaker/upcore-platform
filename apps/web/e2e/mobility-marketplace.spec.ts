import { test, expect, Route } from '@playwright/test';

// End-to-end coverage for the internal marketplace apply → HR triage → employee
// status update loop. Runs fully against intercepted network responses so it is
// hermetic — no test tenant/opportunity setup required in the DB.
//
// The intent is to drive the UI state machine through its four checkpoints:
//   1. Employee lists open opportunities
//   2. Employee opens detail and submits a confidential application
//   3. HR sees the masked "Gizli aday #…" row and invites to interview
//   4. Employee re-loads "Başvurularım" and sees status=Görüşmede

const OPP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const EMP_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const APP_ID = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';

const opportunity = {
  id: OPP_ID,
  tenant_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  title: 'Senior Frontend Engineer',
  description: 'React 19 + TypeScript + Tailwind ile kurumsal paneller inşa eden bir rol.',
  location: 'İstanbul',
  is_remote: true,
  opportunity_type: 'permanent',
  required_skills: ['React', 'TypeScript', 'Next.js'],
  preferred_skills: ['Tailwind'],
  posted_by: EMP_ID,
  posted_at: new Date().toISOString(),
  closes_at: new Date(Date.now() + 14 * 864e5).toISOString(),
  status: 'open',
};

const fitResponse = {
  opportunity_id: OPP_ID,
  employee_id: EMP_ID,
  score: 0.82,
  required_skills: opportunity.required_skills,
  preferred_skills: opportunity.preferred_skills,
  employee_skills: ['React', 'TypeScript', 'Next.js', 'Tailwind'],
  missing_skills: [],
};

function jsonRoute(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

test.describe('Kariyer marketplace — apply → HR triage → başvurularım', () => {
  test.beforeEach(async ({ page }) => {
    // Identity
    await page.route('**/api/v1/auth/me', (route) =>
      jsonRoute(route, {
        id: EMP_ID,
        email: 'employee@upcore.test',
        first_name: 'Test',
        last_name: 'Employee',
        locale: 'tr',
        status: 'active',
        tenant_id: opportunity.tenant_id,
        roles: ['hr', 'employee'],
        metadata: {},
        created_at: opportunity.posted_at,
        updated_at: opportunity.posted_at,
      }),
    );

    // Shared mutable state across the three flows.
    const applications = new Map<
      string,
      {
        id: string;
        tenant_id: string;
        opportunity_id: string;
        employee_id: string;
        cover_note: string | null;
        match_score: number;
        status: string;
        confidential: boolean;
        applied_at: string;
        decided_at: string | null;
        decision_notes: string | null;
      }
    >();

    await page.route(`**/api/mobility/opportunities`, (route) =>
      jsonRoute(route, { items: [opportunity] }),
    );
    await page.route(`**/api/mobility/opportunities/${OPP_ID}`, (route) =>
      jsonRoute(route, opportunity),
    );
    await page.route(`**/api/mobility/opportunities/${OPP_ID}/fit/${EMP_ID}`, (route) =>
      jsonRoute(route, fitResponse),
    );

    // Apply — first call creates, second returns 409.
    await page.route(`**/api/mobility/opportunities/${OPP_ID}/apply`, async (route) => {
      if (applications.has(APP_ID)) {
        return jsonRoute(
          route,
          {
            error: { code: 'already_applied', message: 'bu ilana zaten başvuru var' },
            application: applications.get(APP_ID),
          },
          409,
        );
      }
      const body = route.request().postDataJSON() ?? {};
      const app = {
        id: APP_ID,
        tenant_id: opportunity.tenant_id,
        opportunity_id: OPP_ID,
        employee_id: EMP_ID,
        cover_note: body.cover_note ?? null,
        match_score: 0.82,
        status: 'applied',
        confidential: body.confidential ?? true,
        applied_at: new Date().toISOString(),
        decided_at: null,
        decision_notes: null,
      };
      applications.set(APP_ID, app);
      return jsonRoute(route, app, 201);
    });

    // Employee-scoped list
    await page.route(`**/api/mobility/employees/${EMP_ID}/applications`, (route) =>
      jsonRoute(route, { items: Array.from(applications.values()) }),
    );

    // HR-scoped list — masks confidential pre-interview entries.
    await page.route(`**/api/mobility/opportunities/${OPP_ID}/applications`, (route) => {
      const items = Array.from(applications.values()).map((a) => {
        const revealed =
          !a.confidential || ['interview', 'offered', 'accepted', 'rejected'].includes(a.status);
        return {
          id: a.id,
          tenant_id: a.tenant_id,
          opportunity_id: a.opportunity_id,
          cover_note: a.cover_note,
          match_score: a.match_score,
          status: a.status,
          confidential: a.confidential,
          applied_at: a.applied_at,
          decided_at: a.decided_at,
          decision_notes: a.decision_notes,
          employee_id: revealed ? a.employee_id : null,
          applicant_alias: revealed ? null : `Gizli aday #${a.id.slice(0, 6)}`,
        };
      });
      return jsonRoute(route, { items });
    });

    // HR status transition
    await page.route(`**/api/mobility/applications/${APP_ID}/status`, async (route) => {
      const body = route.request().postDataJSON() ?? {};
      const app = applications.get(APP_ID);
      if (!app) return jsonRoute(route, { error: 'not_found' }, 404);
      app.status = body.status;
      app.decided_at = new Date().toISOString();
      if (body.decision_notes) app.decision_notes = body.decision_notes;
      return jsonRoute(route, { ok: true, status: body.status });
    });
  });

  test('çalışan başvurur, İK görüşmeye alır, çalışan güncel durumu görür', async ({ page }) => {
    // 1 — listing
    await page.goto('/kariyer/marketplace');
    await expect(page.getByRole('heading', { name: /Kariyer Marketplace/i })).toBeVisible();
    await expect(page.getByText('Senior Frontend Engineer')).toBeVisible();

    // 2 — detail + apply (confidential)
    await page.goto(`/kariyer/marketplace/${OPP_ID}`);
    await expect(page.getByRole('heading', { name: 'Senior Frontend Engineer' })).toBeVisible();
    await expect(page.getByText(/JD-R uyum %82/)).toBeVisible();
    await page.getByTestId('cover-note').fill('Next.js ekibine katkı sağlamak istiyorum.');
    await page.getByTestId('candidate-skills').fill('React, TypeScript, Tailwind');
    // confidential default=true, so just submit
    await page.getByTestId('apply-submit').click();
    await expect(page.getByText(/Başvuru gönderildi/)).toBeVisible();

    // 3 — HR triage sees masked row
    await page.goto(`/kariyer/marketplace/${OPP_ID}/applications`);
    const maskedRow = page.getByTestId('applicant-alias');
    await expect(maskedRow).toBeVisible();
    await expect(maskedRow).toContainText(/Gizli aday #/);
    // status=applied → move to interview
    await page
      .getByTestId(`status-select-${APP_ID}`)
      .selectOption('interview');
    await expect(page.getByText(/Durum güncellendi: Görüşmede/)).toBeVisible();

    // 4 — employee sees update
    await page.goto('/kariyer/basvurularim');
    const row = page.getByTestId(`application-row-${APP_ID}`);
    await expect(row).toBeVisible();
    await expect(page.getByTestId(`application-status-${APP_ID}`)).toContainText(/Görüşmede/);
  });

  test('ikinci başvuru 409 conflict olarak engellenir', async ({ page }) => {
    await page.goto(`/kariyer/marketplace/${OPP_ID}`);
    await page.getByTestId('cover-note').fill('İlk başvuru');
    await page.getByTestId('apply-submit').click();
    await expect(page.getByText(/Başvuru gönderildi/)).toBeVisible();

    // Reload — detail now shows "Başvurunuz alındı" instead of the form.
    await page.reload();
    await expect(page.getByText('Başvurunuz alındı')).toBeVisible();
    await expect(page.getByTestId('apply-submit')).toHaveCount(0);
  });
});
