package handler

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/upcore/organization/internal/middleware"
	"github.com/upcore/organization/internal/service"
)

// ChartExportHandler serves organization tree as SVG. SVG is vector-ready;
// print / save-as-PDF from browser does the rest, without an external
// Chrome dependency on the server.
type ChartExportHandler struct {
	orgSvc *service.OrgService
}

// NewChartExportHandler constructs the handler.
func NewChartExportHandler(orgSvc *service.OrgService) *ChartExportHandler {
	return &ChartExportHandler{orgSvc: orgSvc}
}

// ExportSVG serves GET /organization/chart.svg.
func (h *ChartExportHandler) ExportSVG(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	tree, err := h.orgSvc.GetTree(r.Context(), tid)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	svg := renderTreeSVG(tree)
	w.Header().Set("Content-Type", "image/svg+xml")
	w.Header().Set("Content-Disposition", "inline; filename=\"org-chart.svg\"")
	_, _ = w.Write([]byte(svg))
}

// renderTreeSVG layouts a simple horizontal tree. Not a replacement for
// d3-org-chart but sufficient for printable overview + email attachment.
func renderTreeSVG(tree []*service.TreeNode) string {
	const boxW = 180
	const boxH = 48
	const hGap = 40
	const vGap = 40

	var b strings.Builder
	type pos struct{ x, y, w int }
	positions := map[string]pos{}
	var maxX, maxY int

	// Simple recursive layout — left-to-right packing.
	var layout func(nodes []*service.TreeNode, depth int, startY int) int
	layout = func(nodes []*service.TreeNode, depth int, startY int) int {
		y := startY
		for _, n := range nodes {
			x := depth * (boxW + hGap)
			positions[n.ID.String()] = pos{x: x, y: y, w: boxW}
			if x+boxW > maxX {
				maxX = x + boxW
			}
			childY := y + boxH + vGap
			childrenEnd := childY
			if len(n.Children) > 0 {
				childrenEnd = layout(n.Children, depth+1, y)
				y = childrenEnd
			} else {
				y += boxH + vGap
			}
			if y > maxY {
				maxY = y
			}
			_ = childY
		}
		return y
	}
	layout(tree, 0, 20)

	b.WriteString(fmt.Sprintf(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d" font-family="system-ui,sans-serif">
<style>
  .box{fill:#fff;stroke:#EDEDED;stroke-width:1.5;rx:8;}
  .box-title{font-size:13px;fill:#0A0A0A;font-weight:600;}
  .box-sub{font-size:10px;fill:#737373;}
  .edge{stroke:#CCCCCC;stroke-width:1.5;fill:none;}
</style>`, maxX+40, maxY+40, maxX+40, maxY+40))

	// Draw edges (manager → subordinate).
	var drawEdges func(nodes []*service.TreeNode)
	drawEdges = func(nodes []*service.TreeNode) {
		for _, n := range nodes {
			p := positions[n.ID.String()]
			for _, c := range n.Children {
				cp := positions[c.ID.String()]
				x1 := p.x + boxW
				y1 := p.y + boxH/2
				x2 := cp.x
				y2 := cp.y + boxH/2
				mid := (x1 + x2) / 2
				b.WriteString(fmt.Sprintf(`<path class="edge" d="M%d,%d C%d,%d %d,%d %d,%d"/>`,
					x1, y1, mid, y1, mid, y2, x2, y2))
			}
			drawEdges(n.Children)
		}
	}
	drawEdges(tree)

	// Draw boxes.
	var drawBoxes func(nodes []*service.TreeNode)
	drawBoxes = func(nodes []*service.TreeNode) {
		for _, n := range nodes {
			p := positions[n.ID.String()]
			b.WriteString(fmt.Sprintf(`<rect class="box" x="%d" y="%d" width="%d" height="%d"/>`,
				p.x, p.y, boxW, boxH))
			name := n.NameTR
			if name == "" {
				name = n.Code
			}
			b.WriteString(fmt.Sprintf(`<text class="box-title" x="%d" y="%d">%s</text>`,
				p.x+12, p.y+22, xmlEscape(name)))
			drawBoxes(n.Children)
		}
	}
	drawBoxes(tree)
	b.WriteString("</svg>")
	return b.String()
}

func xmlEscape(s string) string {
	var buf strings.Builder
	_ = xml.EscapeText(&buf, []byte(s))
	return buf.String()
}
