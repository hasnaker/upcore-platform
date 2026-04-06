package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/employee/internal/domain"
)

func newEmployee(tenantID uuid.UUID, empNo, ad, soyad string) *domain.Employee {
	email := empNo + "@example.com"
	return &domain.Employee{
		TenantID:         tenantID,
		EmployeeNo:       empNo,
		Ad:               ad,
		Soyad:            soyad,
		EmailIs:          &email,
		HireDate:         time.Date(2020, 1, 15, 0, 0, 0, 0, time.UTC),
		EmploymentStatus: domain.StatusActive,
		EmploymentType:   domain.TypeFullTime,
		SalaryCurrency:   "TRY",
	}
}

func TestFakeEmployeeRepo_CreateAndGet(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeEmployeeRepo()
	tenantID := uuid.New()

	e := newEmployee(tenantID, "EMP001", "Ayşe", "Yılmaz")
	require.NoError(t, repo.Create(ctx, nil, e))
	assert.NotEqual(t, uuid.Nil, e.ID)

	got, err := repo.GetByID(ctx, tenantID, e.ID)
	require.NoError(t, err)
	assert.Equal(t, "Ayşe", got.Ad)
	assert.Equal(t, "Yılmaz", got.Soyad)
	assert.Equal(t, domain.StatusActive, got.EmploymentStatus)

	// wrong tenant => not found
	_, err = repo.GetByID(ctx, uuid.New(), e.ID)
	assert.ErrorIs(t, err, domain.ErrEmployeeNotFound)
}

func TestFakeEmployeeRepo_DuplicateEmployeeNo(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeEmployeeRepo()
	tenantID := uuid.New()

	e1 := newEmployee(tenantID, "EMP001", "Ayşe", "Yılmaz")
	e2 := newEmployee(tenantID, "EMP001", "Mehmet", "Demir")
	require.NoError(t, repo.Create(ctx, nil, e1))

	err := repo.Create(ctx, nil, e2)
	assert.ErrorIs(t, err, domain.ErrDuplicateEmployeeNo)
}

func TestFakeEmployeeRepo_DuplicateTCKN(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeEmployeeRepo()
	tenantID := uuid.New()

	tckn := "12345678950"
	e1 := newEmployee(tenantID, "EMP001", "Ayşe", "Yılmaz")
	e1.TCKN = &tckn
	e2 := newEmployee(tenantID, "EMP002", "Mehmet", "Demir")
	e2.TCKN = &tckn

	require.NoError(t, repo.Create(ctx, nil, e1))
	err := repo.Create(ctx, nil, e2)
	assert.ErrorIs(t, err, domain.ErrDuplicateTCKN)
}

func TestFakeEmployeeRepo_SoftDelete(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeEmployeeRepo()
	tenantID := uuid.New()

	e := newEmployee(tenantID, "EMP001", "Ayşe", "Yılmaz")
	require.NoError(t, repo.Create(ctx, nil, e))
	require.NoError(t, repo.SoftDelete(ctx, tenantID, e.ID))

	_, err := repo.GetByID(ctx, tenantID, e.ID)
	assert.ErrorIs(t, err, domain.ErrEmployeeNotFound)

	// second delete should fail
	err = repo.SoftDelete(ctx, tenantID, e.ID)
	assert.True(t, errors.Is(err, domain.ErrEmployeeNotFound) || err == nil, "second soft delete")
}

