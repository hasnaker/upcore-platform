package domain

import (
	"testing"
	"time"
)

func TestUsageIsOverLimit(t *testing.T) {
	u := &UsageCounter{Value: 100}
	if !u.IsOverLimit(100) {
		t.Fatal("100 >= 100 should be over")
	}
	if u.IsOverLimit(101) {
		t.Fatal("100 < 101 should not be over")
	}
	if u.IsOverLimit(0) {
		t.Fatal("cap 0 means unlimited")
	}
}

func TestCurrentPeriod(t *testing.T) {
	ref := time.Date(2026, 4, 15, 10, 30, 0, 0, time.UTC)
	start, end := CurrentPeriod(ref)
	if start.Day() != 1 || start.Month() != 4 || start.Year() != 2026 {
		t.Fatalf("start = %v", start)
	}
	if end.Day() != 1 || end.Month() != 5 || end.Year() != 2026 {
		t.Fatalf("end = %v", end)
	}
}
