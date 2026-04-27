import { describe, it, expect } from 'vitest';
import { ok, err, unwrap, unwrapOr } from './result';

describe('Result', () => {
  it('creates ok result', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it('creates err result', () => {
    const result = err(new Error('fail'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('fail');
    }
  });

  it('unwraps ok result', () => {
    expect(unwrap(ok(42))).toBe(42);
  });

  it('throws on unwrap err result', () => {
    expect(() => unwrap(err(new Error('fail')))).toThrow('fail');
  });

  it('unwrapOr returns value for ok', () => {
    expect(unwrapOr(ok(42), 0)).toBe(42);
  });

  it('unwrapOr returns default for err', () => {
    expect(unwrapOr(err(new Error('fail')), 0)).toBe(0);
  });
});
