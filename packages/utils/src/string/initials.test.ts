import { describe, it, expect } from 'vitest';
import { getInitials } from './initials';

describe('getInitials', () => {
  it('extracts initials from standard name', () => {
    expect(getInitials('Mehmet', 'Yılmaz')).toBe('MY');
  });

  it('extracts first-name-only initial', () => {
    expect(getInitials('Fatma', '')).toBe('F');
  });

  it('handles Turkish İ', () => {
    expect(getInitials('İrem', 'Öztürk')).toBe('İÖ');
  });

  it('handles compound first name (takes first letter only)', () => {
    expect(getInitials('Mehmet Ali', 'Yılmaz')).toBe('MY');
  });

  it('handles hyphenated last name', () => {
    expect(getInitials('Ayşe', 'Öztürk-Demir')).toBe('AÖ');
  });

  it('handles empty both names', () => {
    expect(getInitials('', '')).toBe('');
  });

  it('handles names with leading spaces', () => {
    expect(getInitials('  Ali', '  Veli')).toBe('AV');
  });
});
