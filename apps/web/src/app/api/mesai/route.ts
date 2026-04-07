import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';

/* ─── GET: Daily attendance summaries + shift definitions ─── */

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Today's attendance entries joined with employees
    const todayEntries = await pool.query(
      `SELECT te.id, te.employee_id, te.clock_in, te.clock_out,
              te.work_hours, te.overtime_hours, te.status, te.approved,
              te.entry_date,
              e.ad AS first_name, e.soyad AS last_name,
              d.name_tr AS department
       FROM app.time_entries te
       JOIN app.employees e ON e.id = te.employee_id AND e.tenant_id = te.tenant_id
       LEFT JOIN app.departments d ON d.id = e.department_id
       WHERE te.tenant_id = $1
         AND te.entry_date = CURRENT_DATE
       ORDER BY te.clock_in ASC NULLS LAST`,
      [TENANT_ID],
    );

    // Weekly entries for summary (current week, Mon-Sun)
    const weeklyEntries = await pool.query(
      `SELECT te.employee_id,
              e.ad AS first_name, e.soyad AS last_name,
              te.entry_date,
              COALESCE(te.work_hours, 0) AS work_hours,
              COALESCE(te.overtime_hours, 0) AS overtime_hours,
              te.status
       FROM app.time_entries te
       JOIN app.employees e ON e.id = te.employee_id AND e.tenant_id = te.tenant_id
       WHERE te.tenant_id = $1
         AND te.entry_date >= date_trunc('week', CURRENT_DATE)
         AND te.entry_date <= CURRENT_DATE
       ORDER BY te.employee_id, te.entry_date`,
      [TENANT_ID],
    );

    // Shift definitions
    const shifts = await pool.query(
      `SELECT id, name, start_time, end_time, break_minutes, is_default
       FROM app.shift_definitions
       WHERE tenant_id = $1
       ORDER BY start_time`,
      [TENANT_ID],
    );

    // Total active employee count for absent calculation
    const totalEmployees = await pool.query(
      `SELECT COUNT(*) AS count FROM app.employees
       WHERE tenant_id = $1 AND status = 'active'`,
      [TENANT_ID],
    );

    const totalCount = Number(totalEmployees.rows[0]?.count ?? 0);
    const presentToday = todayEntries.rows.length;
    const absentToday = Math.max(0, totalCount - presentToday);

    // Average work hours today
    const todayHours = todayEntries.rows
      .map((r) => Number(r.work_hours ?? 0))
      .filter((h) => h > 0);
    const avgHoursToday =
      todayHours.length > 0
        ? Math.round((todayHours.reduce((a, b) => a + b, 0) / todayHours.length) * 10) / 10
        : 0;

    // Weekly overtime total
    const weeklyOvertimeTotal = weeklyEntries.rows.reduce(
      (sum, r) => sum + Number(r.overtime_hours ?? 0),
      0,
    );

    // Build weekly summary per employee
    const weeklyMap = new Map<
      string,
      { employeeId: string; name: string; days: Record<string, number>; totalHours: number; overtimeHours: number }
    >();
    for (const row of weeklyEntries.rows) {
      const key = row.employee_id as string;
      if (!weeklyMap.has(key)) {
        weeklyMap.set(key, {
          employeeId: key,
          name: `${row.first_name} ${row.last_name}`,
          days: {},
          totalHours: 0,
          overtimeHours: 0,
        });
      }
      const entry = weeklyMap.get(key)!;
      const dayStr = new Date(row.entry_date).toISOString().slice(0, 10);
      entry.days[dayStr] = Number(row.work_hours);
      entry.totalHours += Number(row.work_hours);
      entry.overtimeHours += Number(row.overtime_hours);
    }

    await pool.end();

    return NextResponse.json({
      today: todayEntries.rows.map((r) => ({
        id: r.id,
        employeeId: r.employee_id,
        name: `${r.first_name} ${r.last_name}`,
        department: r.department ?? '',
        clockIn: r.clock_in,
        clockOut: r.clock_out,
        workHours: r.work_hours ? Number(r.work_hours) : null,
        overtimeHours: r.overtime_hours ? Number(r.overtime_hours) : 0,
        status: r.status ?? 'present',
        approved: r.approved ?? false,
      })),
      weeklySummary: Array.from(weeklyMap.values()),
      shifts: shifts.rows.map((r) => ({
        id: r.id,
        name: r.name,
        startTime: r.start_time,
        endTime: r.end_time,
        breakMinutes: r.break_minutes ?? 0,
        isDefault: r.is_default ?? false,
      })),
      stats: {
        presentToday,
        absentToday,
        avgHoursToday,
        weeklyOvertimeTotal: Math.round(weeklyOvertimeTotal * 10) / 10,
        totalEmployees: totalCount,
      },
    });
  } catch (error) {
    console.error('Mesai API GET error:', error);
    return NextResponse.json(
      {
        error: 'Mesai verileri alinamadi',
        today: [],
        weeklySummary: [],
        shifts: [],
        stats: { presentToday: 0, absentToday: 0, avgHoursToday: 0, weeklyOvertimeTotal: 0, totalEmployees: 0 },
      },
      { status: 500 },
    );
  }
}

