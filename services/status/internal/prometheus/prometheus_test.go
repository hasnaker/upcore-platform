package prometheus

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSampleHealthUp(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query().Get("query")
		w.Header().Set("Content-Type", "application/json")
		if len(q) > 0 && q[0] == 'u' { // up{}
			_, _ = w.Write([]byte(`{"status":"success","data":{"resultType":"vector","result":[
				{"metric":{"job":"auth"},"value":[123, "1"]},
				{"metric":{"job":"employee"},"value":[123, "0"]}
			]}}`))
			return
		}
		_, _ = w.Write([]byte(`{"status":"success","data":{"resultType":"vector","result":[
			{"metric":{"job":"auth"},"value":[123, "0.12"]},
			{"metric":{"job":"employee"},"value":[123, "2.5"]}
		]}}`))
	}))
	defer srv.Close()

	c := NewClient(srv.URL)
	health, ok := c.SampleHealth(context.Background(), []string{"auth", "employee"})
	if !ok {
		t.Fatalf("expected ok")
	}
	if !health["auth"].Up {
		t.Fatalf("auth should be up")
	}
	if health["employee"].Up {
		t.Fatalf("employee should be down")
	}
	if health["auth"].P95LatencyMs != 120 {
		t.Fatalf("auth latency: %d", health["auth"].P95LatencyMs)
	}
	if health["employee"].P95LatencyMs != 2500 {
		t.Fatalf("employee latency: %d", health["employee"].P95LatencyMs)
	}
}

func TestSampleHealthPrometheusDown(t *testing.T) {
	c := NewClient("http://127.0.0.1:1") // unreachable
	_, ok := c.SampleHealth(context.Background(), []string{"auth"})
	if ok {
		t.Fatalf("expected ok=false when unreachable")
	}
}

func TestSampleHealthEmpty(t *testing.T) {
	c := NewClient("http://does-not-matter")
	health, ok := c.SampleHealth(context.Background(), nil)
	if !ok {
		t.Fatalf("expected ok=true for empty")
	}
	if len(health) != 0 {
		t.Fatalf("expected empty")
	}
}
