import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';

// GET /api/training/certificates?employee_id=...
// Returns certificates issued to the tenant (optionally filtered by employee).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employee_id');
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: DB_URL });
  try {
    const params: string[] = [TENANT_ID];
    let where = 'tc.tenant_id = $1';
    if (employeeId) {
      params.push(employeeId);
      where += ` AND tc.employee_id = $${params.length}`;
    }
    const rows = await pool.query(
      `SELECT tc.id, tc.certificate_no, tc.issued_at, tc.valid_until, tc.score,
              tc.blob_url, tc.revoked, tc.revoked_reason,
              tp.name_tr AS program_name, tp.code AS program_code,
              e.ad AS first_name, e.soyad AS last_name
         FROM app.training_certificates tc
         JOIN app.training_programs tp ON tp.id = tc.program_id
         JOIN app.employees e ON e.id = tc.employee_id
        WHERE ${where}
        ORDER BY tc.issued_at DESC`,
      params,
    );
    return NextResponse.json({
      items: rows.rows.map((r) => ({
        id: r.id,
        certificateNo: r.certificate_no,
        issuedAt: r.issued_at,
        validUntil: r.valid_until,
        score: r.score ? Number(r.score) : null,
        blobUrl: r.blob_url,
        revoked: r.revoked,
        revokedReason: r.revoked_reason,
        programName: r.program_name,
        programCode: r.program_code,
        employeeName: `${r.first_name} ${r.last_name}`,
      })),
    });
  } catch (err) {
    console.error('Certificate list error:', err);
    return NextResponse.json({ items: [], error: 'Sertifikalar alınamadı' }, { status: 500 });
  } finally {
    await pool.end();
  }
}

// POST /api/training/certificates  body: {enrollment_id, valid_until?, blob_url?}
// Issues a certificate for a completed enrollment. Enforces:
//   - enrollment must belong to tenant
//   - status must be 'completed'
//   - score (if present on enrollment) must be >= program.passing_score
// Certificate number: UPC-CERT-YYYY-NNNNN (per tenant sequence).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { enrollment_id, valid_until, blob_url } = body as {
    enrollment_id?: string;
    valid_until?: string;
    blob_url?: string;
  };
  if (!enrollment_id) {
    return NextResponse.json({ error: 'enrollment_id zorunludur' }, { status: 400 });
  }

  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: DB_URL });
  try {
    const enr = await pool.query(
      `SELECT te.id, te.employee_id, te.program_id, te.status, te.score,
              tp.passing_score, tp.name_tr AS program_name
         FROM app.training_enrollments te
         JOIN app.training_programs tp ON tp.id = te.program_id
        WHERE te.id = $1 AND te.tenant_id = $2`,
      [enrollment_id, TENANT_ID],
    );
    if (enr.rowCount === 0) {
      return NextResponse.json({ error: 'Enrollment bulunamadı' }, { status: 404 });
    }
    const row = enr.rows[0];
    if (row.status !== 'completed') {
      return NextResponse.json(
        { error: `Sertifika yalnızca completed kayıt için verilir (şu an: ${row.status})` },
        { status: 409 },
      );
    }
    if (row.score !== null && Number(row.score) < Number(row.passing_score)) {
      return NextResponse.json(
        { error: `Geçer not altında: ${row.score} < ${row.passing_score}` },
        { status: 409 },
      );
    }

    const year = new Date().getFullYear();
    const seqRow = await pool.query(
      `SELECT COUNT(*)::int + 1 AS next_seq
         FROM app.training_certificates
        WHERE tenant_id = $1 AND issued_at >= date_trunc('year', NOW())`,
      [TENANT_ID],
    );
    const seq = String(seqRow.rows[0].next_seq).padStart(5, '0');
    const certNo = `UPC-CERT-${year}-${seq}`;

    const ins = await pool.query(
      `INSERT INTO app.training_certificates
         (tenant_id, enrollment_id, employee_id, program_id, certificate_no,
          valid_until, score, blob_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, certificate_no, issued_at`,
      [
        TENANT_ID,
        enrollment_id,
        row.employee_id,
        row.program_id,
        certNo,
        valid_until || null,
        row.score,
        blob_url || null,
      ],
    );

    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'employee';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('create', 'training_certificate', ins.rows[0].id, undefined, {
      certificateNo: certNo,
      program: row.program_name,
    });

    return NextResponse.json({
      id: ins.rows[0].id,
      certificateNo: certNo,
      issuedAt: ins.rows[0].issued_at,
    }, { status: 201 });
  } catch (err) {
    console.error('Certificate issue error:', err);
    return NextResponse.json({ error: 'Sertifika verilemedi' }, { status: 500 });
  } finally {
    await pool.end();
  }
}

// PATCH /api/training/certificates  body: {certificate_id, revoked_reason}
// Revokes a previously-issued certificate.
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { certificate_id, revoked_reason } = body as { certificate_id?: string; revoked_reason?: string };
  if (!certificate_id || !revoked_reason) {
    return NextResponse.json({ error: 'certificate_id ve revoked_reason zorunludur' }, { status: 400 });
  }
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: DB_URL });
  try {
    const r = await pool.query(
      `UPDATE app.training_certificates
          SET revoked = TRUE, revoked_at = NOW(), revoked_reason = $1
        WHERE id = $2 AND tenant_id = $3 AND revoked = FALSE
        RETURNING id`,
      [revoked_reason, certificate_id, TENANT_ID],
    );
    if (r.rowCount === 0) {
      return NextResponse.json({ error: 'Sertifika bulunamadı veya zaten iptal' }, { status: 404 });
    }
    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'employee';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('update', 'training_certificate', certificate_id, undefined, {
      action: 'revoked',
      reason: revoked_reason,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Certificate revoke error:', err);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  } finally {
    await pool.end();
  }
}
