/**
 * Minimal, dependency-free RFC 4180 CSV parser + employee-import validator
 * shared by the onboarding wizard (Step 4) and future bulk-import flows.
 *
 * Why not papaparse: we intentionally avoid another runtime dep for a task
 * we can ship in ~120 LOC. This handles quoted fields, escaped quotes ("")
 * inside quoted cells, BOM, CR/LF/CRLF row terminators, and a configurable
 * delimiter (default comma, falls back to `;` for Turkish Excel exports).
 */

export interface CSVParseResult {
  header: string[];
  rows: string[][];
  delimiter: ',' | ';';
}

/** Detect the most likely delimiter (comma vs Turkish semicolon). */
export function detectDelimiter(sample: string): ',' | ';' {
  const firstLine = sample.split(/\r?\n/, 1)[0] ?? '';
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  return semis > commas ? ';' : ',';
}

/** Parse a CSV string into header + rows. Empty trailing rows are dropped. */
export function parseCSV(input: string, explicitDelimiter?: ',' | ';'): CSVParseResult {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

  const delim = explicitDelimiter ?? detectDelimiter(text);

  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delim) {
      row.push(field);
      field = '';
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      row.push(field);
      field = '';
      // collapse CRLF
      if (ch === '\r' && text[i + 1] === '\n') i++;
      // drop rows that are visually empty (a single empty cell)
      if (!(row.length === 1 && row[0] === '')) {
        rows.push(row);
      }
      row = [];
      continue;
    }
    field += ch;
  }
  // flush trailing cell / row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (!(row.length === 1 && row[0] === '')) {
      rows.push(row);
    }
  }

  if (rows.length === 0) return { header: [], rows: [], delimiter: delim };
  const [header, ...dataRows] = rows as [string[], ...string[][]];
  return {
    header: header.map((h) => h.trim()),
    rows: dataRows,
    delimiter: delim,
  };
}

// --- Employee row validation -----------------------------------------------

export interface EmployeeRowDraft {
  first_name: string;
  last_name: string;
  email?: string;
  tckn?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  salary?: number;
  employee_no?: string;
}

export interface EmployeeRowError {
  row: number;
  column?: string;
  message: string;
  value?: string;
}

