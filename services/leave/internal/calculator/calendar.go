package calculator

import "time"

// Holiday represents a Turkish public holiday (resmi tatil).
type Holiday struct {
	Date     time.Time `json:"date"`
	Name     string    `json:"name"`
	Category string    `json:"category"` // "milli" | "dini" | "idari"
}

// TurkishPublicHolidays returns the set of Turkish official holidays for a
// given Gregorian year. Fixed national holidays are always included; religious
// holidays (Ramazan Bayramı, Kurban Bayramı) are looked up from an authoritative
// table (see `religiousHolidays` below).
//
// Known data sources:
//   - T.C. Resmî Gazete / Diyanet takvimi
//   - https://www.mevzuat.gov.tr/
//
// The dataset covers 2024-2028. For years outside that range, only fixed
// holidays are returned (callers should override via tenant-specific holiday
// seeds).
func TurkishPublicHolidays(year int) []Holiday {
	out := fixedHolidays(year)
	if rel, ok := religiousHolidays[year]; ok {
		out = append(out, rel...)
	}
	return out
}

// fixedHolidays returns the national holidays with deterministic dates.
func fixedHolidays(year int) []Holiday {
	return []Holiday{
		{date(year, 1, 1), "Yılbaşı", "milli"},
		{date(year, 4, 23), "Ulusal Egemenlik ve Çocuk Bayramı", "milli"},
		{date(year, 5, 1), "Emek ve Dayanışma Günü", "milli"},
		{date(year, 5, 19), "Atatürk'ü Anma, Gençlik ve Spor Bayramı", "milli"},
		{date(year, 7, 15), "Demokrasi ve Millî Birlik Günü", "milli"},
		{date(year, 8, 30), "Zafer Bayramı", "milli"},
		{date(year, 10, 29), "Cumhuriyet Bayramı", "milli"},
	}
}

// religiousHolidays table — dates set by Diyanet (verified against official
// calendars). Each holiday spans multiple days (3 for Ramazan, 4 for Kurban).
// Values must be updated annually.
var religiousHolidays = map[int][]Holiday{
	2024: {
		{date(2024, 4, 10), "Ramazan Bayramı 1. Gün", "dini"},
		{date(2024, 4, 11), "Ramazan Bayramı 2. Gün", "dini"},
		{date(2024, 4, 12), "Ramazan Bayramı 3. Gün", "dini"},
		{date(2024, 6, 16), "Kurban Bayramı 1. Gün", "dini"},
		{date(2024, 6, 17), "Kurban Bayramı 2. Gün", "dini"},
		{date(2024, 6, 18), "Kurban Bayramı 3. Gün", "dini"},
		{date(2024, 6, 19), "Kurban Bayramı 4. Gün", "dini"},
	},
	2025: {
		{date(2025, 3, 30), "Ramazan Bayramı 1. Gün", "dini"},
		{date(2025, 3, 31), "Ramazan Bayramı 2. Gün", "dini"},
		{date(2025, 4, 1), "Ramazan Bayramı 3. Gün", "dini"},
		{date(2025, 6, 6), "Kurban Bayramı 1. Gün", "dini"},
		{date(2025, 6, 7), "Kurban Bayramı 2. Gün", "dini"},
		{date(2025, 6, 8), "Kurban Bayramı 3. Gün", "dini"},
		{date(2025, 6, 9), "Kurban Bayramı 4. Gün", "dini"},
	},
	2026: {
		{date(2026, 3, 20), "Ramazan Bayramı 1. Gün", "dini"},
		{date(2026, 3, 21), "Ramazan Bayramı 2. Gün", "dini"},
		{date(2026, 3, 22), "Ramazan Bayramı 3. Gün", "dini"},
		{date(2026, 5, 27), "Kurban Bayramı 1. Gün", "dini"},
		{date(2026, 5, 28), "Kurban Bayramı 2. Gün", "dini"},
		{date(2026, 5, 29), "Kurban Bayramı 3. Gün", "dini"},
		{date(2026, 5, 30), "Kurban Bayramı 4. Gün", "dini"},
	},
	2027: {
		{date(2027, 3, 10), "Ramazan Bayramı 1. Gün", "dini"},
		{date(2027, 3, 11), "Ramazan Bayramı 2. Gün", "dini"},
		{date(2027, 3, 12), "Ramazan Bayramı 3. Gün", "dini"},
		{date(2027, 5, 17), "Kurban Bayramı 1. Gün", "dini"},
		{date(2027, 5, 18), "Kurban Bayramı 2. Gün", "dini"},
		{date(2027, 5, 19), "Kurban Bayramı 3. Gün", "dini"},
		{date(2027, 5, 20), "Kurban Bayramı 4. Gün", "dini"},
	},
	2028: {
		{date(2028, 2, 26), "Ramazan Bayramı 1. Gün", "dini"},
		{date(2028, 2, 27), "Ramazan Bayramı 2. Gün", "dini"},
		{date(2028, 2, 28), "Ramazan Bayramı 3. Gün", "dini"},
		{date(2028, 5, 5), "Kurban Bayramı 1. Gün", "dini"},
		{date(2028, 5, 6), "Kurban Bayramı 2. Gün", "dini"},
		{date(2028, 5, 7), "Kurban Bayramı 3. Gün", "dini"},
		{date(2028, 5, 8), "Kurban Bayramı 4. Gün", "dini"},
	},
}

