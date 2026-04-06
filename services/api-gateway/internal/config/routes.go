package config

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// RateLimit defines per-user and per-tenant rate limits for a route.
type RateLimit struct {
	PerUser   int `yaml:"per_user"`
	PerTenant int `yaml:"per_tenant"`
}

// RouteConfig represents a single upstream route definition.
type RouteConfig struct {
	PathPrefix   string        `yaml:"path_prefix"`
	Upstream     string        `yaml:"upstream"`
	Target       string        `yaml:"target"`
	AuthRequired bool          `yaml:"auth_required"`
	Timeout      time.Duration `yaml:"timeout"`
	RateLimit    RateLimit     `yaml:"rate_limit"`
	Methods      []string      `yaml:"methods"`
}

// RoutesFile is the top-level YAML structure for routes.yaml.
type RoutesFile struct {
	Routes []RouteConfig `yaml:"routes"`
}

// LoadRoutes parses the routes configuration file.
func LoadRoutes(path string) ([]RouteConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read routes config %s: %w", path, err)
	}

	var rf RoutesFile
	if err := yaml.Unmarshal(data, &rf); err != nil {
		return nil, fmt.Errorf("parse routes config: %w", err)
	}

	if len(rf.Routes) == 0 {
		return nil, fmt.Errorf("no routes defined in %s", path)
	}

	for i, r := range rf.Routes {
		if r.PathPrefix == "" {
			return nil, fmt.Errorf("route %d: path_prefix is required", i)
		}
		if r.Target == "" {
			return nil, fmt.Errorf("route %d (%s): target is required", i, r.PathPrefix)
		}
		if r.Upstream == "" {
			return nil, fmt.Errorf("route %d (%s): upstream name is required", i, r.PathPrefix)
		}
		if r.Timeout == 0 {
			rf.Routes[i].Timeout = 30 * time.Second
		}
		if len(r.Methods) == 0 {
			rf.Routes[i].Methods = []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"}
		}
	}

	return rf.Routes, nil
}

// Match returns true if the request matches this route's path prefix and method.
func (r *RouteConfig) Match(req *http.Request) bool {
	if !strings.HasPrefix(req.URL.Path, r.PathPrefix) {
		return false
	}
	if len(r.Methods) == 0 {
		return true
	}
	method := strings.ToUpper(req.Method)
	for _, m := range r.Methods {
		if strings.ToUpper(m) == method {
			return true
		}
	}
	return false
}

// FindRoute returns the best matching route for the given request.
// It prefers the longest matching path prefix.
func FindRoute(routes []RouteConfig, req *http.Request) *RouteConfig {
	var best *RouteConfig
	bestLen := 0
	for i := range routes {
		if routes[i].Match(req) && len(routes[i].PathPrefix) > bestLen {
			best = &routes[i]
			bestLen = len(routes[i].PathPrefix)
		}
	}
	return best
}
