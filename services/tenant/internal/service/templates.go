package service

import (
	"embed"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"
)

// templatesFS embeds the four canned tenant templates (belediye, holding,
// tech, kobi). Loaded once at package init via loadTemplates.
//
//go:embed templates_data/*.json
var templatesFS embed.FS

// TenantTemplate describes a pre-built tenant seed (departments, positions,
// KVKK notices, module defaults).
type TenantTemplate struct {
	Code           string                 `json:"code"`
	Name           string                 `json:"name"`
	Description    string                 `json:"description"`
	DefaultLocale  string                 `json:"default_locale"`
	DefaultCountry string                 `json:"default_country"`
	DefaultPlanID  string                 `json:"default_plan_id"`
	Modules        []string               `json:"modules"`
	Departments    []TemplateDepartment   `json:"departments"`
	Positions      []TemplatePosition     `json:"positions"`
	KVKKNotices    []TemplateKVKKNotice   `json:"kvkk_notices"`
	FeatureFlags   map[string]bool        `json:"feature_flags"`
}

// TemplateDepartment is one node in the template org chart.
type TemplateDepartment struct {
	Code   string `json:"code"`
	Name   string `json:"name"`
	Parent string `json:"parent,omitempty"`
}

// TemplatePosition is a role suggestion tied to a department.
type TemplatePosition struct {
	Code          string `json:"code"`
	Name          string `json:"name"`
	Department    string `json:"department"`
	PersonnelType string `json:"personnel_type,omitempty"`
}

// TemplateKVKKNotice is one KVKK notice document stub.
type TemplateKVKKNotice struct {
	Audience string `json:"audience"`
	Version  string `json:"version"`
	Title    string `json:"title"`
}

var (
	templateOnce   sync.Once
	templateCache  map[string]*TenantTemplate
	templateErr    error
)

// LoadTemplates returns the four canned templates, keyed by code. Safe to call
// concurrently — result is cached.
func LoadTemplates() (map[string]*TenantTemplate, error) {
	templateOnce.Do(func() {
		templateCache = map[string]*TenantTemplate{}
		entries, err := templatesFS.ReadDir("templates_data")
		if err != nil {
			templateErr = fmt.Errorf("read embed dir: %w", err)
			return
		}
		for _, e := range entries {
			if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
				continue
			}
			data, rerr := templatesFS.ReadFile("templates_data/" + e.Name())
			if rerr != nil {
				templateErr = fmt.Errorf("read %s: %w", e.Name(), rerr)
				return
			}
			var t TenantTemplate
			if jerr := json.Unmarshal(data, &t); jerr != nil {
				templateErr = fmt.Errorf("parse %s: %w", e.Name(), jerr)
				return
			}
			if t.Code == "" {
				templateErr = fmt.Errorf("template %s missing code", e.Name())
				return
			}
			templateCache[t.Code] = &t
		}
	})
	return templateCache, templateErr
}

// GetTemplate returns a template by code, or nil if not found.
func GetTemplate(code string) (*TenantTemplate, bool) {
	all, err := LoadTemplates()
	if err != nil {
		return nil, false
	}
	t, ok := all[strings.ToLower(strings.TrimSpace(code))]
	return t, ok
}

// ListTemplates returns templates sorted by code.
func ListTemplates() []*TenantTemplate {
	all, err := LoadTemplates()
	if err != nil {
		return nil
	}
	out := make([]*TenantTemplate, 0, len(all))
	for _, t := range all {
		out = append(out, t)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Code < out[j].Code })
	return out
}
