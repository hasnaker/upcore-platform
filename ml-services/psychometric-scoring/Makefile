.PHONY: install sync dev lint format typecheck test test-cov run clean docker-build

install:
	uv sync --all-extras

sync:
	uv sync

dev:
	uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8021

lint:
	uv run ruff check app tests

format:
	uv run ruff format app tests
	uv run ruff check --fix app tests

typecheck:
	uv run mypy app

test:
	uv run pytest -v

test-cov:
	uv run pytest -v --cov=app --cov-report=term-missing --cov-report=html

run:
	uv run uvicorn app.main:app --host 0.0.0.0 --port 8021

clean:
	rm -rf .venv .pytest_cache .mypy_cache .ruff_cache htmlcov .coverage dist build
	find . -type d -name __pycache__ -exec rm -rf {} +

docker-build:
	docker build -t upcore/psychometric-scoring:0.1.0 .

all: lint typecheck test
