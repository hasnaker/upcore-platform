package clerk

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/auth/internal/domain"
)

func newVerifier(t *testing.T) (*SvixVerifier, []byte) {
	t.Helper()
	secret := []byte("test-secret-bytes-32-characters!!")
	encoded := "whsec_" + base64.StdEncoding.EncodeToString(secret)
	v, err := NewSvixVerifier(encoded)
	require.NoError(t, err)
	return v, secret
}

func sign(id, ts string, body, secret []byte) string {
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(fmt.Sprintf("%s.%s.%s", id, ts, string(body))))
	return "v1," + base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

func TestSvix_Valid(t *testing.T) {
	v, secret := newVerifier(t)
	body := []byte(`{"hello":"world"}`)
	id := "msg_1"
	ts := strconv.FormatInt(time.Now().Unix(), 10)

	h := http.Header{}
	h.Set("Svix-Id", id)
	h.Set("Svix-Timestamp", ts)
	h.Set("Svix-Signature", sign(id, ts, body, secret))

	assert.NoError(t, v.Verify(h, body))
}

func TestSvix_MissingHeaders(t *testing.T) {
	v, _ := newVerifier(t)
	err := v.Verify(http.Header{}, []byte("x"))
	assert.ErrorIs(t, err, domain.ErrWebhookInvalidSignature)
}

func TestSvix_WrongSignature(t *testing.T) {
	v, _ := newVerifier(t)
	h := http.Header{}
	h.Set("Svix-Id", "msg_1")
	h.Set("Svix-Timestamp", strconv.FormatInt(time.Now().Unix(), 10))
	h.Set("Svix-Signature", "v1,deadbeef")
	err := v.Verify(h, []byte("x"))
	assert.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrWebhookInvalidSignature))
}

func TestSvix_StaleTimestamp(t *testing.T) {
	v, secret := newVerifier(t)
	body := []byte(`{}`)
	id := "msg_1"
	old := strconv.FormatInt(time.Now().Add(-10*time.Minute).Unix(), 10)

	h := http.Header{}
	h.Set("Svix-Id", id)
	h.Set("Svix-Timestamp", old)
	h.Set("Svix-Signature", sign(id, old, body, secret))

	err := v.Verify(h, body)
	assert.ErrorIs(t, err, domain.ErrWebhookStaleTimestamp)
}

func TestSvix_MultipleVersions(t *testing.T) {
	v, secret := newVerifier(t)
	body := []byte(`{"x":1}`)
	id := "msg_multi"
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	valid := sign(id, ts, body, secret)

	h := http.Header{}
	h.Set("Svix-Id", id)
	h.Set("Svix-Timestamp", ts)
	// Invalid v1 first, valid v1 second
	h.Set("Svix-Signature", "v1,wrong "+valid)
	assert.NoError(t, v.Verify(h, body))
}

func TestSvix_EmptySecret(t *testing.T) {
	_, err := NewSvixVerifier("")
	assert.Error(t, err)
}

func TestSvix_InvalidBase64(t *testing.T) {
	_, err := NewSvixVerifier("whsec_!!!not-base64!!!")
	assert.Error(t, err)
}

func TestPrimaryEmail(t *testing.T) {
	u := UserData{
		PrimaryEmailAddressID: "e1",
		EmailAddresses: []EmailAddress{
			{ID: "e0", EmailAddress: "x@old.com"},
			{ID: "e1", EmailAddress: "x@new.com"},
		},
	}
	assert.Equal(t, "x@new.com", u.PrimaryEmail())

	u.PrimaryEmailAddressID = "missing"
	assert.Equal(t, "x@old.com", u.PrimaryEmail())

	u.EmailAddresses = nil
	assert.Equal(t, "", u.PrimaryEmail())
}
