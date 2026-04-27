// Package google provides the Google Workspace integration for UpCore —
// OAuth2 authorization, Admin SDK Directory sync (employees), Calendar API
// (intervention check-in events) and Drive API (optional KVKK document
// archive).
//
// Scopes used:
//
//   - https://www.googleapis.com/auth/admin.directory.user.readonly     (dir sync)
//   - https://www.googleapis.com/auth/admin.directory.group.readonly    (groups)
//   - https://www.googleapis.com/auth/calendar.events                   (check-ins)
//   - https://www.googleapis.com/auth/drive.file                        (KVKK archive)
//
// Install flow: Google OAuth consent → admin grants (domain-wide delegation
// recommended for multi-user calendar writes) → refresh token stored
// encrypted (pgcrypto) → background sync worker runs at T+5 min and then
// every 24h (delta).
//
// This package only exposes types + signatures; real wiring lives in
// services/integration/cmd/main.go and is referenced from the api-gateway.
package google
