// Atom 1.0 feed for the public status page.
//
// Companion to handler.go's RSS 2.0 feed. Atom gives us:
//   - Stable entry IDs (URI-shaped)
//   - Proper `updated` timestamps (needed for feed-reader diffing)
//   - Self/alternate link relations (feed discovery)
//
// Both feeds publish the same last-30-day incidents. Clients can pick whichever
// they prefer; we advertise both via <link rel="alternate"> in the status page
// <head> (set in apps/status).
package handler

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"time"
)

// atomLink is a minimal Atom <link> element.
type atomLink struct {
	XMLName xml.Name `xml:"link"`
	Rel     string   `xml:"rel,attr"`
	Href    string   `xml:"href,attr"`
	Type    string   `xml:"type,attr,omitempty"`
}

type atomAuthor struct {
	XMLName xml.Name `xml:"author"`
	Name    string   `xml:"name"`
}

type atomContent struct {
	XMLName xml.Name `xml:"content"`
	Type    string   `xml:"type,attr"`
	Value   string   `xml:",chardata"`
}

type atomEntry struct {
	XMLName xml.Name    `xml:"entry"`
	Title   string      `xml:"title"`
	ID      string      `xml:"id"`
	Updated string      `xml:"updated"`
	Link    atomLink    `xml:"link"`
	Summary string      `xml:"summary,omitempty"`
	Content atomContent `xml:"content,omitempty"`
}

type atomFeed struct {
	XMLName  xml.Name    `xml:"feed"`
	Xmlns    string      `xml:"xmlns,attr"`
	Title    string      `xml:"title"`
	ID       string      `xml:"id"`
	Updated  string      `xml:"updated"`
	Subtitle string      `xml:"subtitle,omitempty"`
	Links    []atomLink  `xml:"link"`
	Author   atomAuthor  `xml:"author"`
	Entries  []atomEntry `xml:"entry"`
}

// Atom serves the Atom 1.0 feed.
func (h *Handler) Atom(w http.ResponseWriter, r *http.Request) {
	incs, err := h.Svc.ListIncidents(r.Context(), 30, false)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError("atom_failed", err))
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)
	entries := make([]atomEntry, 0, len(incs))
	latest := time.Time{}
	for _, i := range incs {
		updated := i.StartedAt
		if i.ResolvedAt != nil && i.ResolvedAt.After(updated) {
			updated = *i.ResolvedAt
		}
		if updated.After(latest) {
			latest = updated
		}
		href := fmt.Sprintf("%s/status/incidents/%s", h.PublicBaseURL, i.ID)
		entries = append(entries, atomEntry{
			Title:   fmt.Sprintf("[%s] %s", i.Status, i.Title),
			ID:      fmt.Sprintf("tag:status.upcore.io,2025:incident/%s", i.ID),
			Updated: updated.UTC().Format(time.RFC3339),
			Link: atomLink{
				Rel:  "alternate",
				Href: href,
				Type: "text/html",
			},
			Summary: fmt.Sprintf("Etki: %s · Durum: %s", i.Impact, i.Status),
			Content: atomContent{
				Type:  "text",
				Value: fmt.Sprintf("Etki: %s · Durum: %s", i.Impact, i.Status),
			},
		})
	}

	feedUpdated := now
	if !latest.IsZero() {
		feedUpdated = latest.UTC().Format(time.RFC3339)
	}

	feed := atomFeed{
		Xmlns:    "http://www.w3.org/2005/Atom",
		Title:    "UpCore Status",
		ID:       "tag:status.upcore.io,2025:feed",
		Updated:  feedUpdated,
		Subtitle: "UpCore platform status ve incident akışı",
		Links: []atomLink{
			{Rel: "self", Href: h.PublicBaseURL + "/api/v2/atom", Type: "application/atom+xml"},
			{Rel: "alternate", Href: h.PublicBaseURL + "/status", Type: "text/html"},
		},
		Author:  atomAuthor{Name: "UpCore Platform"},
		Entries: entries,
	}

	w.Header().Set("Content-Type", "application/atom+xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=120")
	_, _ = w.Write([]byte(xml.Header))
	_ = xml.NewEncoder(w).Encode(feed)
}

