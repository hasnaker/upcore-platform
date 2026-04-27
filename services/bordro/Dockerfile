# syntax=docker/dockerfile:1.7
FROM golang:1.25-alpine AS builder
WORKDIR /src
# bordro depends on sibling packages/go/bordro via replace directive; copy
# both the service and the package into the build context.
COPY services/bordro/go.mod services/bordro/go.sum* ./services/bordro/
COPY packages/go/bordro ./packages/go/bordro
COPY services/bordro ./services/bordro
WORKDIR /src/services/bordro
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/bordro ./cmd

FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata wget && \
    adduser -D -H -u 10001 appuser
COPY --from=builder /out/bordro /usr/local/bin/bordro
USER appuser
EXPOSE 8015
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q -O- http://localhost:8015/health || exit 1
ENTRYPOINT ["/usr/local/bin/bordro"]