// HolidaySet is a set of dates (truncated to day) for O(1) lookup.
type HolidaySet map[time.Time]string

// BuildHolidaySet converts a holiday slice into a lookup set keyed by date.
func BuildHolidaySet(list []Holiday) HolidaySet {
	out := make(HolidaySet, len(list))
	for _, h := range list {
		out[truncateDay(h.Date)] = h.Name
	}
	return out
}

// IsWeekend returns true for Saturday or Sunday.
func IsWeekend(t time.Time) bool {
	d := t.Weekday()
	return d == time.Saturday || d == time.Sunday
}

// IsHoliday reports whether the given date is in the holiday set.
func IsHoliday(t time.Time, set HolidaySet) bool {
	if set == nil {
		return false
	}
	_, ok := set[truncateDay(t)]
	return ok
}

// IsWorkingDay returns true for dates that are neither weekend nor official holiday.
func IsWorkingDay(t time.Time, set HolidaySet) bool {
	return !IsWeekend(t) && !IsHoliday(t, set)
}

// WorkingDaysBetween counts working days in [start,end] (inclusive).
// Returns 0 if end < start.
func WorkingDaysBetween(start, end time.Time, set HolidaySet) int {
	start = truncateDay(start)
	end = truncateDay(end)
	if end.Before(start) {
		return 0
	}
	count := 0
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		if IsWorkingDay(d, set) {
			count++
		}
	}
	return count
}

// LeaveDays calculates total leave days for a request including half-day
// adjustments. Weekends and public holidays are excluded from the count.
func LeaveDays(start, end time.Time, startHalf, endHalf bool, set HolidaySet) float64 {
	working := WorkingDaysBetween(start, end, set)
	if working == 0 {
		return 0
	}
	days := float64(working)
	// subtract 0.5 for each half-day flag, but never below 0.5
	startIsWork := IsWorkingDay(start, set)
	endIsWork := IsWorkingDay(end, set)
	if startHalf && startIsWork {
		days -= 0.5
	}
	if endHalf && endIsWork && !truncateDay(start).Equal(truncateDay(end)) {
		days -= 0.5
	}
	// special case: single-day half-day leave
	if truncateDay(start).Equal(truncateDay(end)) && startHalf && endHalf && startIsWork {
		days = 0.5
	}
	if days < 0 {
		days = 0
	}
	return days
}

func date(y, m, d int) time.Time {
	return time.Date(y, time.Month(m), d, 0, 0, 0, 0, time.UTC)
}

func truncateDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}
