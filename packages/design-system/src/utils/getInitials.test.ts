import { describe, expect, it } from 'vitest';
import { getInitials } from './getInitials';

describe('getInitials', () => {
  it('returns both initials uppercased', () => {
    expect(getInitials('Ada', 'Lovelace')).toBe('AL');
  });

  it('handles Turkish characters with locale uppercase', () => {
    expect(getInitials('ilker', 'şahin')).toBe('İŞ');
    expect(getInitials('özge', 'çelik')).toBe('ÖÇ');
  });

  it('returns only the first initial when last name missing', () => {
    expect(getInitials('Ada')).toBe('A');
  });

  it('returns only the last initial when first name missing', () => {
    expect(getInitials(undefined, 'Lovelace')).toBe('L');
  });

  it('returns empty string when both missing', () => {
    expect(getInitials()).toBe('');
    expect(getInitials('', '')).toBe('');
    expect(getInitials(null, null)).toBe('');
  });

  it('trims whitespace before extracting initial', () => {
    expect(getInitials('  Ada  ', '  Lovelace  ')).toBe('AL');
  });
});
