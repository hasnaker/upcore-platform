package domain

import (
	"testing"

	"github.com/google/uuid"
)

func TestDetectCycleSelfManager(t *testing.T) {
	id := uuid.New()
	if !DetectCycle(nil, id, id) {
		t.Fatal("self-management should be a cycle")
	}
}

func TestDetectCycleChain(t *testing.T) {
	a := uuid.New()
	b := uuid.New()
	c := uuid.New()
	// a -> b -> c (c is top)
	lines := []ReportingLine{
		{EmployeeID: a, ManagerID: b, Type: LineSolid},
		{EmployeeID: b, ManagerID: c, Type: LineSolid},
	}
	// Making c report to a would create cycle: a->b->c->a
	if !DetectCycle(lines, c, a) {
		t.Fatal("expected cycle")
	}
	// Assigning a new employee to c is fine.
	d := uuid.New()
	if DetectCycle(lines, d, c) {
		t.Fatal("no cycle expected")
	}
}

func TestDetectCycleDottedIgnored(t *testing.T) {
	a := uuid.New()
	b := uuid.New()
	// dotted line a->b doesn't affect solid chain
	lines := []ReportingLine{
		{EmployeeID: a, ManagerID: b, Type: LineDotted},
	}
	if DetectCycle(lines, b, a) {
		t.Fatal("dotted line should not cause cycle for solid")
	}
}
