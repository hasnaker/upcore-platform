// ============================================================================
// Upcore V1 — E2E Test Data (Turkish)
// ============================================================================

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------
export interface TestEmployee {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  startDate: string;
  birthDate: string;
  tcKimlikNo: string;
}

export const TEST_EMPLOYEES: TestEmployee[] = [
  {
    firstName: "Ahmet",
    lastName: "Kaya",
    email: "ahmet.kaya@test.upcore.io",
    phone: "+905551234567",
    department: "Yazilim Gelistirme",
    position: "Kidemli Yazilim Muhendisi",
    startDate: "2023-03-15",
    birthDate: "1990-05-20",
    tcKimlikNo: "12345678901",
  },
  {
    firstName: "Fatma",
    lastName: "Ozturk",
    email: "fatma.ozturk@test.upcore.io",
    phone: "+905559876543",
    department: "Insan Kaynaklari",
    position: "IK Uzmani",
    startDate: "2022-01-10",
    birthDate: "1988-11-30",
    tcKimlikNo: "23456789012",
  },
  {
    firstName: "Ali",
    lastName: "Yildiz",
    email: "ali.yildiz@test.upcore.io",
    phone: "+905552345678",
    department: "Pazarlama",
    position: "Pazarlama Muduru",
    startDate: "2021-06-01",
    birthDate: "1985-02-14",
    tcKimlikNo: "34567890123",
  },
  {
    firstName: "Zeynep",
    lastName: "Celik",
    email: "zeynep.celik@test.upcore.io",
    phone: "+905553456789",
    department: "Finans",
    position: "Muhasebe Uzmani",
    startDate: "2023-09-01",
    birthDate: "1992-08-25",
    tcKimlikNo: "45678901234",
  },
  {
    firstName: "Mustafa",
    lastName: "Sahin",
    email: "mustafa.sahin@test.upcore.io",
    phone: "+905554567890",
    department: "Yazilim Gelistirme",
    position: "Junior Gelistirici",
    startDate: "2024-01-15",
    birthDate: "1998-12-01",
    tcKimlikNo: "56789012345",
  },
];

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------
export const TEST_DEPARTMENTS = [
  "Yazilim Gelistirme",
  "Insan Kaynaklari",
  "Pazarlama",
  "Finans",
  "Operasyon",
  "Musteri Hizmetleri",
];

// ---------------------------------------------------------------------------
// Leave types
// ---------------------------------------------------------------------------
export interface TestLeaveRequest {
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  days: number;
}

export const TEST_LEAVE_TYPES = [
  "Yillik Izin",
  "Hastalik Izni",
  "Mazeret Izni",
  "Evlilik Izni",
  "Dogum Izni",
  "Olum Izni",
  "Ucretsiz Izin",
];

export const TEST_LEAVE_REQUEST: TestLeaveRequest = {
  type: "Yillik Izin",
  startDate: "2026-05-01",
  endDate: "2026-05-05",
  reason: "Ailevi nedenlerle yillik izin talebi",
  days: 3,
};

// ---------------------------------------------------------------------------
// BAT-12-TR Pulse Survey
// ---------------------------------------------------------------------------
export interface SurveyQuestion {
  text: string;
  options: string[];
}

export const BAT_12_TR_QUESTIONS: SurveyQuestion[] = [
  {
    text: "Isimden fiziksel olarak tukendigimi hissediyorum",
    options: ["Hicbir zaman", "Nadiren", "Bazen", "Siklikla", "Her zaman"],
  },
  {
    text: "Isimden duygusal olarak tukendigimi hissediyorum",
    options: ["Hicbir zaman", "Nadiren", "Bazen", "Siklikla", "Her zaman"],
  },
  {
    text: "Is gunumun sonunda kendimi bitkin hissediyorum",
    options: ["Hicbir zaman", "Nadiren", "Bazen", "Siklikla", "Her zaman"],
  },
  {
    text: "Sabah kalktigimda bir is gunu daha gecirmek beni yoruyor",
    options: ["Hicbir zaman", "Nadiren", "Bazen", "Siklikla", "Her zaman"],
  },
  {
    text: "Isime karsi ilgisizlestigimi hissediyorum",
    options: ["Hicbir zaman", "Nadiren", "Bazen", "Siklikla", "Her zaman"],
  },
  {
    text: "Isimin anlamli oldugunu sorgulamaya basladim",
    options: ["Hicbir zaman", "Nadiren", "Bazen", "Siklikla", "Her zaman"],
  },
  {
    text: "Isime olan hevesimin azaldigini hissediyorum",
    options: ["Hicbir zaman", "Nadiren", "Bazen", "Siklikla", "Her zaman"],
  },
  {
    text: "Isimde yalnizca mekanik olarak calismak istiyorum",
    options: ["Hicbir zaman", "Nadiren", "Bazen", "Siklikla", "Her zaman"],
  },
  {
    text: "Isimdeki performansimdan memnunum",
    options: ["Hicbir zaman", "Nadiren", "Bazen", "Siklikla", "Her zaman"],
  },
  {
    text: "Isimde anlamli seyler basarabiliyorum",
    options: ["Hicbir zaman", "Nadiren", "Bazen", "Siklikla", "Her zaman"],
  },
  {
    text: "Isimde etkili olabiliyorum",
    options: ["Hicbir zaman", "Nadiren", "Bazen", "Siklikla", "Her zaman"],
  },
  {
    text: "Isimde karsilastigim sorunlari cozebiliyorum",
    options: ["Hicbir zaman", "Nadiren", "Bazen", "Siklikla", "Her zaman"],
  },
];

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------
export interface TestAssessment {
  title: string;
  description: string;
  duration: number; // minutes
  questionCount: number;
  passingScore: number;
}

export const TEST_ASSESSMENT: TestAssessment = {
  title: "Yazilim Muhendisligi Yetkinlik Degerlendirmesi",
  description:
    "Yazilim muhendisligi pozisyonu icin temel yetkinliklerin degerlendirilmesi",
  duration: 45,
  questionCount: 20,
  passingScore: 70,
};

// ---------------------------------------------------------------------------
// Tenant / Organization
// ---------------------------------------------------------------------------
export interface TestTenant {
  companyName: string;
  slug: string;
  taxId: string;
  address: string;
  city: string;
  phone: string;
  employeeCount: string;
  sector: string;
}

export const TEST_TENANT: TestTenant = {
  companyName: "Test Teknoloji A.S.",
  slug: "test-teknoloji",
  taxId: "1234567890",
  address: "Levent Mah. Buyukdere Cad. No:123",
  city: "Istanbul",
  phone: "+902121234567",
  employeeCount: "50-100",
  sector: "Teknoloji",
};

// ---------------------------------------------------------------------------
// Action Center
// ---------------------------------------------------------------------------
export interface TestAction {
  title: string;
  type: string;
  priority: string;
  assignee: string;
}

export const TEST_ACTIONS: TestAction[] = [
  {
    title: "Yuksek tukenmislik riski - Yazilim ekibi",
    type: "Tukenmislik Mudahalesi",
    priority: "Kritik",
    assignee: "Ayse Yilmaz",
  },
  {
    title: "Izin bakiyesi dusuk calisanlar",
    type: "Izin Hatirlatmasi",
    priority: "Orta",
    assignee: "Ayse Yilmaz",
  },
  {
    title: "Yeni calisan oryantasyon",
    type: "Oryantasyon",
    priority: "Normal",
    assignee: "Ayse Yilmaz",
  },
];
