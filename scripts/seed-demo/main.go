// Package main — UpCore demo tenant seeder for marketing screenshots.
//
// Seeds the "demo-co" tenant with 120 employees, 6 weeks of pulse data,
// 12 OKRs, 20 active intervention plans, 3 open internal postings, and
// 9-box calibration for 20 employees. Idempotent: safe to run multiple
// times — each run clears previous demo data for the same tenant.
//
// Refuses to run against a production database via multiple env guards:
//   - DATABASE_URL must contain "dev" or "demo" (case-insensitive)
//   - DEMO_SEED_ALLOW=1 must be set explicitly
//   - Host must not match production hostnames (upcore.io, *.azure.com)
//
// Usage:
//
//	DATABASE_URL=postgres://... DEMO_SEED_ALLOW=1 go run ./scripts/seed-demo
package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"math"
	mrand "math/rand/v2"
	"net/url"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const (
	demoTenantID   = "00000000-0000-0000-0000-0000000000d0"
	demoTenantSlug = "demo-co"
	demoTenantName = "Demo A.Ş."

	targetEmployees     = 120
	pulseWeeks          = 6
	targetOKRs          = 12
	targetInterventions = 20
	targetJobPostings   = 3
	targetApplications  = 5
	targetNineBox       = 20

	// Pseudo-random seed for reproducible output.
	rngSeed1 uint64 = 0xC0FFEE1234ABCD
	rngSeed2 uint64 = 0xDEADBEEF42_5678
)

// ---------------------------------------------------------------------------
// Faker-TR name + email generator (offline, no PII)
// ---------------------------------------------------------------------------

