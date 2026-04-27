# syntax=docker/dockerfile:1.7
FROM golang:1.25-alpine AS builder
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/performance ./cmd

FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata wget && \
    adduser -D -H -u 10001 appuser
COPY --from=builder /out/performance /usr/local/bin/performance
USER appuser
EXPOSE 8014
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q -O- http://localhost:8014/health || exit 1
ENTRYPOINT ["/usr/local/bin/performance"]
