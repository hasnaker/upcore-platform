import { describe, it, expect } from 'vitest';
import { turkishCompare, sortTurkish } from './sort';

describe('turkishCompare', () => {
  it('sorts ç before d', () => {
    expect(turkishCompare('ç', 'd')).toBeLessThan(0);
  });

  it('sorts ğ after g', () => {
    expect(turkishCompare('ğ', 'g')).toBeGreaterThan(0);
  });

  it('sorts ö after o', () => {
    expect(turkishCompare('ö', 'o')).toBeGreaterThan(0);
  });

  it('sorts ş after s', () => {
    expect(turkishCompare('ş', 's')).toBeGreaterThan(0);
  });

  it('sorts ü after u', () => {
    expect(turkishCompare('ü', 'u')).toBeGreaterThan(0);
  });

  it('returns 0 for equal strings', () => {
    expect(turkishCompare('a', 'a')).toBe(0);
  });
});

describe('sortTurkish', () => {
  it('sorts Turkish words in TDK alphabet order', () => {
    const words = ['şeker', 'dağ', 'İstanbul', 'çay', 'öğle', 'araba', 'gül', 'buz', 'üzüm', 'hayat', 'kuş', 'pencere'];
    const sorted = sortTurkish(words, (w) => w);

    // Turkish alphabet: A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z
    expect(sorted).toEqual([
      'araba',    // A
      'buz',      // B
      'çay',      // Ç
      'dağ',      // D
      'gül',      // G
      'hayat',    // H
      'İstanbul', // İ
      'kuş',      // K
      'öğle',     // Ö
      'pencere',  // P
      'şeker',    // Ş
      'üzüm',    // Ü
    ]);
  });

  it('sorts objects by accessor', () => {
    const people = [
      { name: 'Ömer' },
      { name: 'Ali' },
      { name: 'Çetin' },
    ];
    const sorted = sortTurkish(people, (p) => p.name);
    expect(sorted.map((p) => p.name)).toEqual(['Ali', 'Çetin', 'Ömer']);
  });

  it('does not mutate the original array', () => {
    const original = ['ç', 'a', 'b'];
    const sorted = sortTurkish(original, (w) => w);
    expect(original).toEqual(['ç', 'a', 'b']);
    expect(sorted).toEqual(['a', 'b', 'ç']);
  });
});
