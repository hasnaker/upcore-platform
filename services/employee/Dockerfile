# syntax=docker/dockerfile:1.7
# Root context: `docker build -f services/employee/Dockerfile .` (monorepo)
# replace github.com/upcore/saga => ../../packages/go/saga için shared paket kopyalanır.

FROM golang:1.25-alpine AS builder
WORKDIR /src

# Shared paketler (replace directive için)
COPY packages/go/saga/ ./packages/go/saga/

# Service deps
COPY services/employee/go.mod services/employee/go.sum* ./services/employee/
WORKDIR /src/services/employee
RUN go mod download

# Service kaynak kodu
COPY services/employee/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/employee ./cmd

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=builder /out/employee /app/employee
EXPOSE 8003
USER nonroot:nonroot
ENTRYPOINT ["/app/employee"]