//nolint:gochecknoglobals // seed lists intentionally global
var (
	firstNamesTR = []string{
		"Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "Hasan", "İbrahim", "İsmail",
		"Osman", "Yusuf", "Murat", "Kemal", "Emre", "Burak", "Serkan", "Cem",
		"Can", "Barış", "Umut", "Tolga", "Onur", "Kaan", "Deniz", "Mert",
		"Ayşe", "Fatma", "Emine", "Hatice", "Zeynep", "Elif", "Meryem", "Esra",
		"Sevgi", "Gül", "Aslı", "Derya", "Selin", "Burcu", "Pınar", "Gamze",
		"Nil", "Ceren", "Ece", "Naz", "İrem", "Begüm", "Tuğçe", "Merve",
	}
	lastNamesTR = []string{
		"Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Yıldırım", "Öztürk",
		"Aydın", "Özdemir", "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin", "Kara",
		"Koç", "Kurt", "Özkan", "Şimşek", "Polat", "Acar", "Korkmaz", "Özer",
		"Güneş", "Yavuz", "Erdoğan", "Taş", "Aksoy", "Bulut", "Tunç", "Aker",
	}
	departments = []struct {
		code string
		name string
	}{
		{"ENG", "Mühendislik"},
		{"SAL", "Satış"},
		{"OPS", "Operasyon"},
		{"HR", "İnsan Kaynakları"},
	}
	positions = map[string][]string{
		"ENG": {"Kıdemli Yazılım Mühendisi", "Yazılım Mühendisi", "Frontend Geliştirici", "DevOps Mühendisi", "Data Mühendisi", "Takım Lideri"},
		"SAL": {"Satış Müdürü", "Kıdemli Satış Temsilcisi", "Satış Temsilcisi", "KAM", "Satış Direktörü"},
		"OPS": {"Operasyon Uzmanı", "Proje Yöneticisi", "Süreç Uzmanı", "Operasyon Müdürü", "Lojistik Uzmanı"},
		"HR":  {"İK Uzmanı", "İK Müdürü", "Bordro Uzmanı", "İşe Alım Uzmanı"},
	}
	interventionCatalog = []struct {
		code  string
		title string
	}{
		{"JCS-EXP", "İş Kaynağı Artırma Atölyesi"},
		{"MIND-8W", "Mindfulness 8 Hafta Programı"},
		{"CBT-STR", "Bilişsel Davranışçı Stres Yönetimi"},
		{"PEER-SUP", "Eş Destek Gruplari"},
		{"SLEEP-COACH", "Uyku Hijyeni Koçluğu"},
		{"MGR-TRN", "Yönetici Destekleyici Liderlik Eğitimi"},
		{"REC-ENV", "Fiziksel Çalışma Ortamı İyileştirme"},
		{"FLEX-SCH", "Esnek Çalışma Düzenlemesi"},
		{"BOUN-WKS", "Sınır Koyma Atölyesi"},
		{"EAP-REF", "Çalışan Destek Programı Yönlendirmesi"},
	}
	okrSamples = []struct {
		objective string
		kr1, kr2  string
	}{
		{"Müşteri Net Destek Skorunu Yükselt", "NPS 42 → 55", "Müşteri yanıt süresi 18s → 8s"},
		{"Ürün İşlem Süresini Kısalt", "P95 latency 800ms → 250ms", "Hata oranı %2.1 → %0.5"},
		{"Saha Güvenlik Skorunu İyileştir", "İş kazası sıklığı 3.2 → 1.0", "Yakın-kaza bildirim sayısı 10 → 40"},
		{"İşveren Marka Gücünü Artır", "LinkedIn takipçi 12K → 25K", "Başvuru/ilan oranı 25 → 45"},
		{"Satış Pipeline Sağlığını Güçlendir", "Pipeline değeri 8M → 15M TL", "Kazanma oranı %18 → %28"},
		{"Çalışan Bağlılık Endeksini Yükselt", "BAT-TR orta-risk %24 → %12", "UWES-9 skor 4.1 → 4.7"},
		{"Yazılım Teslim Hızını Artır", "Dağıtım sıklığı haftalık 2 → 10", "Change failure %18 → %5"},
		{"Operasyonel Maliyet Azalt", "Birim maliyet 112₺ → 85₺", "Atık oranı %7 → %3"},
		{"Öğrenme Kültürünü Yaygınlaştır", "Kurs tamamlama %34 → %80", "Mentörlük eşleşme 20 → 60"},
		{"Bilim Temelli Ürün Demosu", "Yayın sayısı 2 → 6", "Blog aylık ziyaret 4K → 20K"},
		{"İçe Alma (Retention) Güçlendir", "Yıllık istifa %18 → %11", "İlk yıl kalma %68 → %85"},
		{"Kadın Liderlik Oranı", "Direktör+ kadın %22 → %35", "Liderlik eğitim alan kadın 10 → 30"},
	}
	jobPostings = []struct {
		title  string
		deptCd string
	}{
		{"Kıdemli Ürün Mühendisi", "ENG"},
		{"Kurumsal Satış Direktörü", "SAL"},
		{"Süreç İyileştirme Lideri", "OPS"},
	}
)

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

func main() {
	if err := run(context.Background()); err != nil {
		log.Fatalf("seed-demo failed: %v", err)
	}
	fmt.Println("seed-demo completed successfully.")
}

func run(ctx context.Context) error {
	if err := guardEnv(); err != nil {
		return err
	}

	dsn := os.Getenv("DATABASE_URL")
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		return fmt.Errorf("db connect: %w", err)
	}
	defer conn.Close(ctx)

	if _, err := conn.Exec(ctx, "SET search_path TO app, public"); err != nil {
		return fmt.Errorf("set search_path: %w", err)
	}

	// Detect RLS availability — some dev DBs may skip RLS.
	_, _ = conn.Exec(ctx, fmt.Sprintf("SELECT set_config('app.tenant_id', '%s', false)", demoTenantID))

	log.Printf("resetting existing demo data for tenant=%s", demoTenantID)
	if err := clearDemoData(ctx, conn); err != nil {
		return fmt.Errorf("clear demo data: %w", err)
	}

	rng := mrand.New(mrand.NewPCG(rngSeed1, rngSeed2))

	log.Printf("seeding tenant")
	if err := seedTenant(ctx, conn); err != nil {
		return fmt.Errorf("tenant: %w", err)
	}

	log.Printf("seeding departments + positions")
	deptIDs, err := seedDepartments(ctx, conn)
	if err != nil {
		return fmt.Errorf("departments: %w", err)
	}

	log.Printf("seeding %d employees", targetEmployees)
	empIDs, err := seedEmployees(ctx, conn, rng, deptIDs)
	if err != nil {
		return fmt.Errorf("employees: %w", err)
	}

	log.Printf("seeding %d weeks of pulse data", pulseWeeks)
	if err := seedPulseData(ctx, conn, rng, empIDs); err != nil {
		return fmt.Errorf("pulse: %w", err)
	}

	log.Printf("seeding %d OKRs", targetOKRs)
	if err := seedOKRs(ctx, conn, rng, empIDs); err != nil {
		return fmt.Errorf("okrs: %w", err)
	}

	log.Printf("seeding %d interventions", targetInterventions)
	if err := seedInterventions(ctx, conn, rng, empIDs); err != nil {
		return fmt.Errorf("interventions: %w", err)
	}

	log.Printf("seeding %d job postings + applications", targetJobPostings)
	if err := seedJobPostings(ctx, conn, rng, empIDs, deptIDs); err != nil {
		return fmt.Errorf("postings: %w", err)
	}

	log.Printf("seeding 9-box calibration for %d employees", targetNineBox)
	if err := seedNineBox(ctx, conn, rng, empIDs); err != nil {
		return fmt.Errorf("ninebox: %w", err)
	}

	return nil
}

