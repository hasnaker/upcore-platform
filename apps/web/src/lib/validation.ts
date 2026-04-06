/**
 * Input Validation Utilities
 * Lightweight Zod-like validation for API routes — no external dependencies.
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Validate UUID format
 */
export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Validate number in range
 */
export function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

/**
 * Validate non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate enum value
 */
export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

/**
 * Validate nine-box PATCH request
 */
export function validateNineBoxPatch(body: { [key: string]: unknown }): ValidationResult<{
  employeeId: string;
  performanceScore?: number;
  potentialScore?: number;
  category?: string;
}> {
  const errors: ValidationError[] = [];

  if (!isValidUUID(body['employeeId'])) {
    errors.push({ field: 'employeeId', message: 'Gecerli bir UUID olmali' });
  }
  if (body['performanceScore'] !== undefined && !isNumberInRange(body['performanceScore'], 0, 100)) {
    errors.push({ field: 'performanceScore', message: '0-100 arasi olmali' });
  }
  if (body['potentialScore'] !== undefined && !isNumberInRange(body['potentialScore'], 0, 100)) {
    errors.push({ field: 'potentialScore', message: '0-100 arasi olmali' });
  }
  if (body['category'] !== undefined && !isOneOf(body['category'], ['star', 'growth', 'solid', 'average', 'risk'] as const)) {
    errors.push({ field: 'category', message: 'Gecersiz kategori' });
  }

  if (errors.length > 0) return { success: false, errors };
  return {
    success: true,
    data: {
      employeeId: body['employeeId'] as string,
      performanceScore: body['performanceScore'] as number | undefined,
      potentialScore: body['potentialScore'] as number | undefined,
      category: body['category'] as string | undefined,
    },
  };
}

/**
 * Validate OKR PATCH request
 */
export function validateOkrPatch(body: { [key: string]: unknown }): ValidationResult<{
  keyResultId?: string;
  objectiveId?: string;
  progress: number;
}> {
  const errors: ValidationError[] = [];

  if (!isNumberInRange(body['progress'], 0, 100)) {
    errors.push({ field: 'progress', message: '0-100 arasi olmali' });
  }
  if (body['keyResultId'] && !isValidUUID(body['keyResultId'])) {
    errors.push({ field: 'keyResultId', message: 'Gecerli bir UUID olmali' });
  }
  if (body['objectiveId'] && !isValidUUID(body['objectiveId'])) {
    errors.push({ field: 'objectiveId', message: 'Gecerli bir UUID olmali' });
  }
  if (!body['keyResultId'] && !body['objectiveId']) {
    errors.push({ field: 'keyResultId|objectiveId', message: 'En az biri zorunlu' });
  }

  if (errors.length > 0) return { success: false, errors };
  return {
    success: true,
    data: {
      keyResultId: body['keyResultId'] as string | undefined,
      objectiveId: body['objectiveId'] as string | undefined,
      progress: body['progress'] as number,
    },
  };
}

/**
 * Validate feedback POST request
 */
export function validateFeedbackSubmit(body: { [key: string]: unknown }): ValidationResult<{
  cycleId: string;
  evaluatorId: string;
  evaluateeId: string;
  relationship: string;
  scores: Record<string, number>;
  comments?: string;
}> {
  const errors: ValidationError[] = [];

  if (!isValidUUID(body['cycleId'])) errors.push({ field: 'cycleId', message: 'Gecerli UUID olmali' });
  if (!isValidUUID(body['evaluatorId'])) errors.push({ field: 'evaluatorId', message: 'Gecerli UUID olmali' });
  if (!isValidUUID(body['evaluateeId'])) errors.push({ field: 'evaluateeId', message: 'Gecerli UUID olmali' });
  if (!isOneOf(body['relationship'], ['manager', 'peer', 'self', 'subordinate'] as const)) {
    errors.push({ field: 'relationship', message: 'manager/peer/self/subordinate olmali' });
  }
  if (!body['scores'] || typeof body['scores'] !== 'object') {
    errors.push({ field: 'scores', message: 'Puan objesi zorunlu' });
  }

  if (errors.length > 0) return { success: false, errors };
  return {
    success: true,
    data: {
      cycleId: body['cycleId'] as string,
      evaluatorId: body['evaluatorId'] as string,
      evaluateeId: body['evaluateeId'] as string,
      relationship: body['relationship'] as string,
      scores: body['scores'] as Record<string, number>,
      comments: body['comments'] as string | undefined,
    },
  };
}
