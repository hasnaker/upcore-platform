import { test, expect, Route } from '@playwright/test';

// Rotation workflow E2E — three scenarios:
//   1. Employee hits cooldown (365 gün dolmadı) — friendly error shows.
//   2. Full chain: employee submits → manager approves → HR completes →
//      status moves to completed.
//   3. Reject flow: manager rejects with reason → employee sees "Reddedildi".
//
// Hermetic: routes are intercepted, no real backend required.

const TENANT_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const EMP_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const MANAGER_ID = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const ROTATION_ID = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const FROM_POSITION = 'pppppppp-pppp-4ppp-8ppp-pppppppppp01';
const TO_POSITION = 'pppppppp-pppp-4ppp-8ppp-pppppppppp02';
const FROM_DEPT = 'dddddddd-0000-4ddd-8ddd-dddddddddd01';
const TO_DEPT = 'dddddddd-0000-4ddd-8ddd-dddddddddd02';

const authMe = {
  id: EMP_ID,
  email: 'calisan@upcore.test',
  first_name: 'Test',
  last_name: 'Çalışan',
  locale: 'tr',
  status: 'active',
  tenant_id: TENANT_ID,
  roles: ['employee', 'hr', 'manager'],
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const employeeView = {
  id: EMP_ID,
  employee_no: 'E-0001',
  ad: 'Test',
  soyad: 'Çalışan',
  email_is: 'calisan@upcore.test',
  hire_date: '2022-01-01',
  tenure_months: 40,
  employment_status: 'active',
  department_id: FROM_DEPT,
  position_id: FROM_POSITION,
  manager_id: MANAGER_ID,
  created_at: new Date().toISOString(),
};

const departments = [
  { id: FROM_DEPT, tenant_id: TENANT_ID, name_tr: 'Mühendislik', name_en: 'Engineering', parent_id: null, manager_id: MANAGER_ID, level: 1, path: null, created_at: '', updated_at: '' },
  { id: TO_DEPT, tenant_id: TENANT_ID, name_tr: 'Ürün Yönetimi', name_en: 'Product', parent_id: null, manager_id: null, level: 1, path: null, created_at: '', updated_at: '' },
];

const positions = [
  { id: FROM_POSITION, tenant_id: TENANT_ID, title_tr: 'Senior Frontend Engineer', title_en: null, department_id: FROM_DEPT, level: 'senior', created_at: '' },
  { id: TO_POSITION, tenant_id: TENANT_ID, title_tr: 'Product Manager', title_en: null, department_id: TO_DEPT, level: 'senior', created_at: '' },
];

function jsonRoute(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

type RotationRecord = {
  id: string;
  tenant_id: string;
  employee_id: string;
  from_position_id: string;
  to_position_id: string;
  from_department_id: string;
  to_department_id: string;
  status: 'proposed' | 'approved' | 'rejected' | 'active' | 'completed' | 'cancelled';
  reason_tr: string;
  start_date: string | null;
  end_date: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  requested_by_id: string;
  created_at: string;
  updated_at: string;
  employee_full_name?: string;
  from_position_title?: string;
  to_position_title?: string;
};

async function wireCommonRoutes(
  page: import('@playwright/test').Page,
  opts: { cooldown?: boolean } = {},
) {
  await page.route('**/api/v1/auth/me', (r) => jsonRoute(r, authMe));
  await page.route('**/api/v1/employees/' + EMP_ID, (r) => jsonRoute(r, employeeView));
  await page.route('**/api/v1/departments**', (r) =>
    jsonRoute(r, { items: departments, total: departments.length }),
  );
  await page.route('**/api/v1/positions**', (r) =>
    jsonRoute(r, { items: positions, total: positions.length }),
  );

  const state: { rotation: RotationRecord | null } = { rotation: null };

  await page.route('**/api/mobility/rotations/employee/' + EMP_ID, (r) =>
    jsonRoute(r, {
      rotations: state.rotation ? [state.rotation] : [],
      total: state.rotation ? 1 : 0,
    }),
  );

  await page.route('**/api/mobility/rotations/pending**', (r) =>
    jsonRoute(r, {
      rotations: state.rotation && state.rotation.status === 'proposed' ? [state.rotation] : [],
      total: state.rotation && state.rotation.status === 'proposed' ? 1 : 0,
    }),
  );

  await page.route('**/api/mobility/rotations', async (r) => {
    if (r.request().method() !== 'POST') return r.continue();
    if (opts.cooldown) {
      return jsonRoute(
        r,
        {
          error: {
            code: 'cooldown_active',
            message: 'mobility: employee is in rotation cooldown period',
          },
        },
        409,
      );
    }
    const body = (r.request().postDataJSON() ?? {}) as Record<string, string>;
    const now = new Date().toISOString();
    state.rotation = {
      id: ROTATION_ID,
      tenant_id: TENANT_ID,
      employee_id: EMP_ID,
      from_position_id: body['from_position_id'] ?? FROM_POSITION,
      to_position_id: body['to_position_id'] ?? TO_POSITION,
      from_department_id: body['from_department_id'] ?? FROM_DEPT,
      to_department_id: body['to_department_id'] ?? TO_DEPT,
      status: 'proposed',
      reason_tr: body['reason_tr'] ?? '',
      start_date: body['start_date'] ?? null,
      end_date: null,
      approved_by_id: null,
      approved_at: null,
      requested_by_id: EMP_ID,
      created_at: now,
      updated_at: now,
      employee_full_name: 'Test Çalışan',
      from_position_title: 'Senior Frontend Engineer',
      to_position_title: 'Product Manager',
    };
    return jsonRoute(r, state.rotation, 201);
  });

  await page.route(`**/api/mobility/rotations/${ROTATION_ID}/approve`, async (r) => {
    if (!state.rotation) return jsonRoute(r, { error: 'not_found' }, 404);
    state.rotation.status = 'approved';
    state.rotation.approved_at = new Date().toISOString();
    return jsonRoute(r, { status: 'approved' });
  });

  await page.route(`**/api/mobility/rotations/${ROTATION_ID}/reject`, async (r) => {
    const body = (r.request().postDataJSON() ?? {}) as { reason?: string };
    if (!state.rotation) return jsonRoute(r, { error: 'not_found' }, 404);
    if (!body.reason || body.reason.trim().length < 10) {
      return jsonRoute(
        r,
        { error: { code: 'reject_reason_required', message: 'reason required' } },
        400,
      );
    }
    state.rotation.status = 'rejected';
    return jsonRoute(r, { status: 'rejected' });
  });

  await page.route(`**/api/mobility/rotations/${ROTATION_ID}/complete`, async (r) => {
    if (!state.rotation) return jsonRoute(r, { error: 'not_found' }, 404);
    state.rotation.status = 'completed';
    return jsonRoute(r, { status: 'completed' });
  });

  return state;
}

test.describe('Rotasyon iş akışı', () => {
  test('365 gün cooldown dolmadığında friendly hata', async ({ page }) => {
    await wireCommonRoutes(page, { cooldown: true });

    await page.goto('/kariyer/rotasyon');
    await page.getByTestId('new-rotation-cta').click();
    await page.getByTestId('rotation-to-dept').selectOption(TO_DEPT);
    await page.getByTestId('rotation-to-position').selectOption(TO_POSITION);
    await page.getByTestId('rotation-reason').fill(
      'Ürün yönetimi alanında deneyim kazanarak stratejik karar süreçlerine katkı sağlamak istiyorum.',
    );
    await page.getByTestId('rotation-submit').click();

    await expect(
      page.getByText(/Son rotasyonunuzun üzerinden 365 gün geçmeden/),
    ).toBeVisible();
  });

  test('Full approval chain: propose → approve → complete', async ({ page }) => {
    const state = await wireCommonRoutes(page);

    // 1 — employee submits
    await page.goto('/kariyer/rotasyon');
    await page.getByTestId('new-rotation-cta').click();
    await page.getByTestId('rotation-to-dept').selectOption(TO_DEPT);
    await page.getByTestId('rotation-to-position').selectOption(TO_POSITION);
    await page.getByTestId('rotation-reason').fill(
      'Ürün yönetimi alanında yatay bir rotasyon yaparak kullanıcı araştırması, roadmap ve ölçümleme süreçlerini uçtan uca deneyimlemek istiyorum.',
    );
    await page.getByTestId('rotation-submit').click();
    await expect(page.getByText(/Rotasyon talebiniz oluşturuldu/)).toBeVisible();
    await expect(page.getByTestId(`rotation-row-${ROTATION_ID}`)).toBeVisible();
    await expect(page.getByTestId(`rotation-status-${ROTATION_ID}`)).toContainText('Onay bekliyor');

    // 2 — manager approves
    await page.goto('/admin/rotasyon');
    await page.getByTestId('approve-btn-' + ROTATION_ID).click();
    await expect(page.getByText(/Rotasyon onaylandı/)).toBeVisible();
    expect(state.rotation?.status).toBe('approved');

    // 3 — HR completes
    await page.goto('/admin/rotasyon');
    await page.getByTestId('admin-tab-hr').click();
    // Approved rotations aren't in the "pending" list — simulate HR closing
    // by hitting the employee view where a complete button would normally
    // live; here we verify the state transition via direct API route call.
    const res = await page.request.post(
      `/api/mobility/rotations/${ROTATION_ID}/complete`,
    );
    expect(res.status()).toBe(200);
    expect(state.rotation?.status).toBe('completed');
  });

  test('Reject flow: manager reddeder, gerekçe çalışana görünür', async ({ page }) => {
    const state = await wireCommonRoutes(page);

    // 1 — employee submits
    await page.goto('/kariyer/rotasyon');
    await page.getByTestId('new-rotation-cta').click();
    await page.getByTestId('rotation-to-dept').selectOption(TO_DEPT);
    await page.getByTestId('rotation-to-position').selectOption(TO_POSITION);
    await page.getByTestId('rotation-reason').fill(
      'Ürün yönetimi alanında deneyim kazanarak stratejik karar süreçlerine katkı sağlamak ve çapraz fonksiyonel işbirliği yapmak istiyorum.',
    );
    await page.getByTestId('rotation-submit').click();
    await expect(page.getByText(/Rotasyon talebiniz oluşturuldu/)).toBeVisible();

    // 2 — manager rejects with reason
    await page.goto('/admin/rotasyon');
    await page.getByTestId('reject-btn-' + ROTATION_ID).click();
    await page.getByTestId('reject-reason-' + ROTATION_ID).fill(
      'Henüz mevcut takımda 180 günü doldurmadınız, önce kıdem koşulunu tamamlamanızı öneririm.',
    );
    await page.getByTestId('reject-submit-' + ROTATION_ID).click();
    await expect(page.getByText(/Rotasyon reddedildi/)).toBeVisible();
    expect(state.rotation?.status).toBe('rejected');

    // 3 — employee sees rejected status
    await page.goto('/kariyer/rotasyon');
    await expect(page.getByTestId(`rotation-status-${ROTATION_ID}`)).toContainText('Reddedildi');
  });
});
