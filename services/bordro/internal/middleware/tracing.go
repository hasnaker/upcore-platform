package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	sdkresource "go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
	"go.opentelemetry.io/otel/trace"
)

// TracerProvider configures an OTLP/HTTP tracer. `OTEL_EXPORTER_OTLP_ENDPOINT`
// env controls the destination (http://otel-collector:4318 for local compose).
// Returns a shutdown func — caller defers it during graceful shutdown.
func TracerProvider(ctx context.Context, endpoint, serviceName, serviceVersion string) (func(context.Context) error, error) {
	if strings.TrimSpace(endpoint) == "" {
		// Tracing is optional. Return a no-op shutdown.
		otel.SetTracerProvider(sdktrace.NewTracerProvider())
		return func(context.Context) error { return nil }, nil
	}

	exporter, err := otlptrace.New(ctx,
		otlptracehttp.NewClient(
			otlptracehttp.WithEndpoint(endpoint),
			otlptracehttp.WithInsecure(), // TLS optional for in-cluster otel-collector
		),
	)
	if err != nil {
		return nil, fmt.Errorf("otlp exporter: %w", err)
	}

	res, err := sdkresource.New(ctx,
		sdkresource.WithAttributes(
			semconv.ServiceName(serviceName),
			semconv.ServiceVersion(serviceVersion),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("otel resource: %w", err)
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter, sdktrace.WithBatchTimeout(5*time.Second)),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(1.0))),
	)
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	return tp.Shutdown, nil
}

// Tracing wraps each request in an OpenTelemetry span, propagates W3C
// traceparent headers upstream (via ctx), and tags standard HTTP attrs.
// Place BEFORE Metrics so span covers full request lifecycle.
func Tracing(serviceName string) func(http.Handler) http.Handler {
	tracer := otel.Tracer(serviceName)
	prop := otel.GetTextMapPropagator()
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract upstream trace context (if client sent traceparent).
			ctx := prop.Extract(r.Context(), propagation.HeaderCarrier(r.Header))

			route := routeLabel(r)
			spanName := fmt.Sprintf("%s %s", r.Method, route)
			ctx, span := tracer.Start(ctx, spanName,
				trace.WithSpanKind(trace.SpanKindServer),
				trace.WithAttributes(
					semconv.HTTPRequestMethodKey.String(r.Method),
					semconv.HTTPRoute(route),
					semconv.URLFull(r.URL.String()),
					attribute.String("net.peer.ip", r.RemoteAddr),
				),
			)
			defer span.End()

			sr := &tracedStatusRec{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(sr, r.WithContext(ctx))

			span.SetAttributes(semconv.HTTPResponseStatusCodeKey.Int(sr.status))
			if sr.status >= 500 {
				span.SetStatus(500, "server error")
			}
		})
	}
}

type tracedStatusRec struct {
	http.ResponseWriter
	status int
}

func (s *tracedStatusRec) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

// StartSpan is a convenience wrapper to create a span inside service code.
// Example: ctx, span := middleware.StartSpan(ctx, "PayrollService.CalculateRun"); defer span.End()
func StartSpan(ctx context.Context, name string, attrs ...attribute.KeyValue) (context.Context, trace.Span) {
	tracer := otel.Tracer("bordro")
	return tracer.Start(ctx, name, trace.WithAttributes(attrs...))
}

// Ensure chi import stays — used only when routeLabel moves here later.
var _ = chi.NewRouter
