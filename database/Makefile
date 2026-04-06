# =============================================================================
# Upcore — Database Makefile
# =============================================================================
# Usage:
#   make migrate-up                       Run all .up.sql migrations in order
#   make migrate-down                     Run all .down.sql migrations (reverse)
#   make migrate-new NAME=add_foo_table   Create timestamped empty up/down files
#   make seed-dev                         Load dev seed files in order
#   make reset-db                         Drop schemas and re-run migrations+seeds
#   make psql                             Open psql shell as upcore_admin
#   make status                           List applied / pending migrations
# =============================================================================

SHELL := /bin/bash

# -- Database connection (override via env) ----------------------------------
DB_HOST      ?= localhost
DB_PORT      ?= 5432
DB_NAME      ?= upcore_dev
DB_USER      ?= upcore_admin
DB_PASSWORD  ?= upcore_admin_dev
SUPERUSER    ?= upcore
SUPERPASS    ?= upcore_dev_password

MIGRATIONS_DIR := migrations
SEEDS_DIR      := seeds
RLS_FILE       := $(MIGRATIONS_DIR)/rls_policies.sql

export PGPASSWORD := $(DB_PASSWORD)

PSQL_ADMIN := psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) -d $(DB_NAME) -v ON_ERROR_STOP=1
PSQL_SUPER := PGPASSWORD=$(SUPERPASS) psql -h $(DB_HOST) -p $(DB_PORT) -U $(SUPERUSER) -d $(DB_NAME) -v ON_ERROR_STOP=1

.PHONY: help migrate-up migrate-down migrate-new seed-dev reset-db psql status check-conn wait-db

help:
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

check-conn: ## Check database connection
	@$(PSQL_ADMIN) -c "SELECT current_database(), current_user, version();" > /dev/null \
		&& echo "Connected to $(DB_NAME) as $(DB_USER)." \
		|| (echo "Cannot connect. Did you 'docker compose up -d postgres'?" && exit 1)

wait-db: ## Wait until Postgres is ready (max 30s)
	@for i in $$(seq 1 30); do \
		$(PSQL_SUPER) -c "SELECT 1" >/dev/null 2>&1 && echo "Postgres is ready." && exit 0; \
		echo "Waiting for Postgres... ($$i/30)"; sleep 1; \
	done; echo "Postgres not ready after 30s." && exit 1

migrate-up: wait-db ## Apply all up migrations in numeric order
	@echo ">>> Applying migrations from $(MIGRATIONS_DIR)/"
	@for f in $$(ls $(MIGRATIONS_DIR)/[0-9]*.up.sql | sort); do \
		echo "  -> $$f"; \
		$(PSQL_SUPER) -f $$f || exit 1; \
	done
	@echo ">>> Applying RLS policies"
	@$(PSQL_SUPER) -f $(RLS_FILE)
	@echo ">>> migrate-up complete."

migrate-down: ## Apply all down migrations in reverse numeric order
	@echo ">>> Reverting migrations (reverse order)"
	@for f in $$(ls $(MIGRATIONS_DIR)/[0-9]*.down.sql | sort -r); do \
		echo "  -> $$f"; \
		$(PSQL_SUPER) -f $$f || exit 1; \
	done
	@echo ">>> migrate-down complete."

migrate-new: ## Create a new migration pair (requires NAME=)
	@if [ -z "$(NAME)" ]; then echo "Usage: make migrate-new NAME=add_foo_table"; exit 1; fi
	@LAST=$$(ls $(MIGRATIONS_DIR)/[0-9]*.up.sql 2>/dev/null | sed -E 's|.*/([0-9]+)_.*|\1|' | sort -n | tail -1); \
	 NEXT=$$(printf "%03d" $$((10#$${LAST:-0} + 1))); \
	 UP=$(MIGRATIONS_DIR)/$${NEXT}_$(NAME).up.sql; \
	 DOWN=$(MIGRATIONS_DIR)/$${NEXT}_$(NAME).down.sql; \
	 echo "-- $${NEXT}_$(NAME).up.sql" > $$UP; \
	 echo "-- $${NEXT}_$(NAME).down.sql" > $$DOWN; \
	 echo "Created: $$UP and $$DOWN"

seed-dev: wait-db ## Load dev seed files (after migrations)
	@echo ">>> Loading dev seeds"
	@for f in $$(ls $(SEEDS_DIR)/*.sql | sort); do \
		echo "  -> $$f"; \
		$(PSQL_SUPER) -f $$f || exit 1; \
	done
	@echo ">>> seed-dev complete."

reset-db: ## DROP schemas and re-run all migrations + seeds
	@echo ">>> Dropping schemas"
	@$(PSQL_SUPER) -c "DROP SCHEMA IF EXISTS app CASCADE; DROP SCHEMA IF EXISTS audit CASCADE; DROP SCHEMA IF EXISTS ml CASCADE;"
	@$(MAKE) migrate-up
	@$(MAKE) seed-dev
	@echo ">>> reset-db complete."

psql: ## Open psql as superuser
	@$(PSQL_SUPER)

status: ## List migration files and whether key tables exist
	@echo "Migrations found:"
	@ls -1 $(MIGRATIONS_DIR)/[0-9]*.up.sql 2>/dev/null | wc -l | awk '{print "  up files:   " $$1}'
	@ls -1 $(MIGRATIONS_DIR)/[0-9]*.down.sql 2>/dev/null | wc -l | awk '{print "  down files: " $$1}'
	@echo "Tables in 'app' schema:"
	@$(PSQL_SUPER) -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'app' ORDER BY table_name;" 2>/dev/null || echo "  (cannot list — DB not ready)"
