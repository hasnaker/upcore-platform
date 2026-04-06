package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestEmployee_Age(t *testing.T) {
	birth := time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC)
	e := &Employee{DogumTarihi: &birth}
	age := e.Age()
	// Age depends on the current date; just sanity-check it's in a reasonable
	// range (since this will run well after 1990).
	assert.Greater(t, age, 30)
	assert.Less(t, age, 120)
}

func TestEmployee_Age_NoDOB(t *testing.T) {
	e := &Employee{}
	assert.Equal(t, 0, e.Age())
}

func TestEmployee_TenureDays(t *testing.T) {
	hire := time.Now().UTC().AddDate(-2, 0, 0)
	e := &Employee{HireDate: hire}
	assert.GreaterOrEqual(t, e.TenureDays(), 700)
	assert.LessOrEqual(t, e.TenureDays(), 760)
}

func TestEmployee_TenureDays_Terminated(t *testing.T) {
	hire := time.Now().UTC().AddDate(-3, 0, 0)
	term := hire.AddDate(1, 0, 0)
	e := &Employee{HireDate: hire, TerminationDate: &term}
	assert.InDelta(t, 365, e.TenureDays(), 2)
}

func TestEmployee_IsActive(t *testing.T) {
	e := &Employee{EmploymentStatus: StatusActive}
	assert.True(t, e.IsActive())
	e.EmploymentStatus = StatusOnLeave
	assert.True(t, e.IsActive())
	e.EmploymentStatus = StatusTerminated
	assert.False(t, e.IsActive())
}

func TestEmployee_ApplyDefaults(t *testing.T) {
	e := &Employee{}
	e.ApplyDefaults()
	assert.Equal(t, StatusActive, e.EmploymentStatus)
	assert.Equal(t, TypeFullTime, e.EmploymentType)
	assert.Equal(t, "TRY", e.SalaryCurrency)
	assert.NotNil(t, e.Ulke)
	assert.Equal(t, "TR", *e.Ulke)
	assert.Equal(t, JSONB("{}"), e.Metadata)
}

func TestGenerateEmployeeNo(t *testing.T) {
	assert.Equal(t, "EMP000001", GenerateEmployeeNo(1))
	assert.Equal(t, "EMP000042", GenerateEmployeeNo(42))
	assert.Equal(t, "EMP999999", GenerateEmployeeNo(999999))
}

func TestEmployee_FullName(t *testing.T) {
	e := &Employee{Ad: "Ayşe", Soyad: "Yılmaz"}
	assert.Equal(t, "Ayşe Yılmaz", e.FullName())
}

func TestEmployee_Mask(t *testing.T) {
	tckn := "12345678950"
	iban := "TR330006100519786457841326"
	e := &Employee{TCKN: &tckn, BankIBAN: &iban}
	m := e.Mask()
	assert.Nil(t, m.TCKN)
	assert.Nil(t, m.BankIBAN)
	// Original unchanged.
	assert.NotNil(t, e.TCKN)
}

func TestCanTransition(t *testing.T) {
	cases := []struct {
		from, to EmploymentStatus
		ok       bool
	}{
		{StatusActive, StatusOnLeave, true},
		{StatusActive, StatusTerminated, true},
		{StatusActive, StatusActive, false},
		{StatusOnLeave, StatusActive, true},
		{StatusTerminated, StatusActive, true},
		{StatusTerminated, StatusTerminated, false},
		{StatusRetired, StatusActive, false},
	}
	for _, c := range cases {
		t.Run(string(c.from)+"->"+string(c.to), func(t *testing.T) {
			assert.Equal(t, c.ok, CanTransition(c.from, c.to))
		})
	}
}

func TestJSONB_ValueScan(t *testing.T) {
	j := JSONB(`{"foo":"bar"}`)
	v, err := j.Value()
	assert.NoError(t, err)
	b, _ := v.([]byte)
	assert.Equal(t, `{"foo":"bar"}`, string(b))

	var out JSONB
	assert.NoError(t, out.Scan([]byte(`{"x":1}`)))
	assert.Equal(t, `{"x":1}`, string(out))

	assert.NoError(t, out.Scan(nil))
	assert.Equal(t, `{}`, string(out))
}

func TestJSONB_InvalidValue(t *testing.T) {
	j := JSONB(`{bad`)
	_, err := j.Value()
	assert.Error(t, err)
}
