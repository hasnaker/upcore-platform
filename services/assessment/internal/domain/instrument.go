package domain

// InstrumentCode identifies a psychometric instrument.
type InstrumentCode string

const (
	InstrumentBAT12TR InstrumentCode = "BAT-12-TR"
	InstrumentCOPSOQ  InstrumentCode = "COPSOQ"
	InstrumentUpCap   InstrumentCode = "UPCAP"
)

// IsValid checks that the instrument code is a known value.
func (c InstrumentCode) IsValid() bool {
	switch c {
	case InstrumentBAT12TR, InstrumentCOPSOQ, InstrumentUpCap:
		return true
	}
	return false
}

// ItemCount returns the expected number of items for the instrument.
func (c InstrumentCode) ItemCount() int {
	switch c {
	case InstrumentBAT12TR:
		return 12
	case InstrumentCOPSOQ:
		return 44
	case InstrumentUpCap:
		return 60
	}
	return 0
}

// TimeLimitMinutes returns the default time limit in minutes.
func (c InstrumentCode) TimeLimitMinutes() int {
	switch c {
	case InstrumentBAT12TR:
		return 15
	case InstrumentCOPSOQ:
		return 30
	case InstrumentUpCap:
		return 45
	}
	return 90
}

// ExpectedTotalSeconds returns the expected minimum total test time.
func (c InstrumentCode) ExpectedTotalSeconds() float64 {
	// Expected = items * 5 seconds average per item
	return float64(c.ItemCount()) * 5.0
}

// ScoringEndpoint returns the scoring service path for this instrument.
func (c InstrumentCode) ScoringEndpoint() string {
	switch c {
	case InstrumentBAT12TR:
		return "/api/v1/score/bat"
	case InstrumentCOPSOQ:
		return "/api/v1/score/copsoq"
	case InstrumentUpCap:
		return "/api/v1/score/upcap"
	}
	return ""
}
