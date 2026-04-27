package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/pdf"
	"github.com/upcore/employee/internal/service"
)

// OfferPDFHandler serves the single-offer PDF.
type OfferPDFHandler struct {
	offers *service.OfferService
}

// NewOfferPDFHandler constructs the handler.
func NewOfferPDFHandler(offers *service.OfferService) *OfferPDFHandler {
	return &OfferPDFHandler{offers: offers}
}

// Download serves GET /offers/{id}/pdf — teklif mektubu PDF.
func (h *OfferPDFHandler) Download(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	o, err := h.offers.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	body, err := pdf.RenderOffer(pdf.OfferDoc{
		TenantName: "UpCore Tenant",
		Offer:      o,
	})
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, ErrorResponse{
			Error: "pdf_render_failed", Message: err.Error(),
		})
		return
	}
	fname := "teklif_" + id.String()[:8] + ".pdf"
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+fname+"\"")
	_, _ = w.Write(body)
}
