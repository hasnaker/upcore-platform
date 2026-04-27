package slack

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"
)

// signingSecret is Slack's example from https://api.slack.com/authentication/verifying-requests-from-slack.
const signingSecret = "8f742231b10e8888abcd99yyyzzz85a5"

// slackExampleBody / signature from Slack's docs to verify exact algorithm.
// Slack example: timestamp=1531420618, body starts with "token=xyzz0WbapA..."
const (
	slackExampleBody      = "token=xyzz0WbapA4vBCDEFasx0q6G&team_id=T1DC2JH3J&team_domain=testteamnow&channel_id=G8PSS9T3V&channel_name=foobar&user_id=U2CERLKJA&user_name=roadrunner&command=%2Fwebhook-collect&text=&response_url=https%3A%2F%2Fhooks.slack.com%2Fcommands%2FT1DC2JH3J%2F397700885554%2F96rGlfmibIGlgcZRskXaIFfN&trigger_id=398738663015.47445629121.803a0bc887a14d10d2c447fce8b6703c"
	slackExampleTimestamp = "1531420618"
	slackExampleSignature = "v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503"
)

func TestVerifier_OfficialExample(t *testing.T) {
	v := NewVerifier(signingSecret).withClock(func() time.Time { return time.Unix(1531420618+10, 0) })
	if err := v.Verify(slackExampleTimestamp, slackExampleSignature, []byte(slackExampleBody)); err != nil {
		t.Fatalf("expected valid signature, got %v", err)
	}
}

func TestVerifier_InvalidSignature(t *testing.T) {
	v := NewVerifier(signingSecret).withClock(func() time.Time { return time.Unix(1531420618+10, 0) })
	err := v.Verify(slackExampleTimestamp, "v0=deadbeef", []byte(slackExampleBody))
	if err == nil {
		t.Fatal("expected signature failure")
	}
}

func TestVerifier_StaleTimestamp(t *testing.T) {
	v := NewVerifier(signingSecret).withClock(func() time.Time { return time.Unix(1531420618+600, 0) })
	err := v.Verify(slackExampleTimestamp, slackExampleSignature, []byte(slackExampleBody))
	if err == nil || err.Error() != ErrStaleRequest.Error() {
		t.Fatalf("expected stale error, got %v", err)
	}
}

func TestVerifier_MissingHeaders(t *testing.T) {
	v := NewVerifier(signingSecret)
	if err := v.Verify("", "sig", []byte("a")); err == nil {
		t.Fatal("expected error for missing timestamp")
	}
	if err := v.Verify("1", "", []byte("a")); err == nil {
		t.Fatal("expected error for missing signature")
	}
}

func TestVerifier_Middleware(t *testing.T) {
	body := []byte("command=%2Ftest&text=ping")
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	mac := hmac.New(sha256.New, []byte(signingSecret))
	mac.Write([]byte("v0:"))
	mac.Write([]byte(ts))
	mac.Write([]byte(":"))
	mac.Write(body)
	sig := "v0=" + hex.EncodeToString(mac.Sum(nil))

	v := NewVerifier(signingSecret)

	called := false
	h := v.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		buf, _ := io.ReadAll(r.Body)
		if !bytes.Equal(buf, body) {
			t.Errorf("body mismatch: got %s", string(buf))
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/events", bytes.NewReader(body))
	req.Header.Set("X-Slack-Request-Timestamp", ts)
	req.Header.Set("X-Slack-Signature", sig)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	if !called {
		t.Fatal("downstream handler not called")
	}
}

func TestVerifier_MiddlewareRejectsInvalid(t *testing.T) {
	v := NewVerifier(signingSecret)
	h := v.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("should not reach handler")
	}))
	req := httptest.NewRequest(http.MethodPost, "/events", bytes.NewReader([]byte("x=y")))
	req.Header.Set("X-Slack-Request-Timestamp", strconv.FormatInt(time.Now().Unix(), 10))
	req.Header.Set("X-Slack-Signature", "v0=wrong")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 got %d", rr.Code)
	}
}
