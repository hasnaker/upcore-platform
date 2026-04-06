package proxy

import (
	"net"
	"net/http"
	"time"
)

// NewTransport creates a custom http.RoundTripper with tuned keep-alive and
// timeout settings for proxying to upstream services.
func NewTransport(timeout time.Duration) http.RoundTripper {
	return &http.Transport{
		DialContext: (&net.Dialer{
			Timeout:   5 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		MaxIdleConns:          200,
		MaxIdleConnsPerHost:   20,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   5 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		ResponseHeaderTimeout: timeout,
		ForceAttemptHTTP2:     false,
	}
}
