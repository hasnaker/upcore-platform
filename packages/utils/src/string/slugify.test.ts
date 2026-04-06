import { describe, it, expect } from 'vitest';
import { slugifyTr } from './slugify';

describe('slugifyTr', () => {
  it('converts Turkish text to slug', () => {
    expect(slugifyTr('Şirketimiz İstanbul')).toBe('sirketimiz-istanbul');
  });

  it('handles ç correctly', () => {
    expect(slugifyTr('Çalışan Memnuniyeti')).toBe('calisan-memnuniyeti');
  });

  it('handles ğ correctly', () => {
    expect(slugifyTr('Dağ Yürüyüşü')).toBe('dag-yuruyusu');
  });

  it('handles ö correctly', () => {
    expect(slugifyTr('Öğle Arası')).toBe('ogle-arasi');
  });

  it('handles ü correctly', () => {
    expect(slugifyTr('Gümüş Anahtar')).toBe('gumus-anahtar');
  });

  it('removes special characters', () => {
    expect(slugifyTr('İK & Yönetim')).toBe('ik-yonetim');
  });

  it('collapses multiple spaces/hyphens', () => {
    expect(slugifyTr('Bir   İki   Üç')).toBe('bir-iki-uc');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugifyTr(' - Test - ')).toBe('test');
  });

  it('handles all-uppercase Turkish', () => {
    expect(slugifyTr('TÜRKÇE METİN')).toBe('turkce-metin');
  });

  it('handles empty string', () => {
    expect(slugifyTr('')).toBe('');
  });
});
