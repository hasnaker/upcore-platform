import { describe, it, expect } from 'vitest';
import { UpcoreApiError, isUpcoreApiError, toApiErrorSync } from './error';

describe('UpcoreApiError', () => {
  it('creates an error with all fields', () => {
    const error = new UpcoreApiError({
      code: 'EMPLOYEE_NOT_FOUND',
      message: 'Employee not found',
      status: 404,
      traceId: 'trace-123',
      messageTr: 'Çalışan bulunamadı',
      details: { id: '123' },
    });

    expect(error.code).toBe('EMPLOYEE_NOT_FOUND');
    expect(error.message).toBe('Employee not found');
    expect(error.status).toBe(404);
    expect(error.traceId).toBe('trace-123');
    expect(error.messageTr).toBe('Çalışan bulunamadı');
    expect(error.details).toEqual({ id: '123' });
    expect(error.name).toBe('UpcoreApiError');
    expect(error instanceof Error).toBe(true);
  });
});

describe('isUpcoreApiError', () => {
  it('returns true for UpcoreApiError', () => {
    const error = new UpcoreApiError({
      code: 'TEST',
      message: 'test',
      status: 400,
      traceId: 'trace',
      messageTr: 'test',
    });
    expect(isUpcoreApiError(error)).toBe(true);
  });

  it('returns false for standard Error', () => {
    expect(isUpcoreApiError(new Error('test'))).toBe(false);
  });

  it('returns false for non-errors', () => {
    expect(isUpcoreApiError(null)).toBe(false);
    expect(isUpcoreApiError('error')).toBe(false);
    expect(isUpcoreApiError(42)).toBe(false);
  });
});

describe('toApiErrorSync', () => {
  it('wraps standard Error', () => {
    const result = toApiErrorSync(new Error('something broke'));
    expect(result).toBeInstanceOf(UpcoreApiError);
    expect(result.code).toBe('CLIENT_ERROR');
    expect(result.message).toBe('something broke');
  });

  it('wraps unknown value', () => {
    const result = toApiErrorSync('string error');
    expect(result).toBeInstanceOf(UpcoreApiError);
    expect(result.code).toBe('UNKNOWN_ERROR');
  });

  it('passes through existing UpcoreApiError', () => {
    const original = new UpcoreApiError({
      code: 'EXISTING',
      message: 'existing',
      status: 400,
      traceId: 'trace',
      messageTr: 'mevcut',
    });
    const result = toApiErrorSync(original);
    expect(result).toBe(original);
  });
});
