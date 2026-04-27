// Package esign provides e-signature provider adapters. DocuSign (primary).
package esign

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// Provider abstracts envelope creation + status polling.
type Provider interface {
	Name() string
	CreateEnvelope(ctx context.Context, req EnvelopeRequest) (string, error)
	GetStatus(ctx context.Context, envelopeID string) (string, error)
}

// EnvelopeRequest bundles fields required to start an e-signature flow.
type EnvelopeRequest struct {
	DocumentName string
	DocumentPDF  []byte
	SignerEmail  string
	SignerName   string
	Subject      string
	Message      string
	CallbackURL  string
}

// DocuSign adapter via REST API.
type DocuSign struct {
	BaseURL     string
	AccountID   string
	AccessToken string
	client      *http.Client
}

// NewDocuSign reads env: DOCUSIGN_BASE_URL + DOCUSIGN_ACCOUNT_ID + DOCUSIGN_ACCESS_TOKEN.
func NewDocuSign() *DocuSign {
	return &DocuSign{
		BaseURL:     os.Getenv("DOCUSIGN_BASE_URL"),
		AccountID:   os.Getenv("DOCUSIGN_ACCOUNT_ID"),
		AccessToken: os.Getenv("DOCUSIGN_ACCESS_TOKEN"),
		client:      &http.Client{Timeout: 30 * time.Second},
	}
}

// Name returns provider code.
func (*DocuSign) Name() string { return "docusign" }

// CreateEnvelope creates a "sent" envelope with one PDF + one signer.
func (d *DocuSign) CreateEnvelope(ctx context.Context, req EnvelopeRequest) (string, error) {
	if d.AccessToken == "" || d.AccountID == "" {
		return "", fmt.Errorf("docusign not configured")
	}
	body := map[string]any{
		"emailSubject": req.Subject,
		"emailBlurb":   req.Message,
		"documents": []map[string]any{
			{
				"documentBase64": base64.StdEncoding.EncodeToString(req.DocumentPDF),
				"name":           req.DocumentName,
				"fileExtension":  "pdf",
				"documentId":     "1",
			},
		},
		"recipients": map[string]any{
			"signers": []map[string]any{
				{
					"email":        req.SignerEmail,
					"name":         req.SignerName,
					"recipientId":  "1",
					"routingOrder": "1",
					"tabs": map[string]any{
						"signHereTabs": []map[string]any{
							{
								"documentId":   "1",
								"anchorString": "Signature:",
							},
						},
					},
				},
			},
		},
		"status": "sent",
	}
	if req.CallbackURL != "" {
		body["eventNotification"] = map[string]any{
			"url":            req.CallbackURL,
			"loggingEnabled": "true",
			"envelopeEvents": []map[string]any{
				{"envelopeEventStatusCode": "completed"},
				{"envelopeEventStatusCode": "declined"},
				{"envelopeEventStatusCode": "voided"},
			},
		}
	}
	payload, _ := json.Marshal(body)
	endpoint := fmt.Sprintf("%s/v2.1/accounts/%s/envelopes",
		strings.TrimRight(d.BaseURL, "/"), d.AccountID)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Authorization", "Bearer "+d.AccessToken)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := d.client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("docusign http: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("docusign create %d: %s", resp.StatusCode, string(raw))
	}
	var out struct {
		EnvelopeID string `json:"envelopeId"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", err
	}
	return out.EnvelopeID, nil
}

// GetStatus polls envelope status.
func (d *DocuSign) GetStatus(ctx context.Context, envelopeID string) (string, error) {
	if d.AccessToken == "" || d.AccountID == "" {
		return "", fmt.Errorf("docusign not configured")
	}
	endpoint := fmt.Sprintf("%s/v2.1/accounts/%s/envelopes/%s",
		strings.TrimRight(d.BaseURL, "/"), d.AccountID, envelopeID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+d.AccessToken)
	resp, err := d.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var out struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	return out.Status, nil
}
