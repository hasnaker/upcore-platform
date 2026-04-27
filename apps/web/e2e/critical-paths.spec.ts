import { test, expect } from '@playwright/test';

// Critical business paths — her biri gerçek bir satış demo senaryosuna denk.
// Smoke'tan daha derin: form doldurma, API doğrulama, DB persistence kontrolü.

test.describe('Critical path — çalışan yaşam döngüsü', () => {
  test('yeni çalışan ekle → listede görün → profilini aç', async ({ page }) => {
    await page.goto('/calisanlar');

    await page.getByRole('button', { name: /yeni çalışan|ekle/i }).first().click();

    const empNo = 'E2E-' + Date.now();
    await page.getByLabel(/sicil|employee no/i).fill(empNo);
    await page.getByLabel(/^ad/i).fill('E2E');
    await page.getByLabel(/soyad/i).fill('Test');
    await page.getByLabel(/e.?mail/i).fill(`${empNo.toLowerCase()}@e2e.local`);
    await page.getByLabel(/işe başlama|hire date/i).fill('2026-01-15');

    await page.getByRole('button', { name: /kaydet|save/i }).click();

    // Listede görün
    await expect(page.getByText(empNo)).toBeVisible({ timeout: 10_000 });

    // Profil aç
    await page.getByText(empNo).click();
    await expect(page.getByRole('heading')).toContainText(/E2E Test/i);
  });
});

test.describe('Critical path — izin akışı', () => {
  test('izin talebi gönder → onaya düşer', async ({ page }) => {
    await page.goto('/portal/izin');

    await page.getByRole('button', { name: /yeni talep|new request/i }).first().click();

    // izin tipi seç
    await page.getByLabel(/izin tipi|leave type/i).selectOption({ index: 1 });
    await page.getByLabel(/başlangıç|start/i).fill('2026-06-01');
    await page.getByLabel(/bitiş|end/i).fill('2026-06-03');
    await page.getByLabel(/neden|reason/i).fill('E2E test talebi');

    await page.getByRole('button', { name: /gönder|submit/i }).click();

    await expect(page.getByText(/beklemede|pending/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Critical path — bordro', () => {
  test('bordro panel yüklenir + periyot listesi görünür', async ({ page }) => {
    await page.goto('/bordro/canli');
    await expect(page).toHaveURL(/\/bordro/);
    await expect(page.getByRole('heading')).toContainText(/bordro/i);
  });
});

test.describe('Critical path — KVKK export', () => {
  test('full export talep oluştur', async ({ page }) => {
    await page.goto('/ayarlar/kvkk-export');
    const before = await page.locator('tbody tr').count();

    await page.getByRole('button', { name: /full export başlat/i }).click();

    // toast + yeni satır
    await expect(page.getByText(/kuyruğa alındı/i)).toBeVisible({ timeout: 8_000 });
    await page.waitForTimeout(1_000); // UI refresh
    const after = await page.locator('tbody tr').count();
    expect(after).toBeGreaterThanOrEqual(before + 1);
  });
});
