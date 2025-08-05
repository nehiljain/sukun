include .env

# Default runtime (docker or python)
RUNTIME ?= docker
PROJECT_NAME ?= gestral

help:
	@echo "=== Local Development (Docker-first) ==="
	@echo "  dev/up            - Start full development environment"
	@echo "  dev/down          - Stop development environment"
	@echo "  dev/build         - Build development Docker image"
	@echo "  dev/rebuild       - Rebuild development image (no cache)"
	@echo "  dev/logs          - View development logs"
	@echo "  dev/shell         - Access development container shell"
	@echo ""
	@echo "=== Database Management ==="
	@echo "  db/up             - Start database only"
	@echo "  db/down           - Stop database"
	@echo "  db/reset          - Reset database (WARNING: destroys data)"
	@echo "  db/backup         - Backup database"
	@echo "  db/restore        - Restore database from backup"
	@echo ""
	@echo "=== Django Management ==="
	@echo "  manage            - Run Django management commands (COMMAND=<cmd>)"
	@echo "  migrate           - Run database migrations"
	@echo "  makemigrations    - Create new migrations"
	@echo "  shell             - Start Django shell"
	@echo "  collectstatic     - Collect static files"
	@echo ""
	@echo "=== Testing ==="
	@echo "  test              - Run all tests"
	@echo "  test/unit         - Run unit tests only"
	@echo "  test/integration  - Run integration tests only"
	@echo "  test/coverage     - Run tests with coverage"
	@echo ""
	@echo "=== Frontend ==="
	@echo "  fe/dev            - Start frontend development server"
	@echo "  fe/build          - Build frontend for production"
	@echo "  fe/install        - Install frontend dependencies"
	@echo ""
	@echo "=== Production ==="
	@echo "  prod/build        - Build production Docker image"
	@echo "  prod/up           - Start production environment"
	@echo "  prod/down         - Stop production environment"
	@echo "  prod/deploy       - Deploy to production"
	@echo ""
	@echo "=== CI/CD Optimization ==="
	@echo "  ci/build          - Fast CI build (with caching)"
	@echo "  ci/test           - Fast CI test suite"
	@echo "  ci/lint           - Run linting and code checks"
	@echo ""
	@echo "=== Utility ==="
	@echo "  clean             - Clean up Docker resources"
	@echo "  setup             - Initial project setup"
	@echo "  env               - Create .env from template"

# =============================================================================
# Local Development Commands
# =============================================================================

dev/debug:
	@echo "🔧 Debugging mode enabled. Running with uv.run..."
	@docker compose --profile dev --profile debug up -d

dev/up:
	@echo "🚀 Starting development environment..."
	@docker compose --profile dev up -d
	@echo "✅ Development environment started!"
	@echo "   - Web: http://localhost:8001"
	@echo "   - DB Admin: http://localhost:8889 (admin/admin)"
	@echo "   - Database: localhost:5433"

dev/down:
	@echo "🛑 Stopping development environment..."
	@docker compose --profile dev down --remove-orphans
	@echo "✅ Development environment stopped!"

dev/build:
	@echo "🔨 Building development image..."
	@docker compose build web
	@echo "✅ Development image built!"

dev/rebuild:
	@echo "🔨 Rebuilding development image (no cache)..."
	@docker compose build --no-cache web
	@echo "✅ Development image rebuilt!"

dev/logs:
	@docker compose logs -f web

dev/shell:
	@docker compose exec web bash

# =============================================================================
# Database Management
# =============================================================================

db/up:
	@echo "🗄️ Starting database..."
	@docker compose --profile db --profile debug up -d
	@echo "✅ Database is running on localhost:5433"
	@echo "   - PgAdmin: http://localhost:8889 (admin/admin)"

db/down:
	@docker compose --profile db --profile debug down

db/reset:
	@echo "⚠️  WARNING: This will destroy all database data!"
	@read -p "Are you sure? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker compose down -v; \
		docker volume rm $(PROJECT_NAME)_pgdata 2>/dev/null || true; \
		echo "✅ Database reset complete!"; \
	else \
		echo "❌ Database reset cancelled."; \
	fi

