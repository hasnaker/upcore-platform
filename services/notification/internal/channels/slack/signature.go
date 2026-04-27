package slack

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"
)

// MaxRequestAge is the replay-protection window. Slack recommends rejecting
// requests older than 5 minutes.
const MaxRequestAge = 5 * time.Minute

// ErrInvalidSignature is returned when the X-Slack-Signature header does not
// match the HMAC-SHA256 of the signing string.
var ErrInvalidSignature = errors.New("slack: invalid signature")

// ErrStaleRequest is returned when the request timestamp is outside the replay
// protection window.
var ErrStaleRequest = errors.New("slack: stale request")

// Verifier validates X-Slack-Signature headers.
type Verifier struct {
	signingSecret string
	now           func() time.Time
}

// NewVerifier constructs a Verifier.
func NewVerifier(signingSecret string) *Verifier {
	return &Verifier{signingSecret: signingSecret, now: time.Now}
}

// withClock is used by tests to freeze time.
func (v *Verifier) withClock(fn func() time.Time) *Verifier {
	v.now = fn
	return v
}

// Verify checks the signature headers for the given raw body. Callers MUST
// pass the exact, unmodified request body (no trimming, no re-encoding).
func (v *Verifier) Verify(timestamp, signature string, body []byte) error {
	if v.signingSecret == "" {
		return errors.New("slack: signing secret not configured")
	}
	if timestamp == "" || signature == "" {
		return ErrInvalidSignature
	}
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return ErrInvalidSignature
	}
	if diff := v.now().Unix() - ts; diff > int64(MaxRequestAge.Seconds()) || diff < -int64(MaxRequestAge.Seconds()) {
		return ErrStaleRequest
	}

	basestring := []byte("v0:")
	basestring = append(basestring, []byte(timestamp)...)
	basestring = append(basestring, ':')
	basestring = append(basestring, body...)

	mac := hmac.New(sha256.New, []byte(v.signingSecret))
	mac.Write(basestring)
	expected := "v0=" + hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(signature)) {
		return ErrInvalidSignature
	}
	return nil
}

// Middleware returns an HTTP middleware that enforces Slack signature
// verification on every inbound request. The raw body is buffered and
// restored via r.Body reassignment so downstream handlers can parse it.
func (v *Verifier) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
		if err != nil {
			http.Error(w, `{"error":"body_too_large"}`, http.StatusRequestEntityTooLarge)
			return
		}
		_ = r.Body.Close()

		ts := r.Header.Get("X-Slack-Request-Timestamp")
		sig := r.Header.Get("X-Slack-Signature")
		if err := v.Verify(ts, sig, body); err != nil {
			http.Error(w, `{"error":"invalid_signature"}`, http.StatusUnauthorized)
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(body))
		r.ContentLength = int64(len(body))
		next.ServeHTTP(w, r)
	})
}
