package handler

import (
	"net/http"
	"strconv"

	"github.com/upcore/document/internal/service"
)

// ExpiryHandler exposes endpoints related to expiring documents.
type ExpiryHandler struct {
	svc *service.ExpiryService
	dep Dependencies
}

// NewExpiryHandler constructs an ExpiryHandler.
func NewExpiryHandler(svc *service.ExpiryService, dep Dependencies) *ExpiryHandler {
	return &ExpiryHandler{svc: svc, dep: dep}
}

// List handles GET /documents/expiring.
func (h *ExpiryHandler) List(w http.ResponseWriter, r *http.Request) {
	within := 30
	if v := r.URL.Query().Get("within_days"); v != "" {
		n, err := strconv.Atoi(v)
		if err == nil && n > 0 {
			within = n
		}
	}
	items, err := h.svc.ListExpiring(r.Context(), within)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "within_days": within})
}

// Notify handles POST /documents/expiring/notify.
func (h *ExpiryHandler) Notify(w http.ResponseWriter, r *http.Request) {
	n, err := h.svc.ScanAndNotify(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"events_emitted": n})
}
