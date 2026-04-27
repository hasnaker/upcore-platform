# syntax=docker/dockerfile:1.6
FROM golang:1.25-alpine AS builder
WORKDIR /app

# Better layer caching
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/auth ./cmd

FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata && \
    adduser -D -H -u 10001 appuser
COPY --from=builder /out/auth /usr/local/bin/auth

USER appuser
EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost:8001/health || exit 1

ENTRYPOINT ["/usr/local/bin/auth"]
