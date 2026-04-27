import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';

/* ─── Turkish Payroll Tax Constants ─── */

const TAX = {
  sgkEmployee: 0.14, // %14 SGK isci payi
  sgkEmployer: 0.205, // %20.5 SGK isveren payi
  unemploymentEmployee: 0.01, // %1 issizlik isci
  unemploymentEmployer: 0.02, // %2 issizlik isveren
  stampTax: 0.00759, // %0.759 damga vergisi
  // Progressive income tax brackets — 2026 ücret gelirleri (GVK md.103, RG 31.12.2025).
  // Mirrors database migration 025_bordro.up.sql + packages/go/bordro Brackets2026().
  incomeTaxBrackets: [
    { limit: 158000, rate: 0.15 },
    { limit: 330000, rate: 0.20 },
    { limit: 1200000, rate: 0.27 },
    { limit: 4300000, rate: 0.35 },
    { limit: Infinity, rate: 0.40 },
  ] as Array<{ limit: number; rate: number }>,
} as const;

/** Calculate progressive income tax based on cumulative earnings */
function calculateIncomeTax(grossMonthly: number, cumulativeGross: number): number {
  const sgkDeduction = grossMonthly * TAX.sgkEmployee;
  const unemploymentDeduction = grossMonthly * TAX.unemploymentEmployee;
  const taxableIncome = grossMonthly - sgkDeduction - unemploymentDeduction;

  let tax = 0;
  let remaining = taxableIncome;
  let cumUsed = cumulativeGross - grossMonthly; // previous months' cumulative

  for (const bracket of TAX.incomeTaxBrackets) {
    if (remaining <= 0) break;
    const bracketSpace = Math.max(0, bracket.limit - cumUsed);
    const taxableInBracket = Math.min(remaining, bracketSpace);
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
    cumUsed += taxableInBracket;
  }

  return Math.round(tax * 100) / 100;
}

/** Full payroll calculation for a single employee */
function calculatePayroll(
  grossSalary: number,
  cumulativeGross: number,
): {
  gross: number;
  sgkEmployee: number;
  sgkEmployer: number;
  unemploymentEmployee: number;
  unemploymentEmployer: number;
  incomeTax: number;
  stampTax: number;
  totalDeductions: number;
  netSalary: number;
  employerCost: number;
} {
  const sgkEmployee = Math.round(grossSalary * TAX.sgkEmployee * 100) / 100;
  const sgkEmployer = Math.round(grossSalary * TAX.sgkEmployer * 100) / 100;
  const unemploymentEmployee = Math.round(grossSalary * TAX.unemploymentEmployee * 100) / 100;
  const unemploymentEmployer = Math.round(grossSalary * TAX.unemploymentEmployer * 100) / 100;
  const incomeTax = calculateIncomeTax(grossSalary, cumulativeGross);
  const stampTax = Math.round(grossSalary * TAX.stampTax * 100) / 100;

  const totalDeductions = sgkEmployee + unemploymentEmployee + incomeTax + stampTax;
  const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;
  const employerCost = Math.round((grossSalary + sgkEmployer + unemploymentEmployer) * 100) / 100;

  return {
    gross: grossSalary,
    sgkEmployee,
    sgkEmployer,
    unemploymentEmployee,
    unemploymentEmployer,
    incomeTax,
    stampTax,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netSalary,
    employerCost,
  };
}

