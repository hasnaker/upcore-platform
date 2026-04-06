package service

import (
	"bytes"
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/employee/internal/domain"
	"github.com/upcore/employee/internal/event"
	"github.com/upcore/employee/internal/repository"
)

func newTestService(t *testing.T) (*EmployeeService, *repository.FakeEmployeeRepo, *repository.FakeHistoryRepo, *event.InMemoryPublisher) {
	t.Helper()
	empRepo := repository.NewFakeEmployeeRepo()
	histRepo := repository.NewFakeHistoryRepo()
	pub := event.NewInMemoryPublisher()
	logger := zerolog.Nop()
	svc := NewEmployeeService(empRepo, histRepo, pub, logger)
	return svc, empRepo, histRepo, pub
}

func TestEmployeeService_Create_Success(t *testing.T) {
	ctx := context.Background()
	svc, _, _, pub := newTestService(t)
	tenantID := uuid.New()
	req := CreateEmployeeRequest{
		EmployeeNo: "EMP001",
		Ad:         "Ayşe",
		Soyad:      "Yılmaz",
		HireDate:   "2020-01-15",
		TCKN:       "12345678950",
		EmailIs:    "ayse@acme.com",
	}
	e, err := svc.Create(ctx, tenantID, uuid.New(), req)
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, e.ID)
	assert.Equal(t, "EMP001", e.EmployeeNo)
	assert.Equal(t, domain.StatusActive, e.EmploymentStatus)
	assert.Equal(t, 1, pub.Count(event.TopicEmployeeCreated))
}

func TestEmployeeService_Create_InvalidTCKN(t *testing.T) {
	ctx := context.Background()
	svc, _, _, _ := newTestService(t)
	req := CreateEmployeeRequest{
		EmployeeNo: "EMP001",
		Ad:         "Ayşe",
		Soyad:      "Yılmaz",
		HireDate:   "2020-01-15",
		TCKN:       "00000000000",
	}
	_, err := svc.Create(ctx, uuid.New(), uuid.Nil, req)
	require.Error(t, err)
	assert.IsType(t, &domain.ValidationError{}, err)
}

func TestEmployeeService_Create_AutoGenerateEmpNo(t *testing.T) {
	ctx := context.Background()
	svc, _, _, _ := newTestService(t)
	req := CreateEmployeeRequest{
		Ad:       "Mehmet",
		Soyad:    "Demir",
		HireDate: "2021-06-01",
	}
	e, err := svc.Create(ctx, uuid.New(), uuid.Nil, req)
	require.NoError(t, err)
	assert.NotEmpty(t, e.EmployeeNo)
	assert.Contains(t, e.EmployeeNo, "EMP")
}

func TestEmployeeService_Update_ChangesPublish(t *testing.T) {
	ctx := context.Background()
	svc, _, _, pub := newTestService(t)
	tenantID := uuid.New()
	e, err := svc.Create(ctx, tenantID, uuid.Nil, CreateEmployeeRequest{
		EmployeeNo: "EMP001", Ad: "A", Soyad: "B", HireDate: "2020-01-01",
	})
	require.NoError(t, err)

	newAd := "Ayşe"
	_, err = svc.Update(ctx, tenantID, e.ID, UpdateEmployeeRequest{Ad: &newAd})
	require.NoError(t, err)
	assert.Equal(t, 1, pub.Count(event.TopicEmployeeUpdated))
}

func TestEmployeeService_Terminate(t *testing.T) {
	ctx := context.Background()
	svc, _, hist, pub := newTestService(t)
	tenantID := uuid.New()
	e, err := svc.Create(ctx, tenantID, uuid.Nil, CreateEmployeeRequest{
		EmployeeNo: "EMP001", Ad: "A", Soyad: "B", HireDate: "2020-01-01",
	})
	require.NoError(t, err)

	_, err = svc.Terminate(ctx, tenantID, e.ID, uuid.Nil, TerminateRequest{
		TerminationDate: "2023-06-30",
		Reason:          "istifa",
	})
	require.NoError(t, err)
	assert.Equal(t, 1, pub.Count(event.TopicEmployeeTerminated))

	got, err := svc.Get(ctx, tenantID, e.ID)
	require.NoError(t, err)
	assert.Equal(t, domain.StatusTerminated, got.EmploymentStatus)
	assert.NotNil(t, got.TerminationDate)

	// Double terminate should fail.
	_, err = svc.Terminate(ctx, tenantID, e.ID, uuid.Nil, TerminateRequest{
		TerminationDate: "2023-07-01",
	})
	assert.ErrorIs(t, err, domain.ErrAlreadyTerminated)

	// History should contain at least 2 entries (hire + terminate).
	entries, total, err := hist.ListByEmployee(ctx, e.ID, 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total, 2)
	assert.GreaterOrEqual(t, len(entries), 2)
}

