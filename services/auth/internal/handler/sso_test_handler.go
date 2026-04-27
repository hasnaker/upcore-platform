// Package handler — SSO bağlantı test endpoint'i.
//
// Onboarding wizard Step6 (ve /ayarlar/sso admin sayfası) kaydetmeden önce
// müşterinin girdiği discovery URL + client_id'yi doğrulamak için bu
// endpoint'i POST /api/v1/auth/sso/test ile çağırır. Endpoint:
//   1. Sağlayıcıya göre discovery URL üretir (Entra / Google / Okta) veya
//      müşteri kendi özel discovery_url'sini gönderebilir.
//   2. 10 sn timeout ile endpoint'i GET eder, JSON parse eder.
//   3. authorization_endpoint, token_endpoint, userinfo_endpoint alanlarını
//      doğrular — herhangi biri eksikse hata döner.
//   4. Client ID format ön kontrolü yapar (Entra için UUID zorunlu).
//
// Gizlilik: client_secret asla log'a yazılmaz.
package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// SSOTestRequest bağlantı testi için gelen gövdedir.
type SSOTestRequest struct {
	Provider      string `json:"provider"`                 // entra | google | okta
	ClientID      string `json:"client_id"`                // zorunlu
	ClientSecret  string `json:"client_secret,omitempty"`  // okta SAML dışında zorunlu; asla log'lanmaz
	TenantDomain  string `json:"tenant_domain,omitempty"`  // Okta için alt alan veya Entra tenant domain
	EntraTenantID string `json:"tenant_id,omitempty"`      // Entra için UUID veya "common"
	DiscoveryURL  string `json:"discovery_url,omitempty"`  // isteğe bağlı override
}

// SSOTestResponse yanıt gövdesidir.
type SSOTestResponse struct {
	OK           bool               `json:"ok"`
	Message      string             `json:"message,omitempty"`
	Error        string             `json:"error,omitempty"`
	Issuer       string             `json:"issuer,omitempty"`
	DiscoveryURL string             `json:"discovery_url,omitempty"`
	Endpoints    *ssoTestEndpoints  `json:"endpoints,omitempty"`
	Details      map[string]string  `json:"details,omitempty"`
}

type ssoTestEndpoints struct {
	Authorization string `json:"authorization"`
	Token         string `json:"token"`
	UserInfo      string `json:"userinfo"`
	JWKS          string `json:"jwks,omitempty"`
}

type discoveryDoc struct {
	Issuer                string `json:"issuer"`
	AuthorizationEndpoint string `json:"authorization_endpoint"`
	TokenEndpoint         string `json:"token_endpoint"`
	UserinfoEndpoint      string `json:"userinfo_endpoint"`
	JWKSURI               string `json:"jwks_uri"`
}

var entraUUIDRe = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// ssoTestHTTPClient sabit 10 sn timeout ile küçük bir client — paylaşıldığı
// için yeniden kullanılabilir.
var ssoTestHTTPClient = &http.Client{
	Timeout: 10 * time.Second,
}

