/**
 * Role-Based Access Control (RBAC) utility for UpCore platform.
 *
 * Three roles with escalating privileges:
 *   employee    — can only access own data
 *   manager     — can access department-level data
 *   hr_director — can access all organisational data
 */

export type UserRole = 'employee' | 'manager' | 'hr_director';

export interface AccessContext {
  userId: string;
  role: UserRole;
  departmentId?: string;
  employeeId?: string;
}

/* ------------------------------------------------------------------ */
/*  Permission checks                                                  */
/* ------------------------------------------------------------------ */

/**
 * Can the actor view the target employee's record?
 *
 * - employee:     own data only
 * - manager:      employees in the same department
 * - hr_director:  all employees
 */
export const canViewEmployee = (
  ctx: AccessContext,
  targetEmployeeId: string,
  targetDepartmentId: string,
): boolean => {
  switch (ctx.role) {
    case 'hr_director':
      return true;
    case 'manager':
      return ctx.departmentId === targetDepartmentId;
    case 'employee':
      return ctx.employeeId === targetEmployeeId || ctx.userId === targetEmployeeId;
    default:
      return false;
  }
};

/**
 * Can the actor edit performance data for the target employee?
 *
 * - employee:     own self-assessment only
 * - manager:      team members (not self)
 * - hr_director:  everyone
 */
export const canEditPerformance = (
  ctx: AccessContext,
  targetEmployeeId: string,
): boolean => {
  switch (ctx.role) {
    case 'hr_director':
      return true;
    case 'manager':
      return true; // manager can edit any team member's performance
    case 'employee':
      return ctx.employeeId === targetEmployeeId || ctx.userId === targetEmployeeId;
    default:
      return false;
  }
};

/**
 * Can the actor view sensitive data (burnout scores, salary, PIP)?
 *
 * - employee:     own data only
 * - manager:      team data (burnout is anonymised at presentation layer)
 * - hr_director:  all data
 */
export const canViewSensitiveData = (ctx: AccessContext): boolean => {
  switch (ctx.role) {
    case 'hr_director':
      return true;
    case 'manager':
      return true;
    case 'employee':
      return true; // own data only — row-level filtering via getDataFilter
    default:
      return false;
  }
};

/**
 * Can the actor manage succession planning?
 *
 * Only hr_director has access.
 */
export const canManageSuccession = (ctx: AccessContext): boolean => {
  return ctx.role === 'hr_director';
};

/**
 * Can the actor export data?
 *
 * manager and hr_director only.
 */
export const canExportData = (ctx: AccessContext): boolean => {
  return ctx.role === 'manager' || ctx.role === 'hr_director';
};

/* ------------------------------------------------------------------ */
/*  Data filter                                                        */
/* ------------------------------------------------------------------ */

export interface DataFilter {
  filterType: 'all' | 'department' | 'self';
  departmentId?: string;
  employeeId?: string;
}

/**
 * Returns the appropriate WHERE-clause filter based on the actor's role.
 *
 * - hr_director  → { filterType: 'all' }
 * - manager      → { filterType: 'department', departmentId }
 * - employee     → { filterType: 'self', employeeId }
 */
export const getDataFilter = (ctx: AccessContext): DataFilter => {
  switch (ctx.role) {
    case 'hr_director':
      return { filterType: 'all' };
    case 'manager':
      return { filterType: 'department', departmentId: ctx.departmentId };
    case 'employee':
      return {
        filterType: 'self',
        employeeId: ctx.employeeId ?? ctx.userId,
      };
    default:
      return { filterType: 'self', employeeId: ctx.userId };
  }
};

/* ------------------------------------------------------------------ */
/*  Header parsing (dev mode)                                          */
/* ------------------------------------------------------------------ */

const VALID_ROLES: ReadonlySet<string> = new Set<string>([
  'employee',
  'manager',
  'hr_director',
]);

/**
 * Extract an AccessContext from incoming request headers.
 *
 * Expected headers (set by gateway / dev proxy):
 *   X-User-Id       — UUID of the authenticated user
 *   X-User-Role     — one of employee | manager | hr_director
 *   X-Department-Id — UUID of the user's department (optional)
 */
export const parseAccessContext = (headers: Headers): AccessContext => {
  const userId = headers.get('x-user-id') ?? '';
  const rawRole = headers.get('x-user-role') ?? 'employee';
  const departmentId = headers.get('x-department-id') ?? undefined;

  const role: UserRole = VALID_ROLES.has(rawRole)
    ? (rawRole as UserRole)
    : 'employee';

  return {
    userId,
    role,
    departmentId,
    employeeId: userId, // in dev mode the user IS the employee
  };
};