db/backup:
	@echo "💾 Creating database backup..."
	@mkdir -p backups
	@docker compose exec db pg_dump -U postgres -d $(PROJECT_NAME) > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Database backup created in backups/"

db/restore:
	@echo "📥 Restoring database from backup..."
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "❌ Please specify BACKUP_FILE=path/to/backup.sql"; \
		exit 1; \
	fi
	@docker compose exec -T db psql -U postgres -d $(PROJECT_NAME) < $(BACKUP_FILE)
	@echo "✅ Database restored!"

# =============================================================================
# Django Management
# =============================================================================

manage:
	@if [ -z "$(COMMAND)" ]; then \
		echo "❌ Please specify COMMAND=<django_command>"; \
		exit 1; \
	fi
	@if [ "$(RUNTIME)" = "docker" ]; then \
		docker compose run --rm web python manage.py $(COMMAND); \
	else \
		uv run python manage.py $(COMMAND); \
	fi

migrate:
	@echo "🔄 Running database migrations..."
	@$(MAKE) manage COMMAND=migrate
	@echo "✅ Migrations complete!"

makemigrations:
	@echo "📝 Creating new migrations..."
	@$(MAKE) manage COMMAND=makemigrations
	@echo "✅ Migrations created!"

shell:
	@$(MAKE) manage COMMAND=shell

collectstatic:
	@echo "📦 Collecting static files..."
	@$(MAKE) manage COMMAND="collectstatic --noinput"
	@echo "✅ Static files collected!"

# =============================================================================
# Testing
# =============================================================================

test:
	@echo "🧪 Running tests..."
	@if [ "$(RUNTIME)" = "docker" ]; then \
		docker compose run --rm -e DJANGO_SETTINGS_MODULE=settings web python -m pytest app/ -v; \
	else \
		uv run python -m pytest app/ -v; \
	fi

test/unit:
	@echo "🧪 Running unit tests..."
	@if [ "$(RUNTIME)" = "docker" ]; then \
		docker compose run --rm web python -m pytest app/ -v -m "not integration"; \
	else \
		uv run python -m pytest app/ -v -m "not integration"; \
	fi

test/integration:
	@echo "🧪 Running integration tests..."
	@if [ "$(RUNTIME)" = "docker" ]; then \
		docker compose run --rm web python -m pytest app/ -v -m integration; \
	else \
		uv run python -m pytest app/ -v -m integration; \
	fi

test/coverage:
	@echo "🧪 Running tests with coverage..."
	@if [ "$(RUNTIME)" = "docker" ]; then \
		docker compose run --rm web bash -c "python -m coverage run --source=app -m pytest app/ && python -m coverage report -m && python -m coverage xml -o coverage.cobertura.xml"; \
	else \
		uv run python -m coverage run --source=app -m pytest app/; \
		uv run python -m coverage report -m; \
		uv run python -m coverage xml -o coverage.cobertura.xml; \
	fi

# =============================================================================
# Frontend
# =============================================================================

fe/install:
	@echo "📦 Installing frontend dependencies..."
	@cd web && yarn install
	@echo "✅ Frontend dependencies installed!"

fe/dev:
	@echo "🎨 Starting frontend development server..."
	@cd web && yarn install && yarn dev

fe/build:
	@echo "🔨 Building frontend for production..."
	@cd web && yarn install && yarn build
	@echo "✅ Frontend built!"

# =============================================================================
# Production
# =============================================================================

prod/build:
	@echo "🏭 Building production image..."
	@docker build --target production -t $(PROJECT_NAME):latest .
	@echo "✅ Production image built!"

prod/up:
	@echo "🚀 Starting production environment..."
	@docker compose -f docker-compose.prod.yaml up -d
	@echo "✅ Production environment started!"

