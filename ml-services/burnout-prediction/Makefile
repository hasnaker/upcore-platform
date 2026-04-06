.PHONY: install dev test lint run docker-build docker-run clean

install:
	uv pip install .

dev:
	uv pip install ".[dev]"

test:
	pytest tests/ -v --cov=app --cov-report=term-missing

lint:
	ruff check app/ tests/
	ruff format --check app/ tests/

format:
	ruff format app/ tests/

run:
	uvicorn app.main:app --host 0.0.0.0 --port 8022 --reload

docker-build:
	docker build -t upcore-burnout-prediction:latest .

docker-run:
	docker run -p 8022:8022 --env-file .env upcore-burnout-prediction:latest

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache .ruff_cache htmlcov
