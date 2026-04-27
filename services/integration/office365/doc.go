// Package office365 provides the Microsoft 365 SSO validation hooks and MS
// Graph Calendar integration for intervention check-ins.
//
// SSO: Clerk already handles OIDC/SAML and hands UpCore a signed JWT with the
// `oid` + `tid` claims. This package exposes a `ValidateClerkClaim` helper
// that cross-checks the claim against the per-tenant allow-list.
//
// Calendar: Uses MS Graph v1.0 /me/events (user-delegated) or
// /users/{id}/events (application-delegated via domain-wide mailbox
// permission). Payloads mirror Google calendar.go intents so we can pick the
// provider dynamically based on the user's primary email domain.
package office365
