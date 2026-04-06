package clerk

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/upcore/auth/internal/domain"
)

const (
	headerSvixID        = "Svix-Id"
	headerSvixTimestamp = "Svix-Timestamp"
	headerSvixSignature = "Svix-Signature"

	// Maximum acceptable clock skew for webhook timestamps.
	svixMaxSkew = 5 * time.Minute
)

// SvixVerifier verifies Svix-signed webhook requests.
type SvixVerifier struct {
	secret []byte // decoded secret bytes
}

// NewSvixVerifier constructs a verifier from a Clerk signing secret.
// Secret format: "whsec_<base64>".
func NewSvixVerifier(secret string) (*SvixVerifier, error) {
	if secret == "" {
		return nil, fmt.Errorf("empty svix secret")
	}
	s := strings.TrimPrefix(secret, "whsec_")
	decoded, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil, fmt.Errorf("decode svix secret: %w", err)
	}
	return &SvixVerifier{secret: decoded}, nil
}

// Verify checks svix headers against the request body.
// Returns ErrWebhookInvalidSignature or ErrWebhookStaleTimestamp on failure.
func (v *SvixVerifier) Verify(headers http.Header, body []byte) error {
	svixID := headers.Get(headerSvixID)
	svixTs := headers.Get(headerSvixTimestamp)
	svixSig := headers.Get(headerSvixSignature)

	if svixID == "" || svixTs == "" || svixSig == "" {
		return fmt.Errorf("%w: missing svix headers", domain.ErrWebhookInvalidSignature)
	}

	// Timestamp freshness
	tsUnix, err := strconv.ParseInt(svixTs, 10, 64)
	if err != nil {
		return fmt.Errorf("%w: timestamp not numeric", domain.ErrWebhookInvalidSignature)
	}
	ts := time.Unix(tsUnix, 0)
	if time.Since(ts) > svixMaxSkew || time.Until(ts) > svixMaxSkew {
		return domain.ErrWebhookStaleTimestamp
	}

	// Construct signed content: "<id>.<timestamp>.<body>"
	signedContent := fmt.Sprintf("%s.%s.%s", svixID, svixTs, string(body))
	mac := hmac.New(sha256.New, v.secret)
	mac.Write([]byte(signedContent))
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	// Signature header may contain multiple space-separated "<version>,<sig>"
	// e.g. "v1,abc123 v1,def456"
	parts := strings.Split(svixSig, " ")
	for _, p := range parts {
		kv := strings.SplitN(p, ",", 2)
		if len(kv) != 2 {
			continue
		}
		if kv[0] != "v1" {
			continue
		}
		if hmac.Equal([]byte(kv[1]), []byte(expected)) {
			return nil
		}
	}
	return domain.ErrWebhookInvalidSignature
}
