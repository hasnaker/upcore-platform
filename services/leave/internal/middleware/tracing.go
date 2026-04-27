package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

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

// TracerProvider installs an OTLP/HTTP tracer (no-op when endpoint is empty).
func TracerProvider(ctx context.Context, endpoint, serviceName, serviceVersion string) (func(context.Context) error, error) {
	if strings.TrimSpace(endpoint) == "" {
		otel.SetTracerProvider(sdktrace.NewTracerProvider())
		return func(context.Context) error { return nil }, nil
	}
	exporter, err := otlptrace.New(ctx,
		otlptracehttp.NewClient(
			otlptracehttp.WithEndpoint(endpoint),
			otlptracehttp.WithInsecure(),
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
		propagation.TraceContext{}, propagation.Baggage{},
	))
	return tp.Shutdown, nil
}

// Tracing wraps each request in an OTel server span.
func Tracing(serviceName string) func(http.Handler) http.Handler {
	tracer := otel.Tracer(serviceName)
	prop := otel.GetTextMapPropagator()
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := prop.Extract(r.Context(), propagation.HeaderCarrier(r.Header))
			route := routeLabel(r)
			ctx, span := tracer.Start(ctx, fmt.Sprintf("%s %s", r.Method, route),
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

// StartSpan — service-layer manual span helper.
func StartSpan(ctx context.Context, name string, attrs ...attribute.KeyValue) (context.Context, trace.Span) {
	return otel.Tracer("leave").Start(ctx, name, trace.WithAttributes(attrs...))
}