/* ─── GET: Payroll runs and items ─── */

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Payroll runs
    const runs = await pool.query(
      `SELECT pr.id, pr.period, pr.status, pr.employee_count,
              pr.total_gross, pr.total_net, pr.total_sgk_employee, pr.total_sgk_employer,
              pr.total_income_tax, pr.total_stamp_tax,
              pr.created_at, pr.approved_at, pr.approved_by
       FROM app.payroll_runs pr
       WHERE pr.tenant_id = $1
       ORDER BY pr.created_at DESC
       LIMIT 24`,
      [TENANT_ID],
    );

    // Payroll items for the most recent run (if any)
    let items: Array<{
      id: string;
      runId: string;
      employeeId: string;
      name: string;
      department: string;
      gross: number;
      sgkEmployee: number;
      sgkEmployer: number;
      unemploymentEmployee: number;
      unemploymentEmployer: number;
      incomeTax: number;
      stampTax: number;
      totalDeductions: number;
      netSalary: number;
      employerCost: number;
    }> = [];

    if (runs.rows.length > 0) {
      const latestRunId = runs.rows[0].id;
      const itemsResult = await pool.query(
        `SELECT pi.id, pi.payroll_run_id, pi.employee_id,
                pi.gross_salary, pi.sgk_employee, pi.sgk_employer,
                pi.unemployment_employee, pi.unemployment_employer,
                pi.income_tax, pi.stamp_tax, pi.net_salary,
                pi.overtime_pay, pi.bonus, pi.deductions, pi.bank_iban,
                e.ad AS first_name, e.soyad AS last_name,
                d.name_tr AS department
         FROM app.payroll_items pi
         JOIN app.employees e ON e.id = pi.employee_id
         LEFT JOIN app.departments d ON d.id = e.department_id
         WHERE e.tenant_id = $1 AND pi.payroll_run_id = $2
         ORDER BY pi.gross_salary DESC`,
        [TENANT_ID, latestRunId],
      );

      items = itemsResult.rows.map((r) => ({
        id: r.id,
        runId: r.run_id,
        employeeId: r.employee_id,
        name: `${r.first_name} ${r.last_name}`,
        department: r.department ?? '',
        gross: Number(r.gross_salary),
        sgkEmployee: Number(r.sgk_employee),
        sgkEmployer: Number(r.sgk_employer),
        unemploymentEmployee: Number(r.unemployment_employee),
        unemploymentEmployer: Number(r.unemployment_employer),
        incomeTax: Number(r.income_tax),
        stampTax: Number(r.stamp_tax),
        totalDeductions: Number(r.total_deductions),
        netSalary: Number(r.net_salary),
        employerCost: Number(r.employer_cost),
      }));
    }

    // Summary stats across all runs
    const latestRun = runs.rows[0];
    const stats = {
      totalGross: latestRun ? Number(latestRun.total_gross ?? 0) : 0,
      totalNet: latestRun ? Number(latestRun.total_net ?? 0) : 0,
      totalSgk: latestRun ? Number(latestRun.total_sgk_employee ?? 0) : 0,
      totalTax: latestRun ? Number(latestRun.total_income_tax ?? 0) : 0,
      totalEmployerCost: latestRun
        ? Number(latestRun.total_sgk_employer ?? 0) + Number(latestRun.total_gross ?? 0)
        : 0,
    };

    await pool.end();

    return NextResponse.json({
      runs: runs.rows.map((r) => ({
        id: r.id,
        period: r.period,
        status: r.status,
        employeeCount: r.employee_count ?? 0,
        totalGross: Number(r.total_gross ?? 0),
        totalNet: Number(r.total_net ?? 0),
        totalSgk: Number(r.total_sgk_employee ?? 0),
        totalTax: Number(r.total_income_tax ?? 0),
        totalEmployerCost: Number(r.total_sgk_employer ?? 0) + Number(r.total_gross ?? 0),
        createdAt: r.created_at,
        approvedAt: r.approved_at,
      })),
      items,
      stats,
      taxRates: {
        sgkEmployee: TAX.sgkEmployee * 100,
        sgkEmployer: TAX.sgkEmployer * 100,
        unemploymentEmployee: TAX.unemploymentEmployee * 100,
        unemploymentEmployer: TAX.unemploymentEmployer * 100,
        stampTax: TAX.stampTax * 100,
        incomeTaxBrackets: TAX.incomeTaxBrackets.map((b) => ({
          limit: b.limit === Infinity ? 'Uzeri' : b.limit,
          rate: b.rate * 100,
        })),
      },
    });
  } catch (error) {
    console.error('Bordro API GET error:', error);
    return NextResponse.json(
      {
        error: 'Bordro verileri alinamadi',
        runs: [],
        items: [],
        stats: { totalGross: 0, totalNet: 0, totalSgk: 0, totalTax: 0, totalEmployerCost: 0 },
        taxRates: null,
      },
      { status: 500 },
    );
  }
}

