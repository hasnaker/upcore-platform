package handler

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"strconv"

	"github.com/google/uuid"

	"github.com/upcore/bordrosvc/internal/middleware"
	"github.com/upcore/bordrosvc/internal/repository"
)

// MuhtasarHandler exposes monthly muhtasar beyannamesi aggregation + export.
type MuhtasarHandler struct {
	repo repository.MuhtasarRepository
}

// NewMuhtasarHandler constructs the handler.
func NewMuhtasarHandler(repo repository.MuhtasarRepository) *MuhtasarHandler {
	return &MuhtasarHandler{repo: repo}
}

// Summary serves GET /muhtasar?year=2026&month=4 — JSON aggregate + satırlar.
func (h *MuhtasarHandler) Summary(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	year, _ := strconv.Atoi(r.URL.Query().Get("year"))
	month, _ := strconv.Atoi(r.URL.Query().Get("month"))
	if year == 0 || month == 0 {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{
			Error: "invalid", Message: "year + month query params zorunlu",
		})
		return
	}
	sum, rows, err := h.repo.Monthly(r.Context(), tid, year, month)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"summary": sum, "rows": rows})
}

// ExportXML serves GET /muhtasar/xml?year=2026&month=4 — GIB 1003B muhtasar
// formatına yakın sadeleştirilmiş XML. Gerçek GİB beyanname üretimi için
// muhasebeci kontrolü gerekir; bu export "beyanname hazırlık" aşamasıdır.
func (h *MuhtasarHandler) ExportXML(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	year, _ := strconv.Atoi(r.URL.Query().Get("year"))
	month, _ := strconv.Atoi(r.URL.Query().Get("month"))
	if year == 0 || month == 0 {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "invalid"})
		return
	}
	sum, rows, err := h.repo.Monthly(r.Context(), tid, year, month)
	if err != nil {
		WriteError(w, err)
		return
	}

	type Satir struct {
		XMLName    xml.Name `xml:"Satir"`
		TCKN       string   `xml:"TCKN,omitempty"`
		AdSoyad    string   `xml:"AdSoyad"`
		BrutTutar  float64  `xml:"BrutTutar"`
		GelirV     float64  `xml:"GelirVergisi"`
		DamgaV     float64  `xml:"DamgaVergisi"`
		SGKPayi    float64  `xml:"SGKPayi"`
	}
	type Beyanname struct {
		XMLName       xml.Name `xml:"MuhtasarBeyanname"`
		Donem         string   `xml:"Donem"`
		PersonelSayisi int     `xml:"PersonelSayisi"`
		Toplamlar     struct {
			BrutToplam     float64 `xml:"BrutToplam"`
			GelirVergisi   float64 `xml:"GelirVergisi"`
			DamgaVergisi   float64 `xml:"DamgaVergisi"`
			SGKPayi        float64 `xml:"SGKIsciPayi"`
			SGKIsverenPayi float64 `xml:"SGKIsverenPayi"`
			Issizlik       float64 `xml:"IssizlikPrimleri"`
		} `xml:"Toplamlar"`
		Satirlar []Satir `xml:"Satirlar>Satir"`
	}

	doc := Beyanname{
		Donem:          fmt.Sprintf("%04d-%02d", sum.Year, sum.Month),
		PersonelSayisi: sum.EmployeeCount,
	}
	doc.Toplamlar.BrutToplam = sum.TotalGross
	doc.Toplamlar.GelirVergisi = sum.TotalIncomeTax
	doc.Toplamlar.DamgaVergisi = sum.TotalStampTax
	doc.Toplamlar.SGKPayi = sum.TotalSGKEmployee
	doc.Toplamlar.SGKIsverenPayi = sum.TotalSGKEmployer
	doc.Toplamlar.Issizlik = sum.TotalUnemployment

	for _, r := range rows {
		s := Satir{
			AdSoyad:   r.Ad + " " + r.Soyad,
			BrutTutar: r.BrutToplam,
			GelirV:    r.GelirV,
			DamgaV:    r.DamgaV,
			SGKPayi:   r.SGKPayi,
		}
		if r.TCKN != nil {
			s.TCKN = *r.TCKN
		}
		doc.Satirlar = append(doc.Satirlar, s)
	}

	body, err := xml.MarshalIndent(doc, "", "  ")
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, ErrorResponse{
			Error: "xml_failed", Message: err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Content-Disposition",
		fmt.Sprintf("attachment; filename=\"muhtasar_%04d_%02d.xml\"", year, month))
	_, _ = w.Write([]byte(xml.Header))
	_, _ = w.Write(body)
}
