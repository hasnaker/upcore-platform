// Package validator provides input validators for employee data,
// including Turkish national ID (TCKN) checksums.
package validator

import "strings"

// IsValidTCKN applies the official Türk Kimlik Numarası checksum rules.
//
// The algorithm:
//  1. The number must be exactly 11 digits.
//  2. The first digit cannot be zero.
//  3. d10 = ((d1+d3+d5+d7+d9) * 7 - (d2+d4+d6+d8)) mod 10
//  4. d11 = (d1+d2+...+d10) mod 10
//
// This mirrors the SQL function app.is_valid_tckn used as a CHECK constraint.
func IsValidTCKN(tckn string) bool {
	tckn = strings.TrimSpace(tckn)
	if len(tckn) != 11 {
		return false
	}
	if tckn[0] == '0' {
		return false
	}
	digits := make([]int, 11)
	for i, c := range tckn {
		if c < '0' || c > '9' {
			return false
		}
		digits[i] = int(c - '0')
	}
	sumOdd := digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
	sumEven := digits[1] + digits[3] + digits[5] + digits[7]
	d10 := ((sumOdd * 7) - sumEven) % 10
	if d10 < 0 {
		d10 += 10
	}
	if d10 != digits[9] {
		return false
	}
	total := 0
	for i := 0; i < 10; i++ {
		total += digits[i]
	}
	if total%10 != digits[10] {
		return false
	}
	return true
}

// MaskTCKN hides interior digits so the value can be rendered safely.
// Returns the input unchanged when length != 11.
func MaskTCKN(tckn string) string {
	if len(tckn) != 11 {
		return tckn
	}
	return tckn[:3] + "*****" + tckn[8:]
}
