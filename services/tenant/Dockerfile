# syntax=docker/dockerfile:1.7

FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/tenant ./cmd

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=builder /out/tenant /app/tenant
COPY --from=builder /src/migrations /app/migrations
EXPOSE 8002
USER nonroot:nonroot
ENTRYPOINT ["/app/tenant"]