// ---------------------------------------------------------------------------
// Env guard: refuse production targets
// ---------------------------------------------------------------------------

func guardEnv() error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return fmt.Errorf("DATABASE_URL must be set")
	}

	if os.Getenv("DEMO_SEED_ALLOW") != "1" {
		return fmt.Errorf("refusing to run: DEMO_SEED_ALLOW=1 must be set explicitly")
	}

	u, err := url.Parse(dsn)
	if err != nil {
		return fmt.Errorf("invalid DATABASE_URL: %w", err)
	}

	host := strings.ToLower(u.Host)
	prodMarkers := []string{"upcore.io", ".azure.com", "rds.amazonaws.com", "prod", "production"}
	for _, m := range prodMarkers {
		if strings.Contains(host, m) {
			return fmt.Errorf("refusing to seed: host %q matches production marker %q", host, m)
		}
	}

	lowerDSN := strings.ToLower(dsn)
	if !strings.Contains(lowerDSN, "dev") && !strings.Contains(lowerDSN, "demo") && !strings.Contains(lowerDSN, "test") && !strings.Contains(lowerDSN, "localhost") && !strings.Contains(lowerDSN, "127.0.0.1") {
		return fmt.Errorf("refusing to seed: DATABASE_URL must contain dev/demo/test/localhost marker")
	}

	return nil
}

// ---------------------------------------------------------------------------
// Clear previous demo data (idempotent)
// ---------------------------------------------------------------------------

func clearDemoData(ctx context.Context, conn *pgx.Conn) error {
	// Child tables first; use ON CONFLICT-compatible deletes where possible.
	stmts := []string{
		`DELETE FROM app.nine_box_calibrations WHERE tenant_id = $1`,
		`DELETE FROM app.intervention_plans WHERE tenant_id = $1`,
		`DELETE FROM app.burnout_signals WHERE tenant_id = $1`,
		`DELETE FROM app.okr_key_results WHERE objective_id IN (SELECT id FROM app.okr_objectives WHERE tenant_id = $1)`,
		`DELETE FROM app.okr_objectives WHERE tenant_id = $1`,
		`DELETE FROM app.applications WHERE tenant_id = $1`,
		`DELETE FROM app.job_postings WHERE tenant_id = $1`,
		`DELETE FROM app.survey_responses WHERE tenant_id = $1`,
		`DELETE FROM app.survey_campaigns WHERE tenant_id = $1`,
		`DELETE FROM app.employees WHERE tenant_id = $1`,
		`DELETE FROM app.positions WHERE tenant_id = $1`,
		`DELETE FROM app.departments WHERE tenant_id = $1`,
		`DELETE FROM app.tenants WHERE id = $1`,
	}
	for _, q := range stmts {
		// Ignore "relation does not exist" — migrations might vary.
		if _, err := conn.Exec(ctx, q, demoTenantID); err != nil {
			if strings.Contains(err.Error(), "does not exist") {
				continue
			}
			log.Printf("  (warn) clear step skipped: %v", err)
		}
	}
	return nil
}

