import { describe, it, expect } from 'vitest';
import {
  removeTurkishDiacritics,
  turkishSafeLowerCase,
  turkishSafeUpperCase,
} from './diacritics';

describe('removeTurkishDiacritics', () => {
  it('removes ş → s', () => {
    expect(removeTurkishDiacritics('şeker')).toBe('seker');
  });

  it('removes ç → c', () => {
    expect(removeTurkishDiacritics('çay')).toBe('cay');
  });

  it('removes ğ → g', () => {
    expect(removeTurkishDiacritics('dağ')).toBe('dag');
  });

  it('removes ı → i', () => {
    expect(removeTurkishDiacritics('sığır')).toBe('sigir');
  });

  it('removes İ → I', () => {
    expect(removeTurkishDiacritics('İstanbul')).toBe('Istanbul');
  });

  it('removes ö → o', () => {
    expect(removeTurkishDiacritics('öğle')).toBe('ogle');
  });

  it('removes ü → u', () => {
    expect(removeTurkishDiacritics('gümüş')).toBe('gumus');
  });

  it('handles mixed text', () => {
    expect(removeTurkishDiacritics('Şişli, İstanbul')).toBe('Sisli, Istanbul');
  });

  it('leaves non-Turkish text unchanged', () => {
    expect(removeTurkishDiacritics('Hello World')).toBe('Hello World');
    expect(removeTurkishDiacritics('abc123')).toBe('abc123');
  });

  it('handles uppercase Turkish chars', () => {
    expect(removeTurkishDiacritics('ÇĞÖŞÜ')).toBe('CGOSU');
  });
});

describe('turkishSafeLowerCase', () => {
  it('converts İ to i (dotted)', () => {
    const result = turkishSafeLowerCase('İSTANBUL');
    expect(result).toBe('istanbul');
  });

  it('converts I to ı (dotless) in Turkish', () => {
    const result = turkishSafeLowerCase('I');
    expect(result).toBe('ı');
  });

  it('preserves already lowercase Turkish chars', () => {
    expect(turkishSafeLowerCase('şeker')).toBe('şeker');
  });
});

describe('turkishSafeUpperCase', () => {
  it('converts i to İ (dotted) in Turkish', () => {
    const result = turkishSafeUpperCase('istanbul');
    expect(result).toBe('İSTANBUL');
  });

  it('converts ı to I (dotless) in Turkish', () => {
    const result = turkishSafeUpperCase('ı');
    expect(result).toBe('I');
  });

  it('converts all Turkish chars correctly', () => {
    expect(turkishSafeUpperCase('çğöşü')).toBe('ÇĞÖŞÜ');
  });
});
