SHELL := /bin/bash

.PHONY: tidy build run test vet lint clean docker

tidy:
	go mod tidy

build:
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o bin/bordro ./cmd

run:
	PORT=8015 go run ./cmd

test:
	go test -race -count=1 ./...

vet:
	go vet ./...

lint:
	golangci-lint run ./...

clean:
	rm -rf bin/

docker:
	docker build -f Dockerfile -t upcore/bordro:dev ../..
