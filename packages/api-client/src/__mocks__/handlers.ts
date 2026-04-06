/**
 * MSW request handlers for all API endpoints.
 *
 * These handlers provide mock responses for testing.
 * Consumers can use `buildHandlers(overrides)` to customize responses.
 */
import { http, HttpResponse, type HttpHandler } from 'msw';
import { fixtures } from './fixtures';

const BASE_URL = 'https://api.upcore.test/v1';

const paginate = <T>(items: T[], page = 1, pageSize = 20) => ({
  items: items.slice((page - 1) * pageSize, page * pageSize),
  total: items.length,
  page,
  pageSize,
  hasMore: page * pageSize < items.length,
});

export const handlers: HttpHandler[] = [
  // ── Auth ──────────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/auth/me`, () => {
    return HttpResponse.json(fixtures.users.admin);
  }),

  http.get(`${BASE_URL}/auth/tenant`, () => {
    return HttpResponse.json(fixtures.tenants.acme);
  }),

  http.post(`${BASE_URL}/auth/login`, () => {
    return HttpResponse.json({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      accessTokenExpiresAt: '2026-04-04T12:00:00+03:00',
      user: fixtures.users.admin,
      tenant: fixtures.tenants.acme,
      requiresMfa: false,
    });
  }),

  http.post(`${BASE_URL}/auth/signup`, () => {
    return HttpResponse.json({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      accessTokenExpiresAt: '2026-04-04T12:00:00+03:00',
      user: fixtures.users.admin,
      tenant: fixtures.tenants.acme,
    });
  }),

  http.post(`${BASE_URL}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${BASE_URL}/auth/forgot-password`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${BASE_URL}/auth/reset-password`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Employees ─────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/employees`, () => {
    return HttpResponse.json(
      paginate(Object.values(fixtures.employees)),
    );
  }),

  http.get(`${BASE_URL}/employees/:id`, ({ params }) => {
    const id = params['id'] as string;
    const employee = Object.values(fixtures.employees).find((e) => e.id === id);
    if (!employee) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Employee not found', messageTr: 'Çalışan bulunamadı', traceId: 'test' },
        { status: 404 },
      );
    }
    return HttpResponse.json(employee);
  }),

  http.post(`${BASE_URL}/employees`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      { id: '00000000-0000-0000-0000-000000000199', ...body },
      { status: 201 },
    );
  }),

  http.patch(`${BASE_URL}/employees/:id`, async ({ params, request }) => {
    const id = params['id'] as string;
    const body = await request.json() as Record<string, unknown>;
    const employee = Object.values(fixtures.employees).find((e) => e.id === id);
    return HttpResponse.json({ ...employee, ...body });
  }),

  http.delete(`${BASE_URL}/employees/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${BASE_URL}/employees/:id/terminate`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Departments ───────────────────────────────────────────────────────
  http.get(`${BASE_URL}/departments`, () => {
    return HttpResponse.json(
      paginate(Object.values(fixtures.departments)),
    );
  }),

  http.get(`${BASE_URL}/departments/tree`, () => {
    return HttpResponse.json([
      { ...fixtures.departments.engineering, children: [] },
    ]);
  }),

  http.get(`${BASE_URL}/departments/:id`, ({ params }) => {
    const id = params['id'] as string;
    const dept = Object.values(fixtures.departments).find((d) => d.id === id);
    return dept ? HttpResponse.json(dept) : HttpResponse.json({}, { status: 404 });
  }),

  http.post(`${BASE_URL}/departments`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      { id: '00000000-0000-0000-0000-000000001099', ...body },
      { status: 201 },
    );
  }),

  // ── Leaves ────────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/leaves`, () => {
    return HttpResponse.json(paginate([]));
  }),

  http.get(`${BASE_URL}/leaves/my`, () => {
    return HttpResponse.json(paginate([]));
  }),

  http.get(`${BASE_URL}/leaves/balance/:employeeId`, () => {
    return HttpResponse.json([
      {
        employeeId: fixtures.employees.ayse.id,
        leaveTypeId: '00000000-0000-0000-0000-000000006000',
        type: 'ANNUAL',
        year: 2026,
        entitled: 14,
        used: 3,
        pending: 2,
        carriedOver: 0,
        remaining: 9,
        updatedAt: '2026-04-01T00:00:00+03:00',
      },
    ]);
  }),

  http.post(`${BASE_URL}/leaves`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      { id: '00000000-0000-0000-0000-000000007000', status: 'PENDING', ...body },
      { status: 201 },
    );
  }),

  http.post(`${BASE_URL}/leaves/:id/approve`, ({ params }) => {
    return HttpResponse.json({ id: params['id'], status: 'APPROVED' });
  }),

  http.post(`${BASE_URL}/leaves/:id/reject`, ({ params }) => {
    return HttpResponse.json({ id: params['id'], status: 'REJECTED' });
  }),

  // ── Burnout ───────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/burnout/signals/:employeeId`, () => {
    return HttpResponse.json([fixtures.burnout.signal]);
  }),

  http.get(`${BASE_URL}/burnout/heatmap`, () => {
    return HttpResponse.json({
      cells: [],
      weeks: ['2026-03-30'],
      departments: [{ id: fixtures.departments.engineering.id, name: 'Mühendislik' }],
    });
  }),

  http.get(`${BASE_URL}/burnout/critical`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${BASE_URL}/burnout/employees/:id`, () => {
    return HttpResponse.json({
      current: fixtures.burnout.signal,
      trend: [],
      history: [fixtures.burnout.signal],
    });
  }),

  // ── Assessments ───────────────────────────────────────────────────────
  http.get(`${BASE_URL}/assessments`, () => {
    return HttpResponse.json(
      paginate([fixtures.assessments.burnoutSurvey]),
    );
  }),

  http.get(`${BASE_URL}/assessments/my`, () => {
    return HttpResponse.json(paginate([]));
  }),

  http.post(`${BASE_URL}/assessments/start`, () => {
    return HttpResponse.json({
      session: { id: '00000000-0000-0000-0000-000000008000', status: 'IN_PROGRESS' },
      assessment: fixtures.assessments.burnoutSurvey,
    });
  }),

  // ── Surveys ───────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/surveys/cycles`, () => {
    return HttpResponse.json(paginate([]));
  }),

  http.get(`${BASE_URL}/surveys/pending`, () => {
    return HttpResponse.json([]);
  }),

  // ── Notifications ─────────────────────────────────────────────────────
  http.get(`${BASE_URL}/notifications`, () => {
    return HttpResponse.json(paginate([]));
  }),

  http.get(`${BASE_URL}/notifications/unread-count`, () => {
    return HttpResponse.json({ count: 3 });
  }),

  // ── Actions ───────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/actions`, () => {
    return HttpResponse.json(paginate([]));
  }),

  http.post(`${BASE_URL}/actions/:id/approve`, ({ params }) => {
    return HttpResponse.json({ id: params['id'], status: 'APPROVED' });
  }),

  http.post(`${BASE_URL}/actions/:id/reject`, ({ params }) => {
    return HttpResponse.json({ id: params['id'], status: 'REJECTED' });
  }),
];

/**
 * Build handlers with optional overrides for specific endpoints.
 */
export const buildHandlers = (
  overrides: HttpHandler[] = [],
): HttpHandler[] => {
  return [...overrides, ...handlers];
};
