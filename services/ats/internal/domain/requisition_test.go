package domain

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRequisition_CanTransition(t *testing.T) {
	tests := []struct {
		from, to ReqStatus
		allowed  bool
	}{
		{ReqStatusDraft, ReqStatusOpen, true},
		{ReqStatusDraft, ReqStatusClosed, false},
		{ReqStatusOpen, ReqStatusOnHold, true},
		{ReqStatusOpen, ReqStatusClosed, true},
		{ReqStatusOpen, ReqStatusFilled, true},
		{ReqStatusOnHold, ReqStatusOpen, true},
		{ReqStatusOnHold, ReqStatusClosed, true},
		{ReqStatusFilled, ReqStatusClosed, true},
		{ReqStatusClosed, ReqStatusOpen, false},
		{ReqStatusClosed, ReqStatusDraft, false},
		{ReqStatusDraft, ReqStatusDraft, false},
	}

	for _, tc := range tests {
		r := &Requisition{Status: tc.from}
		t.Run(string(tc.from)+"->"+string(tc.to), func(t *testing.T) {
			assert.Equal(t, tc.allowed, r.CanTransition(tc.to))
		})
	}
}

func TestRequisition_Validate(t *testing.T) {
	r := &Requisition{Title: "", Headcount: 0}
	err := r.Validate()
	assert.Error(t, err)

	r2 := &Requisition{Title: "Dev", Headcount: 1}
	err2 := r2.Validate()
	assert.NoError(t, err2)
}

func TestRequisition_IsOpen(t *testing.T) {
	r := &Requisition{Status: ReqStatusOpen}
	assert.True(t, r.IsOpen())

	r2 := &Requisition{Status: ReqStatusDraft}
	assert.False(t, r2.IsOpen())
}