// ---------------------------------------------------------------------------
// Seed: tenant
// ---------------------------------------------------------------------------

func seedTenant(ctx context.Context, conn *pgx.Conn) error {
	_, err := conn.Exec(ctx, `
		INSERT INTO app.tenants (id, name, slug, status, locale, sector, employee_count, created_at)
		VALUES ($1, $2, $3, 'active', 'tr-TR', 'teknoloji', $4, NOW() - INTERVAL '9 months')
		ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active'
	`, demoTenantID, demoTenantName, demoTenantSlug, targetEmployees)
	return err
}

// ---------------------------------------------------------------------------
// Seed: departments
// ---------------------------------------------------------------------------

func seedDepartments(ctx context.Context, conn *pgx.Conn) (map[string]string, error) {
	ids := make(map[string]string, len(departments))
	for i, d := range departments {
		id := fmt.Sprintf("00000000-0000-0000-0000-00000000d%03d", 100+i)
		_, err := conn.Exec(ctx, `
			INSERT INTO app.departments (id, tenant_id, code, name_tr, description_tr, is_active)
			VALUES ($1, $2, $3, $4, $5, TRUE)
			ON CONFLICT (id) DO UPDATE SET name_tr = EXCLUDED.name_tr
		`, id, demoTenantID, d.code, d.name, d.name+" ekibi")
		if err != nil {
			return nil, err
		}
		ids[d.code] = id
	}
	return ids, nil
}

// ---------------------------------------------------------------------------
// Seed: employees (120)
// ---------------------------------------------------------------------------

func seedEmployees(ctx context.Context, conn *pgx.Conn, rng *mrand.Rand, deptIDs map[string]string) ([]string, error) {
	empIDs := make([]string, 0, targetEmployees)
	deptCodes := []string{"ENG", "SAL", "OPS", "HR"}
	deptWeights := []int{55, 28, 25, 12} // sums to 120

	i := 0
	for di, code := range deptCodes {
		count := deptWeights[di]
		positionsForDept := positions[code]
		for k := 0; k < count; k++ {
			id := deterministicUUID(fmt.Sprintf("emp-%d", i))
			first := firstNamesTR[rng.IntN(len(firstNamesTR))]
			last := lastNamesTR[rng.IntN(len(lastNamesTR))]
			title := positionsForDept[rng.IntN(len(positionsForDept))]
			email := fmt.Sprintf("%s.%s%d@demo.upcore.dev",
				toASCIILower(first), toASCIILower(last), i+1)
			hireOffset := rng.IntN(1800) + 30 // 1–5 yıl
			_, err := conn.Exec(ctx, `
				INSERT INTO app.employees (
					id, tenant_id, department_id, first_name, last_name,
					email, job_title, hire_date, employment_status, created_at
				) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - make_interval(days => $8), 'active', NOW() - make_interval(days => $8))
				ON CONFLICT (id) DO NOTHING
			`, id, demoTenantID, deptIDs[code], first, last, email, title, hireOffset)
			if err != nil {
				return nil, fmt.Errorf("emp %s: %w", id, err)
			}
			empIDs = append(empIDs, id)
			i++
		}
	}
	return empIDs, nil
}

// ---------------------------------------------------------------------------
// Seed: 6 weeks of pulse data (1 red band for manager A — ENG)
// ---------------------------------------------------------------------------