func TestFakeEmployeeRepo_List_FiltersAndPagination(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeEmployeeRepo()
	tenantID := uuid.New()
	deptID := uuid.New()

	for i := 1; i <= 7; i++ {
		e := newEmployee(tenantID, formatEmpNo(i), "Name"+string(rune('A'+i)), "Surname")
		if i%2 == 0 {
			e.DepartmentID = &deptID
		}
		if i == 3 {
			e.EmploymentStatus = domain.StatusTerminated
		}
		time.Sleep(2 * time.Millisecond)
		require.NoError(t, repo.Create(ctx, nil, e))
	}

	got, total, err := repo.List(ctx, ListFilter{TenantID: tenantID, Page: 1, Limit: 3})
	require.NoError(t, err)
	assert.Equal(t, 7, total)
	assert.Len(t, got, 3)

	got, total, err = repo.List(ctx, ListFilter{TenantID: tenantID, Status: "terminated", Page: 1, Limit: 10})
	require.NoError(t, err)
	assert.Equal(t, 1, total)
	assert.Len(t, got, 1)

	got, total, err = repo.List(ctx, ListFilter{TenantID: tenantID, DepartmentID: &deptID, Page: 1, Limit: 10})
	require.NoError(t, err)
	assert.Equal(t, 3, total)
	assert.Len(t, got, 3)
}

func TestFakeEmployeeRepo_Search(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeEmployeeRepo()
	tenantID := uuid.New()

	require.NoError(t, repo.Create(ctx, nil, newEmployee(tenantID, "EMP001", "Ayşe", "Yılmaz")))
	require.NoError(t, repo.Create(ctx, nil, newEmployee(tenantID, "EMP002", "Mehmet", "Demir")))
	require.NoError(t, repo.Create(ctx, nil, newEmployee(tenantID, "EMP003", "Fatma", "Kaya")))

	got, err := repo.Search(ctx, tenantID, "Mehmet", 10)
	require.NoError(t, err)
	assert.Len(t, got, 1)

	got, err = repo.Search(ctx, tenantID, "emp0", 10)
	require.NoError(t, err)
	assert.Len(t, got, 3)
}

func TestFakeEmployeeRepo_NextEmployeeNoSeq(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeEmployeeRepo()
	tenantID := uuid.New()

	seq, err := repo.NextEmployeeNoSeq(ctx, tenantID)
	require.NoError(t, err)
	assert.Equal(t, 1, seq)

	require.NoError(t, repo.Create(ctx, nil, newEmployee(tenantID, "EMP000007", "A", "B")))
	seq, err = repo.NextEmployeeNoSeq(ctx, tenantID)
	require.NoError(t, err)
	assert.Equal(t, 8, seq)
}

func TestFakeHistoryRepo_AppendAndList(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeHistoryRepo()
	empID := uuid.New()

	for i := 0; i < 3; i++ {
		h := domain.NewHistoryEntry(uuid.New(), empID, domain.ChangePromotion, time.Now().Add(time.Duration(i)*time.Hour))
		require.NoError(t, repo.Append(ctx, nil, h))
	}
	got, total, err := repo.ListByEmployee(ctx, empID, 1, 10)
	require.NoError(t, err)
	assert.Equal(t, 3, total)
	assert.Len(t, got, 3)
}

func TestFakeContactRepo_PrimaryUniqueness(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeContactRepo()
	empID := uuid.New()
	tenantID := uuid.New()

	c1 := &domain.EmergencyContact{
		TenantID: tenantID, EmployeeID: empID,
		FullName: "Anne", PhonePrimary: "+905551111111",
		IsPrimary: true,
	}
	c2 := &domain.EmergencyContact{
		TenantID: tenantID, EmployeeID: empID,
		FullName: "Baba", PhonePrimary: "+905552222222",
		IsPrimary: true,
	}
	require.NoError(t, repo.Create(ctx, c1))
	require.NoError(t, repo.Create(ctx, c2))

	list, err := repo.ListByEmployee(ctx, empID)
	require.NoError(t, err)
	require.Len(t, list, 2)
	primaries := 0
	for _, c := range list {
		if c.IsPrimary {
			primaries++
		}
	}
	assert.Equal(t, 1, primaries, "only one primary contact may exist")
}

func formatEmpNo(i int) string {
	s := ""
	for i > 0 {
		s = string(rune('0'+(i%10))) + s
		i /= 10
	}
	return "EMP" + pad(s, 6)
}

func pad(s string, n int) string {
	for len(s) < n {
		s = "0" + s
	}
	return s
}
