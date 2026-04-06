SERVICE := ats
PKG := ./...

.PHONY: build run test cover vet tidy lint fmt docker clean

build:
	go build -o bin/$(SERVICE) ./cmd

run:
	go run ./cmd

test:
	go test -race -count=1 $(PKG)

cover:
	go test -race -coverprofile=coverage.out -covermode=atomic $(PKG)
	go tool cover -func=coverage.out | tail -n 1

vet:
	go vet $(PKG)

tidy:
	go mod tidy

fmt:
	gofmt -w .

lint: vet
	@echo "lint ok"

docker:
	docker build -t upcore/$(SERVICE):dev -f Dockerfile .

clean:
	rm -rf bin coverage.out