prod/down:
	@echo "🛑 Stopping production environment..."
	@docker compose -f docker-compose.prod.yaml down
	@echo "✅ Production environment stopped!"

prod/deploy:
	@echo "🚀 Deploying to production..."
	@$(MAKE) prod/build
	@$(MAKE) prod/up
	@echo "✅ Deployment complete!"

# =============================================================================
# CI/CD Optimization
# =============================================================================

ci/build:
	@echo "⚡ Fast CI build with caching..."
	@docker build \
		--target production \
		--cache-from $(PROJECT_NAME):buildcache \
		--build-arg BUILDKIT_INLINE_CACHE=1 \
		-t $(PROJECT_NAME):ci .
	@echo "✅ CI build complete!"

ci/test:
	@echo "⚡ Fast CI test suite..."
	@docker run --rm \
		-e DJANGO_SETTINGS_MODULE=settings \
		-e DATABASE_URL=sqlite:///test.db \
		$(PROJECT_NAME):ci \
		python -m pytest app/ --tb=short -q
	@echo "✅ CI tests complete!"

ci/lint:
	@echo "🔍 Running linting and code checks..."
	@docker run --rm $(PROJECT_NAME):ci bash -c "\
		python -m flake8 app/ && \
		python -m black --check app/ && \
		python -m isort --check-only app/"
	@echo "✅ Linting complete!"

# =============================================================================
# Utility Commands
# =============================================================================

clean:
	@echo "🧹 Cleaning up Docker resources..."
	@docker system prune -f
	@docker volume prune -f
	@echo "✅ Cleanup complete!"

setup:
	@echo "🔧 Setting up project..."
	@if [ ! -f .env ]; then $(MAKE) env; fi
	@$(MAKE) dev/build
	@$(MAKE) db/up
	@sleep 5
	@$(MAKE) migrate
	@echo "✅ Project setup complete!"
	@echo "   Run 'make dev/up' to start development!"

env:
	@if [ ! -f .env.example ]; then \
		echo "❌ .env.example not found!"; \
		exit 1; \
	fi
	@cp .env.example .env
	@echo "✅ .env file created from template!"


# SSH key management (kept from original)
generate_ssh:
	@echo "🔑 Generating SSH key pair..."
	@ssh-keygen -t rsa -b 4096 -f ./github_ssh_key -N "" -C "github ci key"
	@echo "✅ SSH key pair generated!"
	@cat ./github_ssh_key.pub

create_github_secret:
	@echo "🔐 Creating GitHub Action secret..."
	@if [ ! -f ./github_ssh_key ]; then \
		echo "❌ SSH key not found. Run 'make generate_ssh' first."; \
		exit 1; \
	fi
	@if ! command -v gh &> /dev/null; then \
		echo "❌ GitHub CLI not installed!"; \
		exit 1; \
	fi
	@gh secret set SSH_PRIVATE_KEY < ./github_ssh_key
	@gh variable set SSH_DEPLOYMENT_USERNAME -b "${SSH_DEPLOYMENT_USERNAME}"
	@gh variable set SSH_DEPLOYMENT_HOST -b "${SSH_DEPLOYMENT_HOST}"
	@echo "✅ GitHub secrets created!"

add_key_to_server:
	@$(MAKE) generate_ssh
	@$(MAKE) create_github_secret
	@echo "🔗 Adding public key to server..."
	@ssh ${SSH_DEPLOYMENT_USERNAME}@${SSH_DEPLOYMENT_HOST} 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && cat >> ~/.ssh/authorized_keys' < ./github_ssh_key.pub
	@echo "✅ Public key added to server!"

.PHONY: help dev/up dev/down dev/build dev/rebuild dev/logs dev/shell db/up db/down db/reset db/backup db/restore manage migrate makemigrations shell collectstatic test test/unit test/integration test/coverage fe/install fe/dev fe/build prod/build prod/up prod/down prod/deploy ci/build ci/test ci/lint clean setup env generate_ssh create_github_secret add_key_to_server up down build logs exec up/db down/db up/prod down/prod