func TestEmployeeService_Terminate_BadDate(t *testing.T) {
	ctx := context.Background()
	svc, _, _, _ := newTestService(t)
	tenantID := uuid.New()
	e, err := svc.Create(ctx, tenantID, uuid.Nil, CreateEmployeeRequest{
		EmployeeNo: "EMP001", Ad: "A", Soyad: "B", HireDate: "2020-01-01",
	})
	require.NoError(t, err)
	_, err = svc.Terminate(ctx, tenantID, e.ID, uuid.Nil, TerminateRequest{TerminationDate: "2019-01-01"})
	assert.ErrorIs(t, err, domain.ErrTerminationDate)
}

func TestEmployeeService_Reinstate(t *testing.T) {
	ctx := context.Background()
	svc, _, _, _ := newTestService(t)
	tenantID := uuid.New()
	e, err := svc.Create(ctx, tenantID, uuid.Nil, CreateEmployeeRequest{
		EmployeeNo: "EMP001", Ad: "A", Soyad: "B", HireDate: "2020-01-01",
	})
	require.NoError(t, err)
	_, err = svc.Terminate(ctx, tenantID, e.ID, uuid.Nil, TerminateRequest{TerminationDate: "2023-06-30"})
	require.NoError(t, err)

	r, err := svc.Reinstate(ctx, tenantID, e.ID)
	require.NoError(t, err)
	assert.Equal(t, domain.StatusActive, r.EmploymentStatus)
	assert.Nil(t, r.TerminationDate)
}

func TestEmployeeService_ManagerCycle(t *testing.T) {
	ctx := context.Background()
	svc, _, _, _ := newTestService(t)
	tenantID := uuid.New()
	a, _ := svc.Create(ctx, tenantID, uuid.Nil, CreateEmployeeRequest{
		EmployeeNo: "EMP001", Ad: "A", Soyad: "B", HireDate: "2020-01-01",
	})
	b, _ := svc.Create(ctx, tenantID, uuid.Nil, CreateEmployeeRequest{
		EmployeeNo: "EMP002", Ad: "C", Soyad: "D", HireDate: "2020-01-01",
		ManagerID:  &a.ID,
	})
	// Now try to make A's manager = B => cycle.
	_, err := svc.Update(ctx, tenantID, a.ID, UpdateEmployeeRequest{ManagerID: &b.ID})
	assert.ErrorIs(t, err, domain.ErrManagerCycle)
}

func TestEmployeeService_Delete(t *testing.T) {
	ctx := context.Background()
	svc, _, _, pub := newTestService(t)
	tenantID := uuid.New()
	e, err := svc.Create(ctx, tenantID, uuid.Nil, CreateEmployeeRequest{
		EmployeeNo: "EMP001", Ad: "A", Soyad: "B", HireDate: "2020-01-01",
	})
	require.NoError(t, err)
	require.NoError(t, svc.Delete(ctx, tenantID, e.ID))
	_, err = svc.Get(ctx, tenantID, e.ID)
	assert.ErrorIs(t, err, domain.ErrEmployeeNotFound)
	assert.Equal(t, 1, pub.Count(event.TopicEmployeeDeleted))
}

func TestImportService_HappyPath(t *testing.T) {
	ctx := context.Background()
	empRepo := repository.NewFakeEmployeeRepo()
	histRepo := repository.NewFakeHistoryRepo()
	pub := event.NewInMemoryPublisher()
	svc := NewImportService(empRepo, histRepo, pub, 1000, 100, zerolog.Nop())

	csv := "sicil_no,ad,soyad,email,tckn,dogum_tarihi,ise_baslama_tarihi,departman,pozisyon,yonetici_email\n" +
		"EMP001,Ayşe,Yılmaz,ayse@acme.com,12345678950,1985-03-15,2020-01-15,Pazarlama,Uzman,\n" +
		"EMP002,Mehmet,Demir,mehmet@acme.com,,1990-05-20,2021-06-01,Satış,Uzman,\n"
	res, err := svc.ImportCSV(ctx, uuid.New(), uuid.Nil, bytes.NewBufferString(csv))
	require.NoError(t, err)
	assert.Equal(t, 2, res.Total)
	assert.Equal(t, 2, res.Imported)
	assert.Equal(t, 0, len(res.Errors))
	assert.Equal(t, 1, pub.Count(event.TopicEmployeeImportCompleted))
}

