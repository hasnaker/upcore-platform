package proxy

import (
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTransport(t *testing.T) {
	transport := NewTransport(30 * time.Second)
	require.NotNil(t, transport)

	// Verify it implements http.RoundTripper
	var _ http.RoundTripper = transport

	// Type assert to check settings
	httpTransport, ok := transport.(*http.Transport)
	require.True(t, ok)

	assert.Equal(t, 200, httpTransport.MaxIdleConns)
	assert.Equal(t, 20, httpTransport.MaxIdleConnsPerHost)
	assert.Equal(t, 90*time.Second, httpTransport.IdleConnTimeout)
	assert.Equal(t, 5*time.Second, httpTransport.TLSHandshakeTimeout)
	assert.Equal(t, 30*time.Second, httpTransport.ResponseHeaderTimeout)
}
