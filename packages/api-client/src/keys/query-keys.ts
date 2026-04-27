/**
 * Hierarchical React Query key factory.
 *
 * Provides structured, type-safe query keys for cache management.
 * Keys are hierarchical so that invalidation can target specific
 * levels (e.g., invalidate all employee queries, or just one detail).
 *
 * @example
 * queryKeys.employees.all()      // ['upcore', 'employees']
 * queryKeys.employees.list({})   // ['upcore', 'employees', 'list', {}]
 * queryKeys.employees.detail(id) // ['upcore', 'employees', 'detail', id]
 */

export const queryKeys = {
  all: ['upcore'] as const,

  // ── Auth ──────────────────────────────────────────────────────────────
  auth: {
    all: () => [...queryKeys.all, 'auth'] as const,
    me: () => [...queryKeys.auth.all(), 'me'] as const,
    tenant: () => [...queryKeys.auth.all(), 'tenant'] as const,
  },

  // ── Employees ─────────────────────────────────────────────────────────
  employees: {
    all: () => [...queryKeys.all, 'employees'] as const,
    list: (filters: object) =>
      [...queryKeys.employees.all(), 'list', filters] as const,
    detail: (id: string) =>
      [...queryKeys.employees.all(), 'detail', id] as const,
    infinite: (filters: object) =>
      [...queryKeys.employees.all(), 'infinite', filters] as const,
  },

  // ── Departments ───────────────────────────────────────────────────────
  departments: {
    all: () => [...queryKeys.all, 'departments'] as const,
    list: (filters?: object) =>
      [...queryKeys.departments.all(), 'list', filters] as const,
    detail: (id: string) =>
      [...queryKeys.departments.all(), 'detail', id] as const,
    tree: () => [...queryKeys.departments.all(), 'tree'] as const,
  },

  // ── Positions ─────────────────────────────────────────────────────────
  positions: {
    all: () => [...queryKeys.all, 'positions'] as const,
    list: (filters?: object) =>
      [...queryKeys.positions.all(), 'list', filters] as const,
    detail: (id: string) =>
      [...queryKeys.positions.all(), 'detail', id] as const,
  },

  // ── Assessments ───────────────────────────────────────────────────────
  assessments: {
    all: () => [...queryKeys.all, 'assessments'] as const,
    list: (filters?: object) =>
      [...queryKeys.assessments.all(), 'list', filters] as const,
    detail: (id: string) =>
      [...queryKeys.assessments.all(), 'detail', id] as const,
    my: () => [...queryKeys.assessments.all(), 'my'] as const,
    results: (employeeId: string, type: string) =>
      [...queryKeys.assessments.all(), 'results', employeeId, type] as const,
    responses: (sessionId: string) =>
      [...queryKeys.assessments.all(), 'responses', sessionId] as const,
  },

  // ── Burnout ───────────────────────────────────────────────────────────
  burnout: {
    all: () => [...queryKeys.all, 'burnout'] as const,
    signals: (query: object) =>
      [...queryKeys.burnout.all(), 'signals', query] as const,
    trend: (departmentId: string, weeks: number) =>
      [...queryKeys.burnout.all(), 'trend', departmentId, weeks] as const,
    heatmap: (query: object) =>
      [...queryKeys.burnout.all(), 'heatmap', query] as const,
    drivers: (employeeId: string) =>
      [...queryKeys.burnout.all(), 'drivers', employeeId] as const,
    employeeDetail: (employeeId: string) =>
      [...queryKeys.burnout.all(), 'employee', employeeId] as const,
  },

  // ── Interventions ─────────────────────────────────────────────────────
  interventions: {
    all: () => [...queryKeys.all, 'interventions'] as const,
    list: (query: object) =>
      [...queryKeys.interventions.all(), 'list', query] as const,
    detail: (id: string) =>
      [...queryKeys.interventions.all(), 'detail', id] as const,
    my: () => [...queryKeys.interventions.all(), 'my'] as const,
    recommendations: (employeeId: string) =>
      [...queryKeys.interventions.all(), 'recommendations', employeeId] as const,
  },

  // ── Surveys / Pulse ───────────────────────────────────────────────────
  surveys: {
    all: () => [...queryKeys.all, 'surveys'] as const,
    cycles: (filters?: object) =>
      [...queryKeys.surveys.all(), 'cycles', filters] as const,
    cycle: (id: string) =>
      [...queryKeys.surveys.all(), 'cycle', id] as const,
    results: (cycleId: string) =>
      [...queryKeys.surveys.all(), 'results', cycleId] as const,
    pending: () => [...queryKeys.surveys.all(), 'pending'] as const,
    stats: (surveyId: string) =>
      [...queryKeys.surveys.all(), 'stats', surveyId] as const,
  },

  // ── Strengths ─────────────────────────────────────────────────────────
  strengths: {
    all: () => [...queryKeys.all, 'strengths'] as const,
    profile: (employeeId: string) =>
      [...queryKeys.strengths.all(), 'profile', employeeId] as const,
    team: (departmentId: string) =>
      [...queryKeys.strengths.all(), 'team', departmentId] as const,
  },

  // ── Career ────────────────────────────────────────────────────────────
  career: {
    all: () => [...queryKeys.all, 'career'] as const,
    path: (employeeId: string) =>
      [...queryKeys.career.all(), 'path', employeeId] as const,
  },

  // ── Leaves ────────────────────────────────────────────────────────────
  leaves: {
    all: () => [...queryKeys.all, 'leaves'] as const,
    list: (query: object) =>
      [...queryKeys.leaves.all(), 'list', query] as const,
    balance: (employeeId: string) =>
      [...queryKeys.leaves.all(), 'balance', employeeId] as const,
    my: () => [...queryKeys.leaves.all(), 'my'] as const,
  },

  // ── Documents ─────────────────────────────────────────────────────────
  documents: {
    all: () => [...queryKeys.all, 'documents'] as const,
    list: (filters: object) =>
      [...queryKeys.documents.all(), 'list', filters] as const,
    detail: (id: string) =>
      [...queryKeys.documents.all(), 'detail', id] as const,
    downloadUrl: (id: string) =>
      [...queryKeys.documents.all(), 'download', id] as const,
  },

  // ── Notifications ─────────────────────────────────────────────────────
  notifications: {
    all: () => [...queryKeys.all, 'notifications'] as const,
    list: (query?: object) =>
      [...queryKeys.notifications.all(), 'list', query] as const,
    unread: () => [...queryKeys.notifications.all(), 'unread'] as const,
  },

  // ── Actions ───────────────────────────────────────────────────────────
  actions: {
    all: () => [...queryKeys.all, 'actions'] as const,
    list: (query: object) =>
      [...queryKeys.actions.all(), 'list', query] as const,
    detail: (id: string) =>
      [...queryKeys.actions.all(), 'detail', id] as const,
  },

  // ── Admin ─────────────────────────────────────────────────────────────
  admin: {
    all: () => [...queryKeys.all, 'admin'] as const,
    tenants: (query?: object) =>
      [...queryKeys.admin.all(), 'tenants', query] as const,
    tenant: (id: string) =>
      [...queryKeys.admin.all(), 'tenant', id] as const,
    auditEvents: (query: object) =>
      [...queryKeys.admin.all(), 'audit', query] as const,
  },

  // ── ATS (Candidates / Applications) ───────────────────────────────────
  ats: {
    all: () => [...queryKeys.all, 'ats'] as const,
    candidates: (filters?: object) =>
      [...queryKeys.ats.all(), 'candidates', filters] as const,
    candidate: (id: string) =>
      [...queryKeys.ats.all(), 'candidate', id] as const,
    pipeline: (positionId?: string) =>
      [...queryKeys.ats.all(), 'pipeline', positionId] as const,
  },
} as const;
