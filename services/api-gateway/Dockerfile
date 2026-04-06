# syntax=docker/dockerfile:1.6
FROM golang:1.23-alpine AS builder
WORKDIR /app

# Better layer caching
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api-gateway ./cmd

FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata && \
    adduser -D -H -u 10001 appuser

COPY --from=builder /out/api-gateway /usr/local/bin/api-gateway
COPY config/routes.yaml /etc/upcore/routes.yaml

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost:8080/health || exit 1

ENTRYPOINT ["/usr/local/bin/api-gateway"]
