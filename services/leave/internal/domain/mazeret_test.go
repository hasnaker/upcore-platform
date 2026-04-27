package domain

import (
	"testing"
	"time"
)

func TestCalculateMazeret(t *testing.T) {
	cases := []struct {
		name    string
		kind    MazeretKind
		ctx     MazeretContext
		wantDay float64
		hours   bool
	}{
		{"evlilik", MazeretEvlilik, MazeretContext{}, 3, false},
		{"babalik", MazeretBabalik, MazeretContext{}, 5, false},
		{"olum_es", MazeretOlumEsCocukAnaBaba, MazeretContext{}, 3, false},
		{"dogum_oncesi_tekiz", MazeretDogumKadinOnce, MazeretContext{}, 56, false},
		{"dogum_oncesi_cogul", MazeretDogumKadinOnce, MazeretContext{MultipleBirth: true}, 70, false},
		{"dogum_sonrasi_preterm", MazeretDogumKadinSonra, MazeretContext{PretermBirth: true, PretermDaysSaved: 10}, 66, false},
		{"engelli_cocuk", MazeretEngelliCocuk, MazeretContext{}, 10, false},
		{"sut_hours", MazeretSut, MazeretContext{}, 0, true},
		{"is_arama_hours", MazeretIsArama, MazeretContext{TenureMonths: 24}, 0, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := CalculateMazeret(c.kind, c.ctx)
			if got.IsHours != c.hours {
				t.Fatalf("IsHours=%v want %v", got.IsHours, c.hours)
			}
			if !c.hours && got.Days != c.wantDay {
				t.Errorf("days=%v want %v", got.Days, c.wantDay)
			}
			if !c.hours && got.LegalReference == "" {
				t.Error("expected legal reference")
			}
		})
	}
}

func TestResolveMazeretKind(t *testing.T) {
	if k, ok := ResolveMazeretKind(" EVLILIK "); !ok || k != MazeretEvlilik {
		t.Errorf("expected evlilik, got %s ok=%v", k, ok)
	}
	if _, ok := ResolveMazeretKind("nonexistent"); ok {
		t.Error("expected invalid")
	}
}

func TestPregnancyWindow(t *testing.T) {
	due := time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)
	start, end := PregnancyWindow(due, false)
	if !start.Equal(due.AddDate(0, 0, -56)) {
		t.Errorf("start=%v", start)
	}
	if !end.Equal(due.AddDate(0, 0, 56)) {
		t.Errorf("end=%v", end)
	}
	startMul, endMul := PregnancyWindow(due, true)
	if !startMul.Equal(due.AddDate(0, 0, -70)) || !endMul.Equal(due.AddDate(0, 0, 70)) {
		t.Error("multiple birth window wrong")
	}
}