// MakeSSOTest bir chi http.HandlerFunc döner. Bağımsız bir service'e bağımlı
// değil; tamamen dış HTTP çağrılarına dayanır.
func MakeSSOTest() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req SSOTestRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeSSOTestError(w, http.StatusBadRequest, "Geçersiz JSON gövde", nil)
			return
		}

		req.Provider = strings.ToLower(strings.TrimSpace(req.Provider))
		req.ClientID = strings.TrimSpace(req.ClientID)
		req.ClientSecret = strings.TrimSpace(req.ClientSecret)
		req.TenantDomain = strings.TrimSpace(req.TenantDomain)
		req.EntraTenantID = strings.TrimSpace(req.EntraTenantID)
		req.DiscoveryURL = strings.TrimSpace(req.DiscoveryURL)

		if req.ClientID == "" {
			writeSSOTestError(w, http.StatusBadRequest, "Geçersiz client_id", map[string]string{
				"field": "client_id",
			})
			return
		}

		if req.Provider == "" && req.DiscoveryURL == "" {
			writeSSOTestError(w, http.StatusBadRequest, "provider veya discovery_url zorunlu", nil)
			return
		}

		// Provider-spesifik zorunlu alan kontrolleri
		switch req.Provider {
		case "entra":
			if req.EntraTenantID == "" && req.DiscoveryURL == "" {
				writeSSOTestError(w, http.StatusBadRequest, "Entra için tenant_id zorunlu", nil)
				return
			}
			if !entraUUIDRe.MatchString(req.EntraTenantID) && req.EntraTenantID != "common" && req.EntraTenantID != "organizations" {
				writeSSOTestError(w, http.StatusBadRequest, "Geçersiz client_id: Entra tenant_id UUID veya 'common' olmalı", map[string]string{
					"field": "tenant_id",
				})
				return
			}
		case "okta":
			if req.TenantDomain == "" && req.DiscoveryURL == "" {
				writeSSOTestError(w, http.StatusBadRequest, "Okta için tenant_domain zorunlu", nil)
				return
			}
		case "google":
			// Google discovery için ek alan gerekmez
		case "":
			// Sadece discovery_url ile devam
		default:
			writeSSOTestError(w, http.StatusBadRequest, "Bilinmeyen provider: "+req.Provider, nil)
			return
		}

		// okta dışında client_secret zorunlu (OIDC confidential client)
		if req.Provider != "okta" && req.ClientSecret == "" {
			writeSSOTestError(w, http.StatusBadRequest, "client_secret zorunlu", map[string]string{
				"field": "client_secret",
			})
			return
		}

		discoveryURL, err := buildSSODiscoveryURL(req)
		if err != nil {
			writeSSOTestError(w, http.StatusBadRequest, err.Error(), nil)
			return
		}

		doc, herr := fetchDiscoveryDoc(r.Context(), discoveryURL)
		if herr != nil {
			status := http.StatusBadGateway
			msg := herr.Error()
			switch {
			case errors.Is(herr, context.DeadlineExceeded):
				status = http.StatusGatewayTimeout
				msg = "Discovery endpoint erişilemedi (10 sn timeout)"
			case strings.Contains(msg, "connection refused"):
				msg = "Bağlantı reddedildi: " + discoveryURL
			case strings.Contains(msg, "no such host"):
				msg = "Discovery endpoint erişilemedi (DNS çözümlenemedi): " + discoveryURL
			case strings.Contains(msg, "certificate"):
				msg = "TLS doğrulama hatası: " + msg
			}
			writeJSON(w, status, SSOTestResponse{
				OK:           false,
				Error:        msg,
				DiscoveryURL: discoveryURL,
			})
			return
		}

		missing := make([]string, 0, 3)
		if doc.AuthorizationEndpoint == "" {
			missing = append(missing, "authorization_endpoint")
		}
		if doc.TokenEndpoint == "" {
			missing = append(missing, "token_endpoint")
		}
		if doc.UserinfoEndpoint == "" {
			missing = append(missing, "userinfo_endpoint")
		}
		if len(missing) > 0 {
			writeJSON(w, http.StatusBadGateway, SSOTestResponse{
				OK:           false,
				Error:        "Discovery dokümanında eksik alanlar: " + strings.Join(missing, ", "),
				DiscoveryURL: discoveryURL,
				Issuer:       doc.Issuer,
			})
			return
		}

		// userinfo HEAD — 200/401/403 normal (token olmadan 401 dönebilir); 5xx = upstream sorunu
		_ = probeUserinfo(r.Context(), doc.UserinfoEndpoint)

		writeJSON(w, http.StatusOK, SSOTestResponse{
			OK:           true,
			Message:      "Bağlantı başarılı — OIDC discovery dokümanı doğrulandı",
			Issuer:       doc.Issuer,
			DiscoveryURL: discoveryURL,
			Endpoints: &ssoTestEndpoints{
				Authorization: doc.AuthorizationEndpoint,
				Token:         doc.TokenEndpoint,
				UserInfo:      doc.UserinfoEndpoint,
				JWKS:          doc.JWKSURI,
			},
		})
	}
}

func buildSSODiscoveryURL(req SSOTestRequest) (string, error) {
	if req.DiscoveryURL != "" {
		if !strings.HasPrefix(req.DiscoveryURL, "https://") {
			return "", errors.New("discovery_url https:// ile başlamalı")
		}
		return req.DiscoveryURL, nil
	}
	switch req.Provider {
	case "entra":
		tid := req.EntraTenantID
		if tid == "" {
			tid = "common"
		}
		return "https://login.microsoftonline.com/" + tid + "/v2.0/.well-known/openid-configuration", nil
	case "google":
		return "https://accounts.google.com/.well-known/openid-configuration", nil
	case "okta":
		domain := strings.TrimPrefix(req.TenantDomain, "https://")
		domain = strings.TrimPrefix(domain, "http://")
		domain = strings.TrimSuffix(domain, "/")
		if domain == "" {
			return "", errors.New("Okta domain eksik")
		}
		return "https://" + domain + "/.well-known/openid-configuration", nil
	default:
		return "", errors.New("Discovery endpoint erişilemedi: bilinmeyen provider")
	}
}

func fetchDiscoveryDoc(ctx context.Context, url string) (*discoveryDoc, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "upcore-auth-sso-test/1.0")

	resp, err := ssoTestHTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, errors.New("Discovery endpoint bulunamadı (404) — tenant_id veya domain hatalı olabilir")
	}
	if resp.StatusCode >= 400 {
		return nil, errors.New("Discovery endpoint hata verdi: HTTP " + resp.Status)
	}

	var doc discoveryDoc
	if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
		return nil, errors.New("Discovery dokümanı JSON olarak okunamadı: " + err.Error())
	}
	return &doc, nil
}

func probeUserinfo(ctx context.Context, url string) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodHead, url, nil)
	if err != nil {
		return err
	}
	resp, err := ssoTestHTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func writeSSOTestError(w http.ResponseWriter, status int, msg string, details map[string]string) {
	writeJSON(w, status, SSOTestResponse{
		OK:      false,
		Error:   msg,
		Details: details,
	})
}
