package service

import (
	"context"
	"fmt"
	"math"
	"net"
	"time"
)

// SuspiciousLoginChecker classifies a login attempt against simple heuristics
// that complement Clerk's built-in attack protection (POL-01 §4).
//
// A "suspicious" result does NOT block the login — the caller should use the
// returned severity to decide whether to:
//   - require a passkey step-up,
//   - notify the user out of band,
//   - record an audit event with status=denied,
//   - or rate-limit the source.
type SuspiciousLoginChecker struct {
	repo SuspiciousRepo
	now  func() time.Time

	// heuristic tuning
	ImpossibleTravelKMPerHour   float64 // default 900 (commercial jet)
	NewDeviceWindow             time.Duration
	FailedAttemptsWindow        time.Duration
	FailedAttemptsThreshold     int
	DenyASN                     map[string]bool
}

// SuspiciousRepo is the minimal persistence surface the checker needs.
type SuspiciousRepo interface {
	LastLogin(ctx context.Context, userID string) (*LoginRecord, error)
	KnownDevice(ctx context.Context, userID, deviceFingerprint string, since time.Time) (bool, error)
	CountFailed(ctx context.Context, userID string, since time.Time) (int, error)
	RecordLogin(ctx context.Context, l LoginRecord) error
}

// LoginRecord represents a persisted login signal.
type LoginRecord struct {
	UserID            string
	TenantID          string
	IP                net.IP
	ASN               string
	Latitude          float64
	Longitude         float64
	DeviceFingerprint string
	IsAdmin           bool
	OccurredAt        time.Time
	Outcome           string // "success" | "failed" | "challenged"
}

// Severity is the checker verdict.
type Severity string

const (
	SeverityOK      Severity = "ok"
	SeverityNotice  Severity = "notice"
	SeverityWarn    Severity = "warn"
	SeverityBlock   Severity = "block"
)

// Reason describes which heuristic fired; used for audit + UX.
type Reason struct {
	Rule     string
	Severity Severity
	Detail   string
}

// NewSuspiciousLoginChecker constructs a checker with sensible defaults.
func NewSuspiciousLoginChecker(repo SuspiciousRepo) *SuspiciousLoginChecker {
	return &SuspiciousLoginChecker{
		repo:                    repo,
		now:                     time.Now,
		ImpossibleTravelKMPerHour: 900,
		NewDeviceWindow:         90 * 24 * time.Hour,
		FailedAttemptsWindow:    5 * time.Minute,
		FailedAttemptsThreshold: 10,
		DenyASN:                 map[string]bool{},
	}
}

// Evaluate runs all heuristics and returns the highest severity + reasons.
// The caller passes the candidate LoginRecord; the checker consults history.
func (c *SuspiciousLoginChecker) Evaluate(ctx context.Context, candidate LoginRecord) (Severity, []Reason, error) {
	var reasons []Reason
	sev := SeverityOK

	// 1. Impossible travel
	if last, err := c.repo.LastLogin(ctx, candidate.UserID); err == nil && last != nil {
		elapsedH := candidate.OccurredAt.Sub(last.OccurredAt).Hours()
		if elapsedH > 0 && elapsedH < 6 {
			km := haversine(last.Latitude, last.Longitude, candidate.Latitude, candidate.Longitude)
			kph := km / elapsedH
			if kph > c.ImpossibleTravelKMPerHour {
				r := Reason{Rule: "impossible-travel", Severity: SeverityWarn,
					Detail: fmt.Sprintf("%.0fkm in %.1fh = %.0fkm/h", km, elapsedH, kph)}
				reasons = append(reasons, r)
				sev = escalate(sev, r.Severity)
			}
		}
	}

	// 2. New device on admin account
	if candidate.IsAdmin && candidate.DeviceFingerprint != "" {
		known, err := c.repo.KnownDevice(ctx, candidate.UserID, candidate.DeviceFingerprint,
			candidate.OccurredAt.Add(-c.NewDeviceWindow))
		if err == nil && !known {
			r := Reason{Rule: "new-device-admin", Severity: SeverityWarn,
				Detail: "admin logging in from previously-unseen device"}
			reasons = append(reasons, r)
			sev = escalate(sev, r.Severity)
		}
	}

	// 3. Burst of failed attempts
	failed, err := c.repo.CountFailed(ctx, candidate.UserID,
		candidate.OccurredAt.Add(-c.FailedAttemptsWindow))
	if err == nil && failed >= c.FailedAttemptsThreshold {
		r := Reason{Rule: "burst-failed-attempts", Severity: SeverityBlock,
			Detail: fmt.Sprintf("%d failed attempts in %s", failed, c.FailedAttemptsWindow)}
		reasons = append(reasons, r)
		sev = escalate(sev, r.Severity)
	}

	// 4. Deny-listed ASN (Tor, commercial anonymisers, known bots)
	if candidate.ASN != "" && c.DenyASN[candidate.ASN] {
		r := Reason{Rule: "denied-asn", Severity: SeverityBlock,
			Detail: "source ASN on deny list"}
		reasons = append(reasons, r)
		sev = escalate(sev, r.Severity)
	}

	return sev, reasons, nil
}

func escalate(cur, next Severity) Severity {
	weight := map[Severity]int{SeverityOK: 0, SeverityNotice: 1, SeverityWarn: 2, SeverityBlock: 3}
	if weight[next] > weight[cur] {
		return next
	}
	return cur
}

// haversine returns the great-circle distance in kilometres between two coords.
func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0 // km
	toRad := func(d float64) float64 { return d * math.Pi / 180 }
	dLat := toRad(lat2 - lat1)
	dLon := toRad(lon2 - lon1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}
