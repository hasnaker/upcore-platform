.PHONY: build run test lint clean docker

APP_NAME := api-gateway
BUILD_DIR := ./bin

build:
	go build -trimpath -ldflags="-s -w" -o $(BUILD_DIR)/$(APP_NAME) ./cmd

run: build
	ROUTES_CONFIG_PATH=./config/routes.yaml $(BUILD_DIR)/$(APP_NAME)

test:
	go test -v -race -coverprofile=coverage.out ./...

test-short:
	go test -short -v ./...

coverage: test
	go tool cover -html=coverage.out -o coverage.html

lint:
	golangci-lint run ./...

clean:
	rm -rf $(BUILD_DIR) coverage.out coverage.html

docker:
	docker build -t upcore/$(APP_NAME):latest .

docker-run:
	docker run -p 8080:8080 \
		-e REDIS_URL=redis://host.docker.internal:6379/0 \
		-e ROUTES_CONFIG_PATH=/etc/upcore/routes.yaml \
		upcore/$(APP_NAME):latest

tidy:
	go mod tidy
