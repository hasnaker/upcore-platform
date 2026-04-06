/**
 * Result<T, E> monad for safer error returns without exceptions.
 *
 * Inspired by Rust's Result type. Provides a discriminated union for
 * functions that may fail, avoiding try/catch for expected error paths.
 */

export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Creates a successful Result.
 */
export const ok = <T>(value: T): Result<T, never> => ({
  ok: true,
  value,
});

/**
 * Creates a failed Result.
 */
export const err = <E>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

/**
 * Unwraps a Result, throwing if it's an error.
 * Use only when you're certain the result is ok.
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) return result.value;
  throw result.error instanceof Error
    ? result.error
    : new Error(String(result.error));
};

/**
 * Unwraps a Result with a default value for the error case.
 */
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  return result.ok ? result.value : defaultValue;
};
