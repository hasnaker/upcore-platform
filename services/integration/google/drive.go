package google

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
)

// DriveFile represents a Drive API File resource (subset).
type DriveFile struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	MimeType string   `json:"mimeType"`
	Parents  []string `json:"parents,omitempty"`
	WebViewLink string `json:"webViewLink,omitempty"`
}

// UploadKVKKDocument uploads a KVKK-sensitive document to the user's Drive
// using the Drive API v3 multipart upload. folderID is optional.
//
// KVKK NOTE: Files are stored on Drive using the `drive.file` scope which
// limits UpCore's access to files it itself created. Use this only for
// explicit employee-facing documents (payslips, contracts) and never for
// aggregate PII exports.
func UploadKVKKDocument(ctx context.Context, hc *http.Client, accessToken, filename, mime, folderID string, payload []byte) (*DriveFile, error) {
	meta := map[string]any{
		"name":     filename,
		"mimeType": mime,
	}
	if folderID != "" {
		meta["parents"] = []string{folderID}
	}
	metaJSON, _ := json.Marshal(meta)

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	metaHdr := make(textproto.MIMEHeader)
	metaHdr.Set("Content-Type", "application/json; charset=UTF-8")
	mp, _ := mw.CreatePart(metaHdr)
	_, _ = mp.Write(metaJSON)

	fileHdr := make(textproto.MIMEHeader)
	fileHdr.Set("Content-Type", mime)
	fp, _ := mw.CreatePart(fileHdr)
	_, _ = fp.Write(payload)
	_ = mw.Close()

	endpoint := "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,parents,webViewLink"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &buf)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "multipart/related; boundary="+mw.Boundary())

	resp, err := hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("google drive upload %d: %s", resp.StatusCode, string(raw))
	}
	var out DriveFile
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
