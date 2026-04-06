.PHONY: tidy build run test test-verbose lint docker

tidy:
	go mod tidy

build:
	go build -o bin/leave ./cmd

run:
	go run ./cmd

test:
	go test ./...

test-verbose:
	go test -v ./...

lint:
	go vet ./...

docker:
	docker build -t upcore/leave:local .
