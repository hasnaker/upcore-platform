.PHONY: help run build test test-cover lint vet fmt tidy clean migrate

BINARY := bin/auth
PKG    := ./...
PORT   ?= 8001

help:
	@echo "Targets:"
	@echo "  run         - go run ./cmd"
	@echo "  build       - compile binary to bin/auth"
	@echo "  test        - go test ./..."
	@echo "  test-cover  - run tests with coverage"
	@echo "  lint        - go vet ./..."
	@echo "  vet         - alias for lint"
	@echo "  fmt         - gofmt -s -w ."
	@echo "  tidy        - go mod tidy"
	@echo "  clean       - rm -rf bin/"
	@echo "  migrate     - apply migrations (requires migrate CLI)"

run:
	PORT=$(PORT) go run ./cmd

build:
	@mkdir -p bin
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o $(BINARY) ./cmd

test:
	go test $(PKG) -race -count=1

test-cover:
	go test $(PKG) -race -count=1 -coverprofile=coverage.out -covermode=atomic
	go tool cover -func=coverage.out

lint: vet

vet:
	go vet $(PKG)

fmt:
	gofmt -s -w .

tidy:
	go mod tidy

clean:
	rm -rf bin coverage.out

migrate:
	migrate -path migrations -database "$(DATABASE_URL)" up
