package domain

import (
	"testing"
	"time"
)

func TestOfferStatus_IsTerminal(t *testing.T) {
	cases := map[OfferStatus]bool{
		OfferDraft:    false,
		OfferSent:     false,
		OfferViewed:   false,
		OfferAccepted: true,
		OfferDeclined: true,
		OfferExpired:  true,
		OfferRevoked:  true,
	}
	for s, want := range cases {
		if got := s.IsTerminal(); got != want {
			t.Errorf("IsTerminal(%s) = %v, want %v", s, got, want)
		}
	}
}

func TestOfferLetter_CanTransitionTo(t *testing.T) {
	type tc struct {
		from OfferStatus
		to   OfferStatus
		want bool
	}
	cases := []tc{
		// draft
		{OfferDraft, OfferSent, true},
		{OfferDraft, OfferRevoked, true},
		{OfferDraft, OfferAccepted, false},
		{OfferDraft, OfferDeclined, false},
		{OfferDraft, OfferViewed, false},
		{OfferDraft, OfferDraft, false},
		// sent
		{OfferSent, OfferViewed, true},
		{OfferSent, OfferAccepted, true},
		{OfferSent, OfferDeclined, true},
		{OfferSent, OfferExpired, true},
		{OfferSent, OfferRevoked, true},
		{OfferSent, OfferDraft, false},
		// viewed
		{OfferViewed, OfferAccepted, true},
		{OfferViewed, OfferDeclined, true},
		{OfferViewed, OfferRevoked, true},
		{OfferViewed, OfferDraft, false},
		// terminal states
		{OfferAccepted, OfferDeclined, false},
		{OfferDeclined, OfferAccepted, false},
		{OfferRevoked, OfferSent, false},
		{OfferExpired, OfferAccepted, false},
		// invalid target
		{OfferSent, OfferStatus("bogus"), false},
	}
	for _, c := range cases {
		o := &OfferLetter{Status: c.from}
		if got := o.CanTransitionTo(c.to); got != c.want {
			t.Errorf("%s -> %s = %v, want %v", c.from, c.to, got, c.want)
		}
	}
}

func TestOfferLetter_Validate(t *testing.T) {
	future := time.Now().UTC().AddDate(0, 0, 7)
	base := func() *OfferLetter {
		return &OfferLetter{
			AdSoyad:       "Ayşe Yılmaz",
			Email:         "ayse@example.com",
			PositionTitle: "Backend Mühendisi",
			StartDate:     time.Now().UTC(),
			ExpiresAt:     future,
			Status:        OfferDraft,
		}
	}

	t.Run("ok", func(t *testing.T) {
		o := base()
		o.ApplyDefaults()
		if err := o.Validate(); err != nil {
			t.Fatalf("expected valid, got %v", err)
		}
	})

	t.Run("missing_required", func(t *testing.T) {
		o := &OfferLetter{Status: OfferDraft}
		err := o.Validate()
		if err == nil {
			t.Fatal("expected validation error")
		}
		ve, ok := err.(*ValidationError)
		if !ok {
			t.Fatalf("wanted *ValidationError, got %T", err)
		}
		for _, f := range []string{"ad_soyad", "email", "position_title", "start_date", "expires_at"} {
			if _, ok := ve.Fields[f]; !ok {
				t.Errorf("missing field error for %q (have %v)", f, ve.Fields)
			}
		}
	})

	t.Run("bad_email", func(t *testing.T) {
		o := base()
		o.Email = "not-an-email"
		err := o.Validate()
		ve, _ := err.(*ValidationError)
		if ve == nil || ve.Fields["email"] != "invalid" {
			t.Fatalf("expected invalid email, got %v", err)
		}
	})

	t.Run("past_expiry", func(t *testing.T) {
		o := base()
		o.ExpiresAt = time.Now().UTC().AddDate(0, 0, -1)
		err := o.Validate()
		ve, _ := err.(*ValidationError)
		if ve == nil || ve.Fields["expires_at"] != "must_be_future" {
			t.Fatalf("expected past-expiry error, got %v", err)
		}
	})

	t.Run("negative_salary", func(t *testing.T) {
		o := base()
		neg := -1.0
		o.SalaryBrut = &neg
		err := o.Validate()
		ve, _ := err.(*ValidationError)
		if ve == nil || ve.Fields["salary_brut"] != "must_be_positive" {
			t.Fatalf("expected negative salary error, got %v", err)
		}
	})
}

func TestOfferLetter_ApplyDefaults(t *testing.T) {
	o := &OfferLetter{}
	o.ApplyDefaults()
	if o.Status != OfferDraft {
		t.Errorf("status default: got %s want %s", o.Status, OfferDraft)
	}
	if o.SalaryCurrency != "TRY" {
		t.Errorf("currency default: got %q want TRY", o.SalaryCurrency)
	}
	if string(o.Benefits) != "{}" {
		t.Errorf("benefits default: got %q want {}", string(o.Benefits))
	}
	if o.ID.String() == "00000000-0000-0000-0000-000000000000" {
		t.Error("ID should be auto-generated")
	}
}
