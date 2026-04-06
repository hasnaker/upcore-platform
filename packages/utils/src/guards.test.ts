import { describe, it, expect } from 'vitest';
import { isDefined, isString, isNumber, isRecord, assertNever } from './guards';

describe('isDefined', () => {
  it('returns true for defined values', () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined('')).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined({})).toBe(true);
  });

  it('returns false for null', () => {
    expect(isDefined(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isDefined(undefined)).toBe(false);
  });
});

describe('isString', () => {
  it('returns true for strings', () => {
    expect(isString('')).toBe(true);
    expect(isString('hello')).toBe(true);
  });

  it('returns false for non-strings', () => {
    expect(isString(42)).toBe(false);
    expect(isString(null)).toBe(false);
  });
});

describe('isNumber', () => {
  it('returns true for numbers', () => {
    expect(isNumber(42)).toBe(true);
    expect(isNumber(0)).toBe(true);
    expect(isNumber(-1.5)).toBe(true);
  });

  it('returns false for NaN', () => {
    expect(isNumber(NaN)).toBe(false);
  });

  it('returns false for non-numbers', () => {
    expect(isNumber('42')).toBe(false);
  });
});

describe('isRecord', () => {
  it('returns true for plain objects', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('returns false for arrays', () => {
    expect(isRecord([])).toBe(false);
  });

  it('returns false for null', () => {
    expect(isRecord(null)).toBe(false);
  });
});

describe('assertNever', () => {
  it('throws for any value', () => {
    expect(() => assertNever('x' as never)).toThrow('Unexpected value');
  });
});
