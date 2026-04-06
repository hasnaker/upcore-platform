import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';

/**
 * Report Builder API
 *
 * GET  — list saved reports + available templates
 * POST — create new saved report
 * DELETE — delete report by id (?reportId=xxx)
 */

interface SavedReportRow {
  id: string;
  name: string;
  report_type: string;
  config: Record<string, unknown> | null;
  schedule: string | null;
  last_run_at: string | null;
  created_at: string;
}

const REPORT_TEMPLATES = [
  { type: 'burnout_weekly', name: 'Tukenmislik Raporu', description: 'Haftalik tukenmislik risk analizi ve departman bazli ozet.' },
  { type: 'performance_monthly', name: 'Performans Ozeti', description: 'Aylik performans degerlendirme ve OKR ilerleme raporu.' },
  { type: 'compensation_equity', name: 'Ucret Adaleti', description: 'Compa-ratio, cinsiyet ve departman bazli ucret esitligi analizi.' },
  { type: 'engagement_summary', name: 'Calisan Bagliligi', description: 'Anket sonuclari ve baglilik skorlari ozeti.' },
  { type: 'okr_progress', name: 'OKR Ilerleme', description: 'Hedef bazli ilerleme, tamamlanma ve risk durumlari.' },
  { type: 'training_roi', name: 'Egitim ROI', description: 'Egitim yatirimi, katilim ve geri donus analizi.' },
] as const;

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const result = await pool.query<SavedReportRow>(
      `SELECT id, name, report_type, config, schedule, last_run_at::text, created_at::text
       FROM app.saved_reports
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [TENANT_ID]
    );

    await pool.end();

    const savedReports = result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      reportType: r.report_type,
      config: r.config,
      schedule: r.schedule,
      lastRunAt: r.last_run_at,
      createdAt: r.created_at,
    }));

    return NextResponse.json({
      templates: REPORT_TEMPLATES,
      savedReports,
    });
  } catch (error) {
    console.error('Reports API GET error:', error);
    return NextResponse.json(
      {
        error: 'Rapor verileri alinamadi',
        templates: REPORT_TEMPLATES,
        savedReports: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, reportType, config, schedule } = body as {
      name: string;
      reportType: string;
      config?: Record<string, unknown>;
      schedule?: string;
    };

    if (!name || !reportType) {
      return NextResponse.json({ error: 'name ve reportType zorunlu' }, { status: 400 });
    }

    const validTypes: string[] = REPORT_TEMPLATES.map((t) => t.type);
    if (!validTypes.includes(reportType)) {
      return NextResponse.json(
        { error: `Gecersiz rapor tipi. Desteklenen: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const result = await pool.query(
      `INSERT INTO app.saved_reports (tenant_id, name, report_type, config, schedule)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at::text`,
      [TENANT_ID, name, reportType, config ? JSON.stringify(config) : null, schedule || null]
    );

    await pool.end();

    return NextResponse.json({
      success: true,
      id: result.rows[0]?.id,
      createdAt: result.rows[0]?.created_at,
    });
  } catch (error) {
    console.error('Reports API POST error:', error);
    return NextResponse.json({ error: 'Rapor olusturulamadi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('reportId');

    if (!reportId) {
      return NextResponse.json({ error: 'reportId parametresi zorunlu' }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const result = await pool.query(
      `DELETE FROM app.saved_reports WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [reportId, TENANT_ID]
    );

    await pool.end();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Rapor bulunamadi' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: reportId });
  } catch (error) {
    console.error('Reports API DELETE error:', error);
    return NextResponse.json({ error: 'Rapor silinemedi' }, { status: 500 });
  }
}
