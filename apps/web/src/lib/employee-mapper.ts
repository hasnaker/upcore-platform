import { SERVICES, DEV_HEADERS } from '@/lib/service-urls';

/**
 * Employee API ↔ Frontend mapping layer
 * TEK KAYNAK — tüm field dönüşümleri burada
 * API: snake_case Turkish (ad, soyad, employee_no, employment_status)
 * Frontend: camelCase Turkish (ad, soyad, sicilNo, durum)
 */

// API'dan gelen ham veri tipi
export interface ApiEmployee {
  id: string;
  tenant_id: string;
  employee_no: string;
  ad: string;
  soyad: string;
  email_is: string | null;
  tckn: string | null;
  dogum_tarihi: string | null;
  hire_date: string;
  tenure_months: number | null;
  employment_status: string;
  employment_type: string | null;
  department_id: string | null;
  position_id: string | null;
  manager_id: string | null;
  salary_currency: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined fields (when available)
  department_name?: string;
  position_name?: string;
  manager_name?: string;
}

// Frontend'de kullanılan temiz veri tipi
export interface EmployeeView {
  id: string;
  sicilNo: string;
  ad: string;
  soyad: string;
  tamAd: string;
  email: string;
  tckn: string | null;
  dogumTarihi: string | null;
  iseBaslama: string;
  kidemAy: number;
  durum: string;
  durumLabel: string;
  durumRenk: 'green' | 'amber' | 'red' | 'gray';
  departmanId: string | null;
  pozisyonId: string | null;
  yoneticiId: string | null;
  initials: string;
  createdAt: string;
}

// POST /employees request body
export interface CreateEmployeeRequest {
  ad: string;
  soyad: string;
  email_is?: string;
  tckn?: string;
  dogum_tarihi?: string;
  hire_date: string;
  department_id?: string;
  position_id?: string;
  manager_id?: string;
}

// API list response
export interface EmployeeListResponse {
  items: ApiEmployee[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_MAP: Record<string, { label: string; renk: 'green' | 'amber' | 'red' | 'gray' }> = {
  active:     { label: 'Aktif',     renk: 'green' },
  on_leave:   { label: 'İzinde',    renk: 'amber' },
  suspended:  { label: 'Askıda',    renk: 'amber' },
  terminated: { label: 'Ayrılmış',  renk: 'red' },
  retired:    { label: 'Emekli',    renk: 'gray' },
};

export function mapApiToView(api: ApiEmployee): EmployeeView {
  const status = STATUS_MAP[api.employment_status] ?? { label: 'Bilinmiyor', renk: 'gray' as const };
  const ad = api.ad ?? '';
  const soyad = api.soyad ?? '';

  return {
    id: api.id,
    sicilNo: api.employee_no ?? '',
    ad,
    soyad,
    tamAd: `${ad} ${soyad}`.trim() || 'İsimsiz',
    email: api.email_is ?? '',
    tckn: api.tckn ?? null,
    dogumTarihi: api.dogum_tarihi ?? null,
    iseBaslama: api.hire_date ?? '',
    kidemAy: api.tenure_months ?? 0,
    durum: api.employment_status ?? 'active',
    durumLabel: status.label,
    durumRenk: status.renk,
    departmanId: api.department_id ?? null,
    pozisyonId: api.position_id ?? null,
    yoneticiId: api.manager_id ?? null,
    initials: getInitials(ad, soyad),
    createdAt: api.created_at ?? '',
  };
}

export function mapManyToView(items: ApiEmployee[]): EmployeeView[] {
  return (items ?? []).map(mapApiToView);
}

function getInitials(ad: string, soyad: string): string {
  const a = (ad || '?').charAt(0).toLocaleUpperCase('tr-TR');
  const s = (soyad || '?').charAt(0).toLocaleUpperCase('tr-TR');
  return `${a}${s}`;
}

// API fonksiyonları — server-side fetch
export async function fetchEmployees(params?: {
  page?: number;
  limit?: number;
  search?: string;
  department_id?: string;
  employment_status?: string;
}): Promise<{ items: EmployeeView[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.department_id) searchParams.set('department_id', params.department_id);
  if (params?.employment_status) searchParams.set('employment_status', params.employment_status);

  const url = `${SERVICES.employee}/api/v1/employees?${searchParams.toString()}`;
  const res = await fetch(url, { headers: DEV_HEADERS, cache: 'no-store' });

  if (!res.ok) {
    throw new Error(`Çalışan verileri alınamadı (${res.status})`);
  }

  const json: EmployeeListResponse = await res.json();
  return {
    items: mapManyToView(json.items),
    total: json.total ?? json.items?.length ?? 0,
  };
}

export async function fetchEmployee(id: string): Promise<EmployeeView> {
  const res = await fetch(`${SERVICES.employee}/api/v1/employees/${id}`, {
    headers: DEV_HEADERS,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Çalışan bulunamadı (${res.status})`);
  const json: ApiEmployee = await res.json();
  return mapApiToView(json);
}

export async function createEmployee(data: CreateEmployeeRequest): Promise<ApiEmployee> {
  const res = await fetch(`${SERVICES.employee}/api/v1/employees`, {
    method: 'POST',
    headers: DEV_HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Bilinmeyen hata' }));
    throw new Error(err.error || err.message || `Çalışan eklenemedi (${res.status})`);
  }
  return res.json();
}

export async function updateEmployee(id: string, data: Partial<CreateEmployeeRequest>): Promise<ApiEmployee> {
  const res = await fetch(`${SERVICES.employee}/api/v1/employees/${id}`, {
    method: 'PATCH',
    headers: DEV_HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Bilinmeyen hata' }));
    throw new Error(err.error || err.message || `Güncelleme başarısız (${res.status})`);
  }
  return res.json();
}

export async function deleteEmployee(id: string): Promise<void> {
  const res = await fetch(`${SERVICES.employee}/api/v1/employees/${id}`, {
    method: 'DELETE',
    headers: DEV_HEADERS,
  });
  if (!res.ok) throw new Error(`Silme başarısız (${res.status})`);
}

// TCKN Validation (mod 10/11 algorithm)
export function validateTCKN(tckn: string): boolean {
  if (!/^\d{11}$/.test(tckn)) return false;
  if (tckn[0] === '0') return false;

  const d = tckn.split('').map(Number);
  const sumOdd = (d[0]! + d[2]! + d[4]! + d[6]! + d[8]!) * 7;
  const sumEven = d[1]! + d[3]! + d[5]! + d[7]!;
  if ((sumOdd - sumEven) % 10 !== d[9]) return false;

  const total = d.slice(0, 10).reduce((a, b) => a + b, 0);
  if (total % 10 !== d[10]) return false;

  return true;
}