func seedPulseData(ctx context.Context, conn *pgx.Conn, rng *mrand.Rand, empIDs []string) error {
	// Create 6 weekly campaigns.
	for w := 0; w < pulseWeeks; w++ {
		cid := deterministicUUID(fmt.Sprintf("pulse-%d", w))
		// Some deployments name the table survey_campaigns, others surveys.
		_, err := conn.Exec(ctx, `
			INSERT INTO app.survey_campaigns (id, tenant_id, title, kind, status, started_at, ended_at)
			VALUES ($1, $2, $3, 'pulse', 'closed',
				NOW() - make_interval(weeks => $4), NOW() - make_interval(weeks => $4) + INTERVAL '5 days')
			ON CONFLICT (id) DO NOTHING
		`, cid, demoTenantID, fmt.Sprintf("Haftalık Nabız — W-%d", pulseWeeks-w), pulseWeeks-w)
		if err != nil && !strings.Contains(err.Error(), "does not exist") {
			return err
		}
	}

	// Per-employee weekly burnout signal score (BAT-TR 1-5).
	for i, empID := range empIDs {
		isRedBand := i < 12 // first 12 of ENG = "manager A team"
		for w := 0; w < pulseWeeks; w++ {
			weeksAgo := pulseWeeks - w
			base := 2.1 + rng.Float64()*0.6
			if isRedBand && w >= 3 {
				// Trend up after week 3 → red band
				base = 3.4 + float64(w-3)*0.25 + rng.Float64()*0.2
			}
			score := math.Min(5.0, math.Max(1.0, base))
			severity := "low"
			switch {
			case score >= 3.5:
				severity = "high"
			case score >= 2.8:
				severity = "medium"
			}
			_, err := conn.Exec(ctx, `
				INSERT INTO app.burnout_signals (id, tenant_id, employee_id, score, severity, captured_at)
				VALUES ($1, $2, $3, $4, $5, NOW() - make_interval(weeks => $6))
				ON CONFLICT (id) DO NOTHING
			`, deterministicUUID(fmt.Sprintf("bs-%s-%d", empID, w)),
				demoTenantID, empID, score, severity, weeksAgo)
			if err != nil && !strings.Contains(err.Error(), "does not exist") {
				return err
			}
		}
	}
	return nil
}

// ---------------------------------------------------------------------------
// Seed: 12 OKRs (8 aktif, 4 kapanmış)
// ---------------------------------------------------------------------------

func seedOKRs(ctx context.Context, conn *pgx.Conn, rng *mrand.Rand, empIDs []string) error {
	for i, okr := range okrSamples {
		oid := deterministicUUID(fmt.Sprintf("okr-%d", i))
		owner := empIDs[rng.IntN(len(empIDs))]
		status := "active"
		if i >= 8 {
			status = "completed"
		}
		progress := 0.25 + rng.Float64()*0.6
		if status == "completed" {
			progress = 1.0
		}
		_, err := conn.Exec(ctx, `
			INSERT INTO app.okr_objectives (id, tenant_id, owner_employee_id, title, status, progress, period, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, '2026-Q2', NOW() - INTERVAL '60 days')
			ON CONFLICT (id) DO NOTHING
		`, oid, demoTenantID, owner, okr.objective, status, progress)
		if err != nil && !strings.Contains(err.Error(), "does not exist") {
			return err
		}

		for k, krTitle := range []string{okr.kr1, okr.kr2} {
			krID := deterministicUUID(fmt.Sprintf("okr-%d-kr-%d", i, k))
			_, err := conn.Exec(ctx, `
				INSERT INTO app.okr_key_results (id, objective_id, title, target, current_value, unit)
				VALUES ($1, $2, $3, 100, $4, '%')
				ON CONFLICT (id) DO NOTHING
			`, krID, oid, krTitle, int(progress*100))
			if err != nil && !strings.Contains(err.Error(), "does not exist") {
				return err
			}
		}
	}
	return nil
}

// ---------------------------------------------------------------------------
// Seed: interventions (20 aktif, farklı haftalarda)
// ---------------------------------------------------------------------------

func seedInterventions(ctx context.Context, conn *pgx.Conn, rng *mrand.Rand, empIDs []string) error {
	for i := 0; i < targetInterventions; i++ {
		intID := deterministicUUID(fmt.Sprintf("int-%d", i))
		emp := empIDs[rng.IntN(len(empIDs))]
		cat := interventionCatalog[i%len(interventionCatalog)]
		weeksInProg := (i % 12) + 1
		status := "active"
		if weeksInProg >= 8 {
			status = "completed"
		}
		_, err := conn.Exec(ctx, `
			INSERT INTO app.intervention_plans (
				id, tenant_id, employee_id, catalog_code, title, status,
				started_at, expected_duration_weeks, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, NOW() - make_interval(weeks => $7), 8, NOW() - make_interval(weeks => $7))
			ON CONFLICT (id) DO NOTHING
		`, intID, demoTenantID, emp, cat.code, cat.title, status, weeksInProg)
		if err != nil && !strings.Contains(err.Error(), "does not exist") {
			return err
		}
	}
	return nil
}

