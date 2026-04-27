SHELL := /bin/bash

.PHONY: tidy build run test vet lint clean docker

tidy:
	go mod tidy

build:
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o bin/mobility ./cmd

run:
	PORT=8013 go run ./cmd

test:
	go test -race -count=1 ./...

vet:
	go vet ./...

lint:
	@command -v golangci-lint >/dev/null 2>&1 && golangci-lint run || echo "golangci-lint not installed, skipping"

clean:
	rm -rf bin

docker:
	docker build -t upcore/mobility:dev .
