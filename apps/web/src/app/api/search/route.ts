import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';

/**
 * Global Search API — searches across employees, OKRs, departments, positions.
 * Used by Cmd+K command palette.
 *
 * GET /api/search?q=zeynep
 */

interface SearchResult {
  id: string;
  type: 'employee' | 'okr' | 'department' | 'position' | 'document';
  title: string;
  subtitle: string;
  href: string;
}

export async function GET(req: NextRequest) {
  try {
    // In Next.js API routes, use req.nextUrl for reliable query param access
    const q = (req.nextUrl.searchParams.get('q') ?? '').trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [], query: q });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });
    const results: SearchResult[] = [];
    const searchPattern = `%${q}%`;

    // Turkish character normalization for search
    const turkishNormalize = (s: string) =>
      s.replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ş/g, 's').replace(/Ş/g, 'S')
       .replace(/ç/g, 'c').replace(/Ç/g, 'C').replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
       .replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ü/g, 'u').replace(/Ü/g, 'U');
    const normalizedPattern = `%${turkishNormalize(q)}%`;

    // Search employees
    const employees = await pool.query(
      `SELECT e.id, e.ad, e.soyad, d.name_tr as department
       FROM app.employees e
       LEFT JOIN app.departments d ON d.id = e.department_id
       WHERE e.tenant_id = $1
         AND (
           LOWER(e.ad) LIKE LOWER($2)
           OR LOWER(e.soyad) LIKE LOWER($2)
           OR LOWER(CONCAT(e.ad, ' ', e.soyad)) LIKE LOWER($2)
           OR LOWER(translate(e.ad, 'ışçğöüİŞÇĞÖÜ', 'iscgouISCGOU')) LIKE LOWER($3)
           OR LOWER(translate(e.soyad, 'ışçğöüİŞÇĞÖÜ', 'iscgouISCGOU')) LIKE LOWER($3)
         )
       ORDER BY e.ad LIMIT 5`,
      [TENANT_ID, searchPattern, normalizedPattern]
    );

    for (const r of employees.rows) {
      results.push({
        id: r.id,
        type: 'employee',
        title: `${r.ad} ${r.soyad}`,
        subtitle: r.department || 'Calisan',
        href: `/calisanlar/${r.id}`,
      });
    }

    // Search OKRs
    const okrs = await pool.query(
      `SELECT o.id, o.title, o.level, o.progress, e.ad, e.soyad
       FROM app.okr_objectives o
       LEFT JOIN app.employees e ON e.id = o.owner_id
       WHERE o.tenant_id = $1 AND (o.title ILIKE $2 OR translate(lower(o.title), 'ışçğöü', 'iscgou') ILIKE lower($3))
       LIMIT 5`,
      [TENANT_ID, searchPattern, normalizedPattern]
    ).catch(() => ({ rows: [] }));

    for (const r of okrs.rows) {
      results.push({
        id: r.id,
        type: 'okr',
        title: r.title,
        subtitle: `${r.level} · %${Number(r.progress).toFixed(0)} · ${r.ad || ''} ${r.soyad || ''}`.trim(),
        href: '/performans',
      });
    }

    // Search departments
    const departments = await pool.query(
      `SELECT id, name_tr FROM app.departments
       WHERE tenant_id = $1 AND (name_tr ILIKE $2 OR translate(lower(name_tr), 'ışçğöü', 'iscgou') ILIKE lower($3))
       LIMIT 5`,
      [TENANT_ID, searchPattern, normalizedPattern]
    ).catch(() => ({ rows: [] }));

    for (const r of departments.rows) {
      results.push({
        id: r.id,
        type: 'department',
        title: r.name_tr,
        subtitle: 'Departman',
        href: '/departmanlar',
      });
    }

    // Search internal positions
    const positions = await pool.query(
      `SELECT id, title_tr, d.name_tr as department
       FROM app.internal_positions ip
       LEFT JOIN app.departments d ON d.id = ip.department_id
       WHERE ip.tenant_id = $1 AND ip.title_tr ILIKE $2 AND ip.deleted_at IS NULL
       LIMIT 5`,
      [TENANT_ID, searchPattern]
    ).catch(() => ({ rows: [] }));

    for (const r of positions.rows) {
      results.push({
        id: r.id,
        type: 'position',
        title: r.title_tr,
        subtitle: `İç Pozisyon · ${r.department || ''}`,
        href: '/kariyer',
      });
    }

    await pool.end();

    return NextResponse.json({ results, query: q });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ results: [], query: '' }, { status: 500 });
  }
}