/* ─── POST: Create new payroll run (auto-calculate from compensation data) ─── */

export async function POST(req: NextRequest) {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Get current period (YYYY-MM)
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Check if run already exists for this period
    const existingRun = await pool.query(
      `SELECT id FROM app.payroll_runs WHERE tenant_id = $1 AND period = $2`,
      [TENANT_ID, period],
    );

    if (existingRun.rows.length > 0) {
      await pool.end();
      return NextResponse.json(
        { error: `Bu donem icin bordro zaten olusturulmus: ${period}` },
        { status: 409 },
      );
    }

    // Fetch all active employees with compensation
    const employees = await pool.query(
      `SELECT e.id AS employee_id, e.ad AS first_name, e.soyad AS last_name,
              ec.base_salary
       FROM app.employees e
       JOIN app.employee_compensation ec ON ec.employee_id = e.id AND ec.tenant_id = e.tenant_id
       WHERE e.tenant_id = $1 AND e.status = 'active'
       ORDER BY e.soyad, e.ad`,
      [TENANT_ID],
    );

    if (employees.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ error: 'Aktif calisan bulunamadi' }, { status: 404 });
    }

    // Calculate cumulative gross per employee (sum of previous runs this year)
    const yearStart = `${now.getFullYear()}-01`;
    const cumulativeResult = await pool.query(
      `SELECT pi.employee_id, COALESCE(SUM(pi.gross_salary), 0) AS cumulative_gross
       FROM app.payroll_items pi
       JOIN app.payroll_runs pr ON pr.id = pi.payroll_run_id AND pr.tenant_id = pi.tenant_id
       WHERE e.tenant_id = $1 AND pr.period >= $2 AND pr.period < $3
       GROUP BY pi.employee_id`,
      [TENANT_ID, yearStart, period],
    );

    const cumulativeMap = new Map<string, number>();
    for (const row of cumulativeResult.rows) {
      cumulativeMap.set(row.employee_id as string, Number(row.cumulative_gross));
    }

    // Create payroll run
    const runResult = await pool.query(
      `INSERT INTO app.payroll_runs (tenant_id, period, status, employee_count)
       VALUES ($1, $2, 'draft', $3)
       RETURNING id`,
      [TENANT_ID, period, employees.rows.length],
    );

    const runId = runResult.rows[0].id as string;

    // Calculate and insert payroll items for each employee
    let totalGross = 0;
    let totalNet = 0;
    let totalSgkEmployee = 0;
    let totalSgkEmployer = 0;
    let totalIncomeTax = 0;
    let totalStampTax = 0;

    for (const emp of employees.rows) {
      const grossSalary = Number(emp.base_salary);
      const cumGross = (cumulativeMap.get(emp.employee_id as string) ?? 0) + grossSalary;
      const calc = calculatePayroll(grossSalary, cumGross);

      await pool.query(
        `INSERT INTO app.payroll_items (
          tenant_id, run_id, employee_id,
          gross_salary, sgk_employee, sgk_employer,
          unemployment_employee, unemployment_employer,
          income_tax, stamp_tax, total_deductions,
          net_salary, employer_cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          TENANT_ID, runId, emp.employee_id,
          calc.gross, calc.sgkEmployee, calc.sgkEmployer,
          calc.unemploymentEmployee, calc.unemploymentEmployer,
          calc.incomeTax, calc.stampTax, calc.totalDeductions,
          calc.netSalary, calc.employerCost,
        ],
      );

      totalGross += calc.gross;
      totalNet += calc.netSalary;
      totalSgkEmployee += calc.sgkEmployee;
      totalSgkEmployer += calc.sgkEmployer;
      totalIncomeTax += calc.incomeTax;
      totalStampTax += calc.stampTax;
    }

    // Update run totals
    await pool.query(
      `UPDATE app.payroll_runs
       SET total_gross = $1, total_net = $2, total_sgk_employee = $3, total_sgk_employer = $4,
           total_income_tax = $5, total_stamp_tax = $6
       WHERE id = $7 AND tenant_id = $8`,
      [
        Math.round(totalGross * 100) / 100,
        Math.round(totalNet * 100) / 100,
        Math.round(totalSgkEmployee * 100) / 100,
        Math.round(totalSgkEmployer * 100) / 100,
        Math.round(totalIncomeTax * 100) / 100,
        Math.round(totalStampTax * 100) / 100,
        runId,
        TENANT_ID,
      ],
    );

    await pool.end();

    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'hr_director';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('create', 'payroll_run', runId, undefined, {
      period,
      employeeCount: employees.rows.length,
      totalGross,
      totalNet,
    });

    const totalEmployerCost = totalSgkEmployer + totalGross;

    return NextResponse.json({
      success: true,
      runId,
      period,
      employeeCount: employees.rows.length,
      totals: {
        gross: Math.round(totalGross * 100) / 100,
        net: Math.round(totalNet * 100) / 100,
        sgkEmployee: Math.round(totalSgkEmployee * 100) / 100,
        sgkEmployer: Math.round(totalSgkEmployer * 100) / 100,
        incomeTax: Math.round(totalIncomeTax * 100) / 100,
        stampTax: Math.round(totalStampTax * 100) / 100,
        employerCost: Math.round(totalEmployerCost * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Bordro API POST error:', error);
    return NextResponse.json({ error: 'Bordro olusturulamadi' }, { status: 500 });
  }
}

/* ─── PATCH: Update payroll run status (approved / paid) ─── */

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { runId, status } = body as { runId: string; status: 'approved' | 'paid' };

    if (!runId || !status) {
      return NextResponse.json({ error: 'runId ve status zorunludur' }, { status: 400 });
    }

    const validStatuses = ['approved', 'paid'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Gecersiz status. Gecerli degerler: ${validStatuses.join(', ')}` },
        { status: 400 },
      );
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Verify current status allows transition
    const current = await pool.query(
      `SELECT status FROM app.payroll_runs WHERE id = $1 AND tenant_id = $2`,
      [runId, TENANT_ID],
    );

    if (current.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ error: 'Bordro bulunamadi' }, { status: 404 });
    }

    const currentStatus = current.rows[0].status as string;

    if (status === 'approved' && currentStatus !== 'draft') {
      await pool.end();
      return NextResponse.json(
        { error: 'Sadece taslak durumundaki bordrolar onaylanabilir' },
        { status: 400 },
      );
    }

    if (status === 'paid' && currentStatus !== 'approved') {
      await pool.end();
      return NextResponse.json(
        { error: 'Sadece onaylanmis bordrolar odenebilir' },
        { status: 400 },
      );
    }

    const actorId = req.headers.get('x-user-id') || 'anonymous';

    if (status === 'approved') {
      await pool.query(
        `UPDATE app.payroll_runs SET status = $1, approved_at = NOW(), approved_by = $2
         WHERE id = $3 AND tenant_id = $4`,
        [status, actorId, runId, TENANT_ID],
      );
    } else {
      // 'paid' — no paid_at column exists, just update status
      await pool.query(
        `UPDATE app.payroll_runs SET status = $1
         WHERE id = $2 AND tenant_id = $3`,
        [status, runId, TENANT_ID],
      );
    }

    await pool.end();

    const actorRole = req.headers.get('x-user-role') || 'hr_director';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('update', 'payroll_run', runId, undefined, { status, previousStatus: currentStatus });

    return NextResponse.json({ success: true, runId, status });
  } catch (error) {
    console.error('Bordro API PATCH error:', error);
    return NextResponse.json({ error: 'Bordro guncellenemedi' }, { status: 500 });
  }
}
