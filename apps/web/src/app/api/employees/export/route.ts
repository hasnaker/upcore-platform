import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';
import { buildXlsx } from '@/lib/xlsx-export';

type ApiEmployee = {
  id: string;
  employee_no: string;
  ad: string;
  soyad: string;
  email_is?: string | null;
  tckn?: string | null;
  hire_date?: string | null;
  employment_status: string;
  department_id?: string | null;
  position_id?: string | null;
};

// GET /api/employees/export?format=xlsx|csv
// XLSX üretir (exceljs) veya CSV fallback. Tüm çalışan listesini (gateway-side
// scope'a uyarak) Excel dosyası olarak indirir — 1. Paraşüt göçü + 2. Muhasebe
// departmanı aylık manuel rapor use-case'i.
export async function GET(req: NextRequest) {
  const ctx = getRequestContext(req);
  const format = req.nextUrl.searchParams.get('format') ?? 'xlsx';

  // Fetch full list in pages of 500
  const rows: ApiEmployee[] = [];
  let page = 1;
  const limit = 500;
  while (true) {
    const r = await fetch(
      `${SERVICES.employee}/api/v1/employees?page=${page}&limit=${limit}`,
      { headers: buildServiceHeaders(ctx), cache: 'no-store' },
    );
    if (!r.ok) {
      return NextResponse.json(
        { error: 'employee_service_error', status: r.status },
        { status: 502 },
      );
    }
    const body = await r.json();
    const items = (body.items as ApiEmployee[]) ?? [];
    rows.push(...items);
    if (items.length < limit) break;
    page++;
    if (page > 40) break; // safety: max 20k rows
  }

  if (format === 'csv') {
    const csv = toCSV(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="calisanlar_${Date.now()}.csv"`,
      },
    });
  }

  const today = new Date().toLocaleDateString('tr-TR');
  const { body, mime, filename } = await buildXlsx<ApiEmployee>({
    sheetName: 'Calisanlar',
    title: `UpCore Çalışan Listesi — ${today}`,
    subtitle: `Toplam ${rows.length} kişi`,
    columns: [
      { header: 'Sicil No', key: 'employee_no', width: 14 },
      { header: 'Ad', key: 'ad', width: 18 },
      { header: 'Soyad', key: 'soyad', width: 18 },
      { header: 'Email', key: 'email_is', width: 28 },
      { header: 'TCKN', key: 'tckn', width: 14 },
      { header: 'İşe Giriş', key: 'hire_date', width: 14, format: 'dd/mm/yyyy' },
      { header: 'Durum', key: 'employment_status', width: 14 },
    ],
    rows,
  });

  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function toCSV(rows: ApiEmployee[]): string {
  const header = 'EmployeeNo,Ad,Soyad,Email,TCKN,HireDate,Status';
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [r.employee_no, r.ad, r.soyad, r.email_is ?? '', r.tckn ?? '',
      r.hire_date ?? '', r.employment_status].map(esc).join(','),
  );
  return [header, ...lines].join('\r\n');
}