func TestImportService_RowErrors(t *testing.T) {
	ctx := context.Background()
	empRepo := repository.NewFakeEmployeeRepo()
	histRepo := repository.NewFakeHistoryRepo()
	pub := event.NewInMemoryPublisher()
	svc := NewImportService(empRepo, histRepo, pub, 1000, 100, zerolog.Nop())

	csv := "sicil_no,ad,soyad,email,tckn,dogum_tarihi,ise_baslama_tarihi,departman,pozisyon,yonetici_email\n" +
		"EMP001,Ayşe,Yılmaz,ayse@acme.com,00000000000,1985-03-15,2020-01-15,X,Y,\n" + // invalid tckn
		",,,x,,,,,,\n" // missing ad/soyad
	res, err := svc.ImportCSV(ctx, uuid.New(), uuid.Nil, bytes.NewBufferString(csv))
	require.NoError(t, err)
	assert.Equal(t, 2, res.Total)
	assert.Equal(t, 0, res.Imported)
	assert.Equal(t, 2, len(res.Errors))
}

func TestImportService_InvalidSchema(t *testing.T) {
	ctx := context.Background()
	empRepo := repository.NewFakeEmployeeRepo()
	histRepo := repository.NewFakeHistoryRepo()
	svc := NewImportService(empRepo, histRepo, event.NewInMemoryPublisher(), 1000, 100, zerolog.Nop())
	_, err := svc.ImportCSV(ctx, uuid.New(), uuid.Nil, bytes.NewBufferString("x,y,z\n1,2,3\n"))
	assert.ErrorIs(t, err, domain.ErrCSVInvalidSchema)
}

func TestSearchService(t *testing.T) {
	ctx := context.Background()
	empRepo := repository.NewFakeEmployeeRepo()
	tenantID := uuid.New()
	for _, name := range []struct{ no, ad, soyad string }{
		{"EMP001", "Ayşe", "Yılmaz"},
		{"EMP002", "Mehmet", "Demir"},
		{"EMP003", "Fatma", "Kaya"},
	} {
		email := name.no + "@acme.com"
		_ = empRepo.Create(ctx, nil, &domain.Employee{
			TenantID: tenantID, EmployeeNo: name.no, Ad: name.ad, Soyad: name.soyad,
			HireDate: mustDate("2020-01-01"), EmploymentStatus: domain.StatusActive,
			EmploymentType: domain.TypeFullTime, SalaryCurrency: "TRY", EmailIs: &email,
		})
	}
	svc := NewSearchService(empRepo)
	got, err := svc.Search(ctx, tenantID, "Mehmet", 10)
	require.NoError(t, err)
	assert.Len(t, got, 1)

	names, err := svc.Suggest(ctx, tenantID, "emp0")
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(names), 3)
}

func TestContactService_PrimaryEnforced(t *testing.T) {
	ctx := context.Background()
	empRepo := repository.NewFakeEmployeeRepo()
	ctRepo := repository.NewFakeContactRepo()
	tenantID := uuid.New()
	e := &domain.Employee{
		TenantID: tenantID, EmployeeNo: "EMP001", Ad: "A", Soyad: "B",
		HireDate: mustDate("2020-01-01"), EmploymentStatus: domain.StatusActive,
		EmploymentType: domain.TypeFullTime, SalaryCurrency: "TRY",
	}
	require.NoError(t, empRepo.Create(ctx, nil, e))
	svc := NewContactService(empRepo, ctRepo)

	_, err := svc.Create(ctx, tenantID, e.ID, ContactRequest{
		FullName: "Anne", PhonePrimary: "+905551111111", IsPrimary: true,
	})
	require.NoError(t, err)
	_, err = svc.Create(ctx, tenantID, e.ID, ContactRequest{
		FullName: "Baba", PhonePrimary: "+905552222222", IsPrimary: true,
	})
	require.NoError(t, err)

	list, err := svc.List(ctx, tenantID, e.ID)
	require.NoError(t, err)
	primaries := 0
	for _, c := range list {
		if c.IsPrimary {
			primaries++
		}
	}
	assert.Equal(t, 1, primaries)
}

func TestHistoryService_Append(t *testing.T) {
	ctx := context.Background()
	empRepo := repository.NewFakeEmployeeRepo()
	hRepo := repository.NewFakeHistoryRepo()
	pub := event.NewInMemoryPublisher()
	tenantID := uuid.New()
	e := &domain.Employee{
		TenantID: tenantID, EmployeeNo: "EMP001", Ad: "A", Soyad: "B",
		HireDate: mustDate("2020-01-01"), EmploymentStatus: domain.StatusActive,
		EmploymentType: domain.TypeFullTime, SalaryCurrency: "TRY",
	}
	require.NoError(t, empRepo.Create(ctx, nil, e))
	svc := NewHistoryService(empRepo, hRepo, pub)

	_, err := svc.Append(ctx, tenantID, e.ID, uuid.Nil, AppendRequest{
		ChangeType:    "promotion",
		EffectiveDate: "2022-01-01",
		Reason:        "Excellent performance",
	})
	require.NoError(t, err)
	assert.Equal(t, 1, pub.Count(event.TopicEmployeePositionChange))
}

// mustDate parses YYYY-MM-DD or panics. Used to keep test setup compact.
func mustDate(s string) time.Time {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		panic(err)
	}
	return t
}
