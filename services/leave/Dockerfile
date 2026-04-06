# syntax=docker/dockerfile:1
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/leave ./cmd

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /out/leave /leave
EXPOSE 8006
USER nonroot:nonroot
ENTRYPOINT ["/leave"]
