/**
 * TypeScript type guards and runtime checks.
 */

/**
 * Returns `true` if the value is neither `null` nor `undefined`.
 */
export const isDefined = <T>(v: T | null | undefined): v is T => {
  return v !== null && v !== undefined;
};

/**
 * Returns `true` if the value is a string.
 */
export const isString = (v: unknown): v is string => {
  return typeof v === 'string';
};

/**
 * Returns `true` if the value is a number and not NaN.
 */
export const isNumber = (v: unknown): v is number => {
  return typeof v === 'number' && !Number.isNaN(v);
};

/**
 * Returns `true` if the value is a non-null object (Record-like).
 */
export const isRecord = (v: unknown): v is Record<string, unknown> => {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
};

/**
 * Exhaustiveness check. TypeScript will error if a switch is not exhaustive.
 *
 * @example
 * switch (status) {
 *   case 'active': return 'Active';
 *   case 'inactive': return 'Inactive';
 *   default: assertNever(status);
 * }
 */
export const assertNever = (x: never): never => {
  throw new Error(`Unexpected value: ${String(x)}`);
};
