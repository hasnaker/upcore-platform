import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { parseAccessContext, canExportData } from '@/lib/rbac';

/**
 * Export API — generates CSV (Excel-compatible) data exports.
 * Supports: employees, performance, okr, strengths, 9box, audit_log
 *
 * Usage: GET /api/export?type=performance&format=csv
 */

const EXPORT_TYPES = ['employees', 'performance', 'okr', 'strengths', '9box', 'audit'] as const;
type ExportType = (typeof EXPORT_TYPES)[number];

export async function GET(req: NextRequest) {
  try {
    // RBAC: only managers and hr_directors can export data
    const ctx = parseAccessContext(req.headers);
    if (!canExportData(ctx)) {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz bulunmamaktadır' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as ExportType | null;
    const format = searchParams.get('format') || 'csv';

    if (!type || !EXPORT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Geçersiz export tipi. Desteklenen: ${EXPORT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    let csv = '';
    let filename = '';

    switch (type) {
      case 'employees': {
        const result = await pool.query(
          `SELECT e.employee_no, e.ad, e.soyad, e.email, e.title, e.employment_status,
                  d.name_tr as department, e.hire_date, e.created_at
           FROM app.employees e
           LEFT JOIN app.departments d ON d.id = e.department_id
           WHERE e.tenant_id = $1 ORDER BY e.ad`,
          [TENANT_ID]
        );
        csv = 'Sicil No,Ad,Soyad,E-posta,Unvan,Durum,Departman,İşe Başlama\n';
        for (const r of result.rows) {
          csv += `${r.employee_no || ''},${r.ad},${r.soyad},${r.email || ''},${r.title || ''},${r.employment_status || ''},${r.department || ''},${r.hire_date || ''}\n`;
        }
        filename = 'calisanlar';
        break;
      }

      case 'performance': {
        const result = await pool.query(
          `SELECT e.ad, e.soyad, d.name_tr as department,
                  pr.period, pr.okr_score, pr.competency_score, pr.overall_score,
                  pr.potential_rating, pr.status
           FROM app.performance_reviews pr
           JOIN app.employees e ON e.id = pr.employee_id
           LEFT JOIN app.departments d ON d.id = e.department_id
           WHERE pr.tenant_id = $1 ORDER BY pr.overall_score DESC`,
          [TENANT_ID]
        );
        csv = 'Ad,Soyad,Departman,Dönem,OKR Puanı,Yetkinlik Puanı,Genel Puan,Potansiyel,Durum\n';
        for (const r of result.rows) {
          csv += `${r.ad},${r.soyad},${r.department || ''},${r.period},${r.okr_score || ''},${r.competency_score || ''},${r.overall_score || ''},${r.potential_rating || ''},${r.status}\n`;
        }
        filename = 'performans';
        break;
      }

      case 'okr': {
        const result = await pool.query(
          `SELECT o.level, o.title, o.progress, o.status, o.deadline,
                  e.ad || ' ' || e.soyad as owner,
                  d.name_tr as department
           FROM app.okr_objectives o
           LEFT JOIN app.employees e ON e.id = o.owner_id
           LEFT JOIN app.departments d ON d.id = o.department_id
           WHERE o.tenant_id = $1 ORDER BY o.level, o.progress DESC`,
          [TENANT_ID]
        );
        csv = 'Seviye,Hedef,İlerleme %,Durum,Son Tarih,Sorumlu,Departman\n';
        for (const r of result.rows) {
          csv += `${r.level},${escapeCsv(r.title)},${r.progress},${r.status},${r.deadline || ''},${r.owner || ''},${r.department || ''}\n`;
        }
        filename = 'okr';
        break;
      }

      case 'strengths': {
        const result = await pool.query(
          `SELECT e.ad, e.soyad, d.name_tr as department,
                  sp.domain_scores, sp.role_fit_score, sp.top5, sp.updated_at
           FROM app.strength_profiles sp
           JOIN app.employees e ON e.id = sp.employee_id
           LEFT JOIN app.departments d ON d.id = e.department_id
           WHERE sp.tenant_id = $1 ORDER BY sp.role_fit_score DESC`,
          [TENANT_ID]
        );
        csv = 'Ad,Soyad,Departman,Rol Uyum Skoru,Top 5 Güçlü Yön,Değerlendirme Tarihi\n';
        for (const r of result.rows) {
          const top5 = Array.isArray(r.top5) ? r.top5.join('; ') : '';
          csv += `${r.ad},${r.soyad},${r.department || ''},${r.role_fit_score || ''},${escapeCsv(top5)},${r.updated_at || ''}\n`;
        }
        filename = 'guclu-yonler';
        break;
      }

      case '9box': {
        const result = await pool.query(
          `SELECT e.ad, e.soyad, d.name_tr as department,
                  nb.performance_score, nb.potential_score, nb.category, nb.period
           FROM app.nine_box nb
           JOIN app.employees e ON e.id = nb.employee_id
           LEFT JOIN app.departments d ON d.id = e.department_id
           WHERE nb.tenant_id = $1 ORDER BY nb.performance_score DESC`,
          [TENANT_ID]
        );
        csv = 'Ad,Soyad,Departman,Performans Puanı,Potansiyel Puanı,Kategori,Dönem\n';
        for (const r of result.rows) {
          csv += `${r.ad},${r.soyad},${r.department || ''},${r.performance_score},${r.potential_score},${r.category},${r.period}\n`;
        }
        filename = '9box';
        break;
      }

      case 'audit': {
        const result = await pool.query(
          `SELECT actor_id, actor_role, action, resource_type, resource_id,
                  changes, created_at
           FROM app.audit_log
           WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1000`,
          [TENANT_ID]
        );
        csv = 'Tarih,Aktör,Rol,Aksiyon,Kaynak Tipi,Kaynak ID,Değişiklikler\n';
        for (const r of result.rows) {
          csv += `${r.created_at},${r.actor_id},${r.actor_role},${r.action},${r.resource_type},${r.resource_id || ''},${escapeCsv(JSON.stringify(r.changes || {}))}\n`;
        }
        filename = 'audit-log';
        break;
      }
    }

    await pool.end();

    // Add BOM for Excel UTF-8 compatibility
    const bom = '\uFEFF';
    const csvContent = bom + csv;

    if (format === 'json') {
      return NextResponse.json({ csv, filename: `${filename}_${new Date().toISOString().slice(0, 10)}.csv` });
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Dışa aktarma başarısız' }, { status: 500 });
  }
}

function escapeCsv(str: string): string {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
