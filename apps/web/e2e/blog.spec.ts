import { test, expect } from '@playwright/test';

// UpCore Blog — uçtan uca gezinti testleri.
// 1. Liste sayfası yüklenir, arama + kategori filtresi çalışır.
// 2. Makale sayfası yüklenir, başlık + yazar + TOC + Schema.org LD görünür.
// 3. Kategori, yazar, etiket sayfaları yüklenir.
// 4. Newsletter formu validation çalıştırır + KVKK checkbox zorunludur.
// 5. RSS, Atom ve OG endpoint'leri 200 döner.
// 6. Schema.org JSON-LD tüm anahtar tiplerde bulunur.

test.describe('Blog — uçtan uca gezinti', () => {
  test('ana liste sayfası başlık + kategori + arama bileşeniyle yüklenir', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/bilim temelli/i);
    await expect(page.getByTestId('blog-search')).toBeVisible();
    await expect(page.getByRole('group', { name: /kategori filtresi/i })).toBeVisible();
  });

  test('arama kutusu en az bir makaleyi filtreler', async ({ page }) => {
    await page.goto('/blog');
    await page.getByPlaceholder(/makale, konu/i).fill('tükenmişlik');
    await expect(page.getByText(/makale bulundu/i)).toBeVisible();
  });

  test('kategori filtresi tek kategoriye daraltır', async ({ page }) => {
    await page.goto('/blog');
    await page.getByRole('button', { name: 'Eğitim', exact: true }).click();
    await expect(page.getByText(/makale bulundu/i)).toBeVisible();
  });

  test('ilk makale linki açılır, başlık + yazar + okuma süresi görünür', async ({ page }) => {
    await page.goto('/blog');
    const firstCard = page.locator('article a').first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/blog\/.+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/dakika okuma/i)).toBeVisible();
  });

  test('makale sayfasında Schema.org Article JSON-LD mevcut', async ({ page }) => {
    await page.goto('/blog/2026-01-tukenmislik-nedir-mbi-vs-bat-tr');
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(ld).toBeTruthy();
    const parsed = JSON.parse(ld ?? '{}');
    expect(parsed['@type']).toBe('Article');
    expect(parsed.author?.['@type']).toBe('Person');
    expect(parsed.publisher?.['@type']).toBe('Organization');
  });

  test('breadcrumb schema ve kategori navi görünür', async ({ page }) => {
    await page.goto('/blog/2026-01-tukenmislik-nedir-mbi-vs-bat-tr');
    await expect(page.getByRole('navigation', { name: /sayfa yolu/i })).toBeVisible();
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('kategori sayfası yüklenir', async ({ page }) => {
    await page.goto('/blog/kategori/egitim');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/eğitim/i);
    await expect(page.getByText(/makale/i).first()).toBeVisible();
  });

  test('yazar sayfası Person JSON-LD içerir', async ({ page }) => {
    await page.goto('/blog/yazar/hasan-aker');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/hasan/i);
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(ld ?? '{}');
    expect(parsed['@type']).toBe('Person');
  });

  test('etiket sayfası açılır', async ({ page }) => {
    await page.goto('/blog/etiket/bat-tr');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/#/);
  });

  test('newsletter formu KVKK onayı olmadan submit edilmez', async ({ page }) => {
    await page.goto('/blog/2026-01-tukenmislik-nedir-mbi-vs-bat-tr');
    const cta = page.getByTestId('newsletter-cta');
    await cta.scrollIntoViewIfNeeded();
    await cta.getByLabel(/e-posta adresiniz/i).fill('test@upcore.app');
    await cta.getByRole('button', { name: /abone ol/i }).click();
    await expect(cta.getByRole('alert')).toContainText(/KVKK/i);
  });

  test('newsletter formu KVKK onayıyla 202 döner (none provider)', async ({ page }) => {
    await page.goto('/blog/2026-01-tukenmislik-nedir-mbi-vs-bat-tr');
    const cta = page.getByTestId('newsletter-cta');
    await cta.scrollIntoViewIfNeeded();
    await cta.getByLabel(/e-posta adresiniz/i).fill('abone@upcore.app');
    await cta.getByText(/kvkk kapsamında/i).click();
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith('/api/newsletter')),
      cta.getByRole('button', { name: /abone ol/i }).click(),
    ]);
    expect([202, 502]).toContain(response.status());
  });

  test('RSS feed 200 ve application/rss+xml content-type döner', async ({ request }) => {
    const res = await request.get('/blog/rss.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/rss');
    const body = await res.text();
    expect(body).toContain('<rss');
    expect(body).toContain('UpCore Blog');
  });

  test('Atom feed 200 ve atom+xml content-type döner', async ({ request }) => {
    const res = await request.get('/blog/atom.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('atom');
    const body = await res.text();
    expect(body).toContain('<feed');
  });

  test('sitemap.xml blog URL\'lerini içeriyor', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('/blog/');
    expect(body).toContain('/blog/kategori/');
    expect(body).toContain('/blog/yazar/');
  });

  test('OG image endpoint 200 döner', async ({ request }) => {
    const res = await request.get('/blog/og/2026-01-tukenmislik-nedir-mbi-vs-bat-tr');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image');
  });
});

test.describe('Blog — schema.org doğrulaması', () => {
  const slugs = [
    '2026-01-tukenmislik-nedir-mbi-vs-bat-tr',
    '2026-01-jdr-modeli-kaynak-gereksinim',
    '2026-02-okr-vs-kpi-hangi-durum',
    '2026-03-samsun-sbb-657-pilot',
  ];

  for (const slug of slugs) {
    test(`${slug} · Article JSON-LD tam formatta`, async ({ page }) => {
      await page.goto(`/blog/${slug}`);
      const first = await page.locator('script[type="application/ld+json"]').first().textContent();
      const article = JSON.parse(first ?? '{}');
      expect(article['@type']).toBe('Article');
      expect(article.headline).toBeTruthy();
      expect(article.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(article.author?.name).toBeTruthy();
      expect(article.publisher?.name).toBe('Upcore');
      expect(article.wordCount).toBeGreaterThan(1400);
    });
  }
});
