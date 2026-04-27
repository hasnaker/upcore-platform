package service

import (
	"context"
	"net"
	"testing"
	"time"
)

type fakeRepo struct {
	last      *LoginRecord
	known     bool
	failed    int
	recordErr error
}

func (f *fakeRepo) LastLogin(_ context.Context, _ string) (*LoginRecord, error) {
	return f.last, nil
}
func (f *fakeRepo) KnownDevice(_ context.Context, _, _ string, _ time.Time) (bool, error) {
	return f.known, nil
}
func (f *fakeRepo) CountFailed(_ context.Context, _ string, _ time.Time) (int, error) {
	return f.failed, nil
}
func (f *fakeRepo) RecordLogin(_ context.Context, _ LoginRecord) error {
	return f.recordErr
}

func TestEvaluateHappyPath(t *testing.T) {
	r := &fakeRepo{}
	c := NewSuspiciousLoginChecker(r)
	sev, reasons, err := c.Evaluate(context.Background(), LoginRecord{UserID: "u1", OccurredAt: time.Now()})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if sev != SeverityOK || len(reasons) != 0 {
		t.Fatalf("expected OK no reasons, got %s / %+v", sev, reasons)
	}
}

func TestImpossibleTravel(t *testing.T) {
	// Istanbul → NYC within 1 hour ⇒ not possible
	r := &fakeRepo{last: &LoginRecord{Latitude: 41.01, Longitude: 28.98, OccurredAt: time.Now().Add(-1 * time.Hour)}}
	c := NewSuspiciousLoginChecker(r)
	sev, reasons, _ := c.Evaluate(context.Background(), LoginRecord{
		UserID:     "u1",
		Latitude:   40.71, // NYC
		Longitude:  -74.00,
		IP:         net.ParseIP("1.2.3.4"),
		OccurredAt: time.Now(),
	})
	if sev != SeverityWarn {
		t.Fatalf("expected warn for impossible travel, got %s", sev)
	}
	if len(reasons) == 0 || reasons[0].Rule != "impossible-travel" {
		t.Fatalf("expected impossible-travel reason, got %+v", reasons)
	}
}

func TestNewDeviceAdmin(t *testing.T) {
	r := &fakeRepo{known: false}
	c := NewSuspiciousLoginChecker(r)
	sev, _, _ := c.Evaluate(context.Background(), LoginRecord{
		UserID:            "u1",
		IsAdmin:           true,
		DeviceFingerprint: "xyz",
		OccurredAt:        time.Now(),
	})
	if sev != SeverityWarn {
		t.Fatalf("expected warn for new device, got %s", sev)
	}
}

func TestBurstFailed(t *testing.T) {
	r := &fakeRepo{failed: 11}
	c := NewSuspiciousLoginChecker(r)
	sev, reasons, _ := c.Evaluate(context.Background(), LoginRecord{
		UserID:     "u1",
		OccurredAt: time.Now(),
	})
	if sev != SeverityBlock {
		t.Fatalf("expected block for failed burst, got %s", sev)
	}
	if len(reasons) == 0 || reasons[0].Rule != "burst-failed-attempts" {
		t.Fatalf("expected burst-failed-attempts reason, got %+v", reasons)
	}
}

func TestDeniedASN(t *testing.T) {
	r := &fakeRepo{}
	c := NewSuspiciousLoginChecker(r)
	c.DenyASN["AS13335"] = true
	sev, _, _ := c.Evaluate(context.Background(), LoginRecord{
		UserID:     "u1",
		ASN:        "AS13335",
		OccurredAt: time.Now(),
	})
	if sev != SeverityBlock {
		t.Fatalf("expected block for denied ASN, got %s", sev)
	}
}

func TestEscalateIsMonotonic(t *testing.T) {
	if escalate(SeverityBlock, SeverityWarn) != SeverityBlock {
		t.Fatal("escalate must not downgrade")
	}
	if escalate(SeverityOK, SeverityNotice) != SeverityNotice {
		t.Fatal("escalate must upgrade")
	}
}

func TestHaversineIstanbulNYC(t *testing.T) {
	km := haversine(41.01, 28.98, 40.71, -74.00)
	if km < 7000 || km > 9000 {
		t.Fatalf("expected ~8050km IST→JFK, got %.0f", km)
	}
}