export interface EmployeeImportResult {
  valid: EmployeeRowDraft[];
  errors: EmployeeRowError[];
  duplicates: { email: number; tckn: number; employee_no: number };
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * TCKN (Turkish national ID) Luhn-like checksum as defined by the MERNIS
 * algorithm. Returns true for 11-digit IDs whose two check digits match.
 */
export function isValidTCKN(input: string): boolean {
  const s = (input ?? '').trim();
  if (!/^[1-9]\d{10}$/.test(s)) return false;
  const digits = s.split('').map((c) => parseInt(c, 10));
  const d = digits as [number, number, number, number, number, number, number, number, number, number, number];
  const sumOdd = d[0] + d[2] + d[4] + d[6] + d[8];
  const sumEven = d[1] + d[3] + d[5] + d[7];
  const d10 = ((sumOdd * 7) - sumEven) % 10;
  if (((d10 + 10) % 10) !== d[9]) return false;
  const first10Sum = d[0] + d[1] + d[2] + d[3] + d[4] + d[5] + d[6] + d[7] + d[8] + d[9];
  return first10Sum % 10 === d[10];
}

const REQUIRED_COLUMNS = ['first_name', 'last_name'] as const;
// Accept a handful of common Turkish column names as aliases.
const COLUMN_ALIASES: Record<string, keyof EmployeeRowDraft> = {
  ad: 'first_name',
  isim: 'first_name',
  first_name: 'first_name',
  firstname: 'first_name',
  soyad: 'last_name',
  last_name: 'last_name',
  lastname: 'last_name',
  email: 'email',
  'e-posta': 'email',
  eposta: 'email',
  tckn: 'tckn',
  'tc_kimlik': 'tckn',
  'tc kimlik': 'tckn',
  pozisyon: 'position',
  position: 'position',
  unvan: 'position',
  departman: 'department',
  department: 'department',
  birim: 'department',
  'ise_baslama_tarihi': 'hire_date',
  hire_date: 'hire_date',
  hiredate: 'hire_date',
  'giris_tarihi': 'hire_date',
  salary: 'salary',
  maas: 'salary',
  sicil_no: 'employee_no',
  'sicil no': 'employee_no',
  employee_no: 'employee_no',
};

function mapHeader(header: string[]): (keyof EmployeeRowDraft | null)[] {
  return header.map((h) => {
    const norm = h.trim().toLowerCase().replace(/\s+/g, '_');
    return COLUMN_ALIASES[norm] ?? null;
  });
}

/**
 * Validate parsed CSV rows into `EmployeeRowDraft`s, collecting per-row
 * errors and summary duplicate counts.
 */
export function validateEmployees(
  header: string[],
  rows: string[][],
  opts: { maxRows?: number } = {},
): EmployeeImportResult {
  const maxRows = opts.maxRows ?? 10_000;
  const result: EmployeeImportResult = {
    valid: [],
    errors: [],
    duplicates: { email: 0, tckn: 0, employee_no: 0 },
  };
  const cols = mapHeader(header);
  for (const req of REQUIRED_COLUMNS) {
    if (!cols.includes(req)) {
      result.errors.push({
        row: 0,
        column: req,
        message: `Zorunlu sütun eksik: ${req}`,
      });
      return result;
    }
  }

  const seenEmail = new Set<string>();
  const seenTCKN = new Set<string>();
  const seenEmpNo = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    if (i >= maxRows) {
      result.errors.push({
        row: i + 2,
        message: `Maksimum ${maxRows} satır — üstü kesildi.`,
      });
      break;
    }
    const r = rows[i] ?? [];
    const draft: EmployeeRowDraft = { first_name: '', last_name: '' };
    let valid = true;

    cols.forEach((key, ci) => {
      if (!key) return;
      const raw = (r[ci] ?? '').trim();
      if (!raw) return;
      switch (key) {
        case 'first_name':
        case 'last_name':
        case 'position':
        case 'department':
        case 'employee_no':
          draft[key] = raw;
          break;
        case 'email': {
          if (!EMAIL_RE.test(raw)) {
            result.errors.push({ row: i + 2, column: 'email', message: 'Geçersiz e-posta', value: raw });
            valid = false;
            break;
          }
          const low = raw.toLowerCase();
          if (seenEmail.has(low)) {
            result.duplicates.email++;
            result.errors.push({ row: i + 2, column: 'email', message: 'E-posta tekrar etmiş', value: raw });
            valid = false;
            break;
          }
          seenEmail.add(low);
          draft.email = low;
          break;
        }
        case 'tckn': {
          if (!isValidTCKN(raw)) {
            result.errors.push({ row: i + 2, column: 'tckn', message: 'Geçersiz TC Kimlik No', value: raw });
            valid = false;
            break;
          }
          if (seenTCKN.has(raw)) {
            result.duplicates.tckn++;
            result.errors.push({ row: i + 2, column: 'tckn', message: 'TCKN tekrar etmiş', value: raw });
            valid = false;
            break;
          }
          seenTCKN.add(raw);
          draft.tckn = raw;
          break;
        }
        case 'hire_date': {
          const normalized = normalizeDate(raw);
          if (!normalized) {
            result.errors.push({
              row: i + 2,
              column: 'hire_date',
              message: 'Tarih geçersiz (YYYY-MM-DD veya DD.MM.YYYY)',
              value: raw,
            });
            valid = false;
            break;
          }
          draft.hire_date = normalized;
          break;
        }
        case 'salary': {
          const n = parseInt(raw.replace(/[^\d-]/g, ''), 10);
          if (Number.isNaN(n) || n < 0) {
            result.errors.push({ row: i + 2, column: 'salary', message: 'Maaş negatif olamaz', value: raw });
            valid = false;
            break;
          }
          draft.salary = n;
          break;
        }
      }
    });

    if (!draft.first_name || !draft.last_name) {
      result.errors.push({
        row: i + 2,
        column: !draft.first_name ? 'first_name' : 'last_name',
        message: 'Ad/Soyad zorunludur',
      });
      valid = false;
    }
    if (draft.employee_no) {
      if (seenEmpNo.has(draft.employee_no)) {
        result.duplicates.employee_no++;
        result.errors.push({
          row: i + 2,
          column: 'employee_no',
          message: 'Sicil no tekrar etmiş',
          value: draft.employee_no,
        });
        valid = false;
      } else {
        seenEmpNo.add(draft.employee_no);
      }
    }
    if (valid) result.valid.push(draft);
  }
  return result;
}

/** YYYY-MM-DD | DD.MM.YYYY | DD/MM/YYYY → YYYY-MM-DD or null. */
export function normalizeDate(s: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const tr = /^(\d{2})[./](\d{2})[./](\d{4})$/.exec(s);
  if (tr) return `${tr[3]}-${tr[2]}-${tr[1]}`;
  return null;
}

/**
 * Build a small sample CSV for the "Örnek dosya indir" button.
 *
 * Canonical Turkish schema — aynısı services/employee `parasutColumns`
 * listesi ile /calisanlar/import sayfasındaki CSV_TEMPLATE ile hizalıdır.
 * Tek hash: bütün import akışları bu başlıkları bekler.
 */
export function sampleEmployeesCSV(): string {
  return [
    'sicil_no,ad,soyad,email,tckn,dogum_tarihi,ise_baslama_tarihi,departman,pozisyon,yonetici_email',
    '10001,Ayşe,Demir,ayse.demir@ornek.com,10000000146,1990-05-14,2024-01-15,Mühendislik,Yazılım Uzmanı,',
    '10002,Mehmet,Yılmaz,mehmet.yilmaz@ornek.com,14354113936,1988-11-22,2023-07-01,İnsan Kaynakları,İK Uzmanı,',
    '10003,Fatma,Kaya,fatma.kaya@ornek.com,,1992-03-08,2024-03-15,Finans,Muhasebe Uzmanı,mehmet.yilmaz@ornek.com',
  ].join('\n');
}
