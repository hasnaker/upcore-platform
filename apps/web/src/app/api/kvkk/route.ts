import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';

/**
 * KVKK (Kişisel Verilerin Korunması Kanunu) Compliance API
 *
 * Implements:
 * - GET: Consent status for an employee
 * - POST: Grant/revoke consent
 * - DELETE: Right-to-be-forgotten (data anonymization)
 */

const CONSENT_TYPES = [
  { type: 'data_processing', label: 'Kişisel Veri İşleme', required: true, description: 'Temel İK süreçleri için kişisel verilerin işlenmesi (6698 sayılı KVKK md.5)' },
  { type: 'assessment', label: 'Değerlendirme Verileri', required: false, description: 'Güçlü yön değerlendirmesi, performans puanları ve yetkinlik analizleri' },
  { type: 'burnout_monitoring', label: 'Tükenmişlik İzleme', required: false, description: 'BAT-12-TR tükenmişlik skoru takibi ve JD-R analizi' },
  { type: 'analytics', label: 'Analitik & Raporlama', required: false, description: 'Anonim istatistikler ve departman karşılaştırmaları' },
  { type: 'ai_recommendations', label: 'AI Önerileri', required: false, description: 'Job crafting, kariyer yolu ve müdahale önerileri için yapay zeka analizi' },
] as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    if (employeeId) {
      // Get consent status for specific employee
      const consents = await pool.query(
        `SELECT consent_type, granted, granted_at, revoked_at, version
         FROM app.data_consents
         WHERE tenant_id = $1 AND employee_id = $2
         ORDER BY consent_type`,
        [TENANT_ID, employeeId]
      );

      const consentMap = new Map<string, { granted: boolean; grantedAt: string | null; revokedAt: string | null }>();
      for (const row of consents.rows) {
        consentMap.set(row.consent_type, {
          granted: row.granted,
          grantedAt: row.granted_at,
          revokedAt: row.revoked_at,
        });
      }

      await pool.end();

      return NextResponse.json({
        employeeId,
        consents: CONSENT_TYPES.map((ct) => ({
          ...ct,
          status: consentMap.get(ct.type) || { granted: false, grantedAt: null, revokedAt: null },
        })),
        dataRetentionPolicy: {
          performanceReviews: '5 yıl (İş Kanunu md.75)',
          burnoutData: '2 yıl (anonimleştirilmiş)',
          assessmentData: '3 yıl',
          auditLogs: '10 yıl',
        },
      });
    }

    // Summary: compliance overview for HR
    const overview = await pool.query(
      `SELECT
         (SELECT count(DISTINCT employee_id) FROM app.data_consents WHERE tenant_id = $1 AND granted = true) as consented,
         (SELECT count(*) FROM app.employees WHERE tenant_id = $1) as total,
         (SELECT count(DISTINCT employee_id) FROM app.data_consents WHERE tenant_id = $1 AND consent_type = 'data_processing' AND granted = true) as data_processing_granted`,
      [TENANT_ID]
    );

    await pool.end();

    const row = overview.rows[0] || {};

    return NextResponse.json({
      overview: {
        totalEmployees: Number(row.total) || 0,
        consentedEmployees: Number(row.consented) || 0,
        dataProcessingConsent: Number(row.data_processing_granted) || 0,
        complianceRate: row.total > 0 ? Math.round((Number(row.consented) / Number(row.total)) * 100) : 0,
      },
      consentTypes: CONSENT_TYPES,
      retentionPolicy: {
        performanceReviews: { duration: '5 yıl', basis: 'İş Kanunu md.75' },
        burnoutData: { duration: '2 yıl', basis: 'Anonimleştirilmiş sağlık verisi (KVKK md.6)' },
        assessmentData: { duration: '3 yıl', basis: 'Meşru menfaat' },
        auditLogs: { duration: '10 yıl', basis: 'Yasal yükümlülük' },
      },
    });
  } catch (error) {
    console.error('KVKK API error:', error);
    return NextResponse.json({ error: 'KVKK verileri alınamadı' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, consentType, granted } = body;

    if (!employeeId || !consentType) {
      return NextResponse.json({ error: 'employeeId ve consentType zorunlu' }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Upsert consent
    await pool.query(
      `INSERT INTO app.data_consents (tenant_id, employee_id, consent_type, granted, granted_at, revoked_at)
       VALUES ($1, $2, $3, $4, ${granted ? 'now()' : 'NULL'}, ${granted ? 'NULL' : 'now()'})
       ON CONFLICT (tenant_id, employee_id, consent_type)
       DO UPDATE SET granted = EXCLUDED.granted,
         granted_at = CASE WHEN EXCLUDED.granted THEN now() ELSE app.data_consents.granted_at END,
         revoked_at = CASE WHEN NOT EXCLUDED.granted THEN now() ELSE NULL END`,
      [TENANT_ID, employeeId, consentType, granted]
    ).catch(async () => {
      // If unique constraint doesn't exist, add it and retry
      await pool.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_data_consents_unique
         ON app.data_consents(tenant_id, employee_id, consent_type)`
      ).catch(() => {});
      await pool.query(
        `INSERT INTO app.data_consents (tenant_id, employee_id, consent_type, granted, granted_at)
         VALUES ($1, $2, $3, $4, now())`,
        [TENANT_ID, employeeId, consentType, granted]
      );
    });

    await pool.end();

    // Fire-and-forget audit log for consent change
    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'employee';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('update', 'data_consent', employeeId, { consent: { old: !granted, new: granted } }, { consentType });

    return NextResponse.json({ success: true, consentType, granted });
  } catch (error) {
    console.error('KVKK consent error:', error);
    return NextResponse.json({ error: 'Onay kaydedilemedi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId zorunlu' }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Right-to-be-forgotten: anonymize employee data
    // We don't delete records (audit trail requirement) but anonymize PII
    const anonymized = `ANON_${employeeId.slice(0, 8)}`;

    await pool.query(`UPDATE app.employees SET ad = $2, soyad = $2, email = NULL, phone = NULL WHERE id = $1 AND tenant_id = $3`, [employeeId, anonymized, TENANT_ID]).catch(() => {});
    await pool.query(`DELETE FROM app.strength_profiles WHERE employee_id = $1 AND tenant_id = $2`, [employeeId, TENANT_ID]).catch(() => {});
    await pool.query(`DELETE FROM app.strengths_assessments WHERE employee_id = $1 AND tenant_id = $2`, [employeeId, TENANT_ID]).catch(() => {});
    await pool.query(`DELETE FROM app.burnout_signals WHERE employee_id = $1 AND tenant_id = $2`, [employeeId, TENANT_ID]).catch(() => {});
    await pool.query(`DELETE FROM app.score_snapshots WHERE employee_id = $1 AND tenant_id = $2`, [employeeId, TENANT_ID]).catch(() => {});

    // Log the anonymization in audit (raw SQL as backup)
    await pool.query(
      `INSERT INTO app.audit_log (tenant_id, actor_id, actor_role, action, resource_type, resource_id, changes)
       VALUES ($1, 'system', 'system', 'delete', 'employee_data', $2, '{"action": "right_to_be_forgotten", "anonymized": true}')`,
      [TENANT_ID, employeeId]
    ).catch(() => {});

    await pool.end();

    // Fire-and-forget audit log for right-to-be-forgotten
    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'employee';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('delete', 'employee_data', employeeId, undefined, { action: 'right_to_be_forgotten', anonymized: true });

    return NextResponse.json({
      success: true,
      message: 'Çalışan verileri KVKK md.7 kapsamında anonimleştirildi',
      employeeId,
    });
  } catch (error) {
    console.error('KVKK delete error:', error);
    return NextResponse.json({ error: 'Veri silme başarısız' }, { status: 500 });
  }
}
