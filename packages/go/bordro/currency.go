package bordro

import "fmt"

// Multi-currency destek. Türk firmaları için ağırlıklı TRY; yabancı ortak
// şirketler USD/EUR maaş + ayın sonu TRY'ye çevrim. TCMB günlük kur veya
// tenant'ın özel anlaşma kurunu destekler.

// Currency ISO-4217 kod.
type Currency string

const (
	CurrencyTRY Currency = "TRY"
	CurrencyUSD Currency = "USD"
	CurrencyEUR Currency = "EUR"
	CurrencyGBP Currency = "GBP"
)

// ExchangeRate — yabancı para birimi için bir TRY karşılığı + kur kaynağı.
type ExchangeRate struct {
	From      Currency
	To        Currency
	Rate      float64 // 1 From = Rate * To
	Source    string  // "TCMB", "fixed_contract", "manual_input"
	Date      string  // YYYY-MM-DD
}

// Convert — From'daki tutarı To'ya çevirir. Aynı para birimi → değişmez.
func Convert(amount float64, rate ExchangeRate, target Currency) (float64, error) {
	if rate.From == target {
		return round2(amount), nil
	}
	if rate.To != target {
		return 0, fmt.Errorf("rate target (%s) != requested target (%s)", rate.To, target)
	}
	if rate.Rate <= 0 {
		return 0, fmt.Errorf("invalid rate: %v", rate.Rate)
	}
	return round2(amount * rate.Rate), nil
}

// DefaultRates — dev için hardcoded bazı kurlar (Ocak 2026). Production'da
// tenant_settings.exchange_rate_source üzerinden günlük TCMB çekilir.
func DefaultRates() []ExchangeRate {
	return []ExchangeRate{
		{From: CurrencyUSD, To: CurrencyTRY, Rate: 35.40, Source: "TCMB", Date: "2026-01-15"},
		{From: CurrencyEUR, To: CurrencyTRY, Rate: 38.25, Source: "TCMB", Date: "2026-01-15"},
		{From: CurrencyGBP, To: CurrencyTRY, Rate: 44.80, Source: "TCMB", Date: "2026-01-15"},
	}
}