/* ─── POST: Clock in / Clock out ─── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, action } = body as { employeeId: string; action: 'clock_in' | 'clock_out' };

    if (!employeeId || !action) {
      return NextResponse.json({ error: 'employeeId ve action zorunludur' }, { status: 400 });
    }

    if (action !== 'clock_in' && action !== 'clock_out') {
      return NextResponse.json(
        { error: "Gecersiz action. Gecerli degerler: 'clock_in', 'clock_out'" },
        { status: 400 },
      );
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    if (action === 'clock_in') {
      // Check if already clocked in today
      const existing = await pool.query(
        `SELECT id FROM app.time_entries
         WHERE tenant_id = $1 AND employee_id = $2 AND entry_date = CURRENT_DATE`,
        [TENANT_ID, employeeId],
      );

      if (existing.rows.length > 0) {
        await pool.end();
        return NextResponse.json({ error: 'Bu calisan bugun zaten giris yapmis' }, { status: 409 });
      }

      // Determine late status based on default shift
      const defaultShift = await pool.query(
        `SELECT start_time FROM app.shift_definitions
         WHERE tenant_id = $1 AND is_default = true LIMIT 1`,
        [TENANT_ID],
      );

      const now = new Date();
      let status = 'on_time';
      if (defaultShift.rows[0]) {
        const shiftStart = defaultShift.rows[0].start_time as string;
        const [hours, minutes] = shiftStart.split(':').map(Number);
        const shiftDate = new Date();
        shiftDate.setHours(hours ?? 9, minutes ?? 0, 0, 0);
        if (now > shiftDate) {
          status = 'late';
        }
      }

      const result = await pool.query(
        `INSERT INTO app.time_entries (tenant_id, employee_id, entry_date, clock_in, status, approved)
         VALUES ($1, $2, CURRENT_DATE, NOW(), $3, false)
         RETURNING id, clock_in, status`,
        [TENANT_ID, employeeId, status],
      );

      await pool.end();

      const actorId = req.headers.get('x-user-id') || 'anonymous';
      const actorRole = req.headers.get('x-user-role') || 'hr_director';
      const audit = createAuditLogger(actorId, actorRole);
      void audit.log('create', 'time_entry', result.rows[0]?.id, undefined, {
        employeeId,
        action: 'clock_in',
        status,
      });

      return NextResponse.json({
        success: true,
        entry: result.rows[0],
        message: status === 'late' ? 'Giris yapildi (gec kalinmis)' : 'Giris yapildi',
      });
    }

    // clock_out
    const existing = await pool.query(
      `SELECT id, clock_in FROM app.time_entries
       WHERE tenant_id = $1 AND employee_id = $2 AND entry_date = CURRENT_DATE AND clock_out IS NULL`,
      [TENANT_ID, employeeId],
    );

    if (existing.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ error: 'Acik giris kaydi bulunamadi' }, { status: 404 });
    }

    const entryId = existing.rows[0].id;
    const clockIn = new Date(existing.rows[0].clock_in);
    const clockOut = new Date();
    const diffMs = clockOut.getTime() - clockIn.getTime();
    const workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    const overtimeHours = Math.max(0, Math.round((workHours - 8) * 100) / 100);

    await pool.query(
      `UPDATE app.time_entries
       SET clock_out = NOW(), work_hours = $1, overtime_hours = $2
       WHERE id = $3 AND tenant_id = $4`,
      [workHours, overtimeHours, entryId, TENANT_ID],
    );

    await pool.end();

    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'hr_director';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('update', 'time_entry', entryId, undefined, {
      employeeId,
      action: 'clock_out',
      workHours,
      overtimeHours,
    });

    return NextResponse.json({
      success: true,
      message: 'Cikis yapildi',
      workHours,
      overtimeHours,
    });
  } catch (error) {
    console.error('Mesai API POST error:', error);
    return NextResponse.json({ error: 'Giris/cikis islemi basarisiz' }, { status: 500 });
  }
}

/* ─── PATCH: Approve time entry ─── */

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { entryId, approved } = body as { entryId: string; approved: boolean };

    if (!entryId || typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'entryId ve approved (boolean) zorunludur' }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const result = await pool.query(
      `UPDATE app.time_entries SET approved = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3
       RETURNING id, employee_id, approved`,
      [approved, entryId, TENANT_ID],
    );

    if (result.rowCount === 0) {
      await pool.end();
      return NextResponse.json({ error: 'Mesai kaydi bulunamadi' }, { status: 404 });
    }

    await pool.end();

    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'hr_director';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('update', 'time_entry', entryId, undefined, { approved });

    return NextResponse.json({ success: true, entry: result.rows[0] });
  } catch (error) {
    console.error('Mesai API PATCH error:', error);
    return NextResponse.json({ error: 'Onay islemi basarisiz' }, { status: 500 });
  }
}
