package service

import (
	"bytes"
	"fmt"
	"html"
	"regexp"
	"strings"
	"text/template"

	"github.com/upcore/notification/internal/domain"
)

// Renderer handles template variable substitution and HTML sanitization.
type Renderer struct{}

// NewRenderer constructs a Renderer.
func NewRenderer() *Renderer {
	return &Renderer{}
}

// Render performs Go text/template substitution. The template string uses
// {{.VarName}} syntax. Returns the rendered string.
func (r *Renderer) Render(tmpl string, vars map[string]any) (string, error) {
	t, err := template.New("notif").Option("missingkey=error").Parse(tmpl)
	if err != nil {
		return "", fmt.Errorf("%w: parse template: %v", domain.ErrTemplateRenderFailed, err)
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, vars); err != nil {
		return "", fmt.Errorf("%w: execute template: %v", domain.ErrTemplateRenderFailed, err)
	}
	return buf.String(), nil
}

// RenderHTML renders a template and sanitizes the output to prevent XSS.
func (r *Renderer) RenderHTML(tmpl string, vars map[string]any) (string, error) {
	// First sanitize all input variables.
	sanitized := make(map[string]any, len(vars))
	for k, v := range vars {
		if s, ok := v.(string); ok {
			sanitized[k] = html.EscapeString(s)
		} else {
			sanitized[k] = v
		}
	}

	result, err := r.Render(tmpl, sanitized)
	if err != nil {
		return "", err
	}

	// Strip any remaining dangerous tags.
	result = stripDangerousTags(result)
	return result, nil
}

// ValidateVariables checks that all expected variables are present in the
// provided vars map.
func (r *Renderer) ValidateVariables(expected []string, vars map[string]any) error {
	var missing []string
	for _, key := range expected {
		if _, ok := vars[key]; !ok {
			missing = append(missing, key)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("%w: %s", domain.ErrMissingTemplateVar, strings.Join(missing, ", "))
	}
	return nil
}

// dangerousTagPattern matches script, iframe, object, embed, and event handler attributes.
var dangerousTagPattern = regexp.MustCompile(`(?i)<\s*(?:script|iframe|object|embed|link|style)[^>]*>.*?</\s*(?:script|iframe|object|embed|link|style)\s*>|<\s*(?:script|iframe|object|embed|link|style)[^>]*/?>|on\w+\s*=\s*["'][^"']*["']`)

func stripDangerousTags(s string) string {
	return dangerousTagPattern.ReplaceAllString(s, "")
}