// ---------------------------------------------------------------------------
// Seed: 3 open job postings + 5 applications
// ---------------------------------------------------------------------------

func seedJobPostings(ctx context.Context, conn *pgx.Conn, rng *mrand.Rand, empIDs []string, deptIDs map[string]string) error {
	for i, jp := range jobPostings {
		pid := deterministicUUID(fmt.Sprintf("job-%d", i))
		_, err := conn.Exec(ctx, `
			INSERT INTO app.job_postings (id, tenant_id, department_id, title, status, posted_at)
			VALUES ($1, $2, $3, $4, 'open', NOW() - make_interval(days => $5))
			ON CONFLICT (id) DO NOTHING
		`, pid, demoTenantID, deptIDs[jp.deptCd], jp.title, 14-i*3)
		if err != nil && !strings.Contains(err.Error(), "does not exist") {
			return err
		}

		// Applications
		numApps := targetApplications - i // 5,4,3
		if numApps < 1 {
			numApps = 1
		}
		for a := 0; a < numApps; a++ {
			aid := deterministicUUID(fmt.Sprintf("app-%d-%d", i, a))
			emp := empIDs[rng.IntN(len(empIDs))]
			stage := []string{"applied", "screening", "interview", "offer"}[rng.IntN(4)]
			_, err := conn.Exec(ctx, `
				INSERT INTO app.applications (id, tenant_id, job_posting_id, applicant_employee_id, stage, applied_at)
				VALUES ($1, $2, $3, $4, $5, NOW() - make_interval(days => $6))
				ON CONFLICT (id) DO NOTHING
			`, aid, demoTenantID, pid, emp, stage, rng.IntN(10)+1)
			if err != nil && !strings.Contains(err.Error(), "does not exist") {
				return err
			}
		}
	}
	return nil
}

// ---------------------------------------------------------------------------
// Seed: 9-box calibration for 20 employees
// ---------------------------------------------------------------------------

func seedNineBox(ctx context.Context, conn *pgx.Conn, rng *mrand.Rand, empIDs []string) error {
	// 20 kalibre çalışan — performance(1-3), potential(1-3) dağılımı
	for i := 0; i < targetNineBox && i < len(empIDs); i++ {
		nbid := deterministicUUID(fmt.Sprintf("nb-%d", i))
		emp := empIDs[i]
		perf := (i % 3) + 1
		pot := ((i + rng.IntN(2)) % 3) + 1
		_, err := conn.Exec(ctx, `
			INSERT INTO app.nine_box_calibrations (
				id, tenant_id, employee_id, performance_level, potential_level, calibrated_at
			) VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '10 days')
			ON CONFLICT (id) DO NOTHING
		`, nbid, demoTenantID, emp, perf, pot)
		if err != nil && !strings.Contains(err.Error(), "does not exist") {
			return err
		}
	}
	return nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func deterministicUUID(seed string) string {
	h := sha256.Sum256([]byte(seed))
	b := h[:16]
	// RFC-4122 v4
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	hx := hex.EncodeToString(b)
	return fmt.Sprintf("%s-%s-%s-%s-%s", hx[0:8], hx[8:12], hx[12:16], hx[16:20], hx[20:32])
}

// toASCIILower lowercases a Turkish name while replacing İ,ı,Ş,ş,Ğ,ğ,Ü,ü,Ö,ö,Ç,ç
// with ASCII equivalents for email-safe output.
func toASCIILower(s string) string {
	r := strings.NewReplacer(
		"İ", "i", "ı", "i",
		"Ş", "s", "ş", "s",
		"Ğ", "g", "ğ", "g",
		"Ü", "u", "ü", "u",
		"Ö", "o", "ö", "o",
		"Ç", "c", "ç", "c",
	)
	return strings.ToLower(r.Replace(s))
}

