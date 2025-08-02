include .env

help:
	@echo "Available commands:"
	@echo "  setup             - Install local python dependencies"
	@echo "  up                - Start the application with local database"
	@echo "  down              - Stop the application and local database"
	@echo "  build             - Build docker image"
	@echo "  fe/dev            - Start frontend development server with hot reloading"
	@echo "  fe/build          - Build the frontend application for production"
	@echo "  up/prod          - Start the application in production mode"
	@echo "  down/prod        - Stop the application in production mode"
	@echo "  up/localdb       - Start the local database"
	@echo "  down/localdb     - Stop the local database"
	@echo "  manage            - Run management commands for Django like makemigrations, migrate, etc. requires COMMAND to be set"
	@echo "  add_key_to_server - Generate SSH key pair, create GitHub secret, and add public key to authorized_keys on the server"

setup:
	@pip install uv
	@uv sync

env:
	@cp env.example .env

up:
	$(MAKE) up/db
	@docker compose up web -d

build:
	@docker compose build web

exec:
	@docker compose exec -ti web bash

logs:
	@docker compose logs -f web

down:
	$(MAKE) down/db
	@docker compose down --remove-orphans -v

fe/dev:
	@(cd web/ && \
	yarn install && \
	yarn dev)

fe/build:
	@(cd web/ && \
	yarn install && \
	yarn build)


up/prod:
	@docker compose -f docker-compose.prod.yaml up -d

down/prod:
	@docker compose -f docker-compose.prod.yaml down

up/db:
	@docker compose -f docker-compose.yaml --profile db --profile debug up -d
	@echo "Database is running on port localhost:5432. Pgadmin is running on port localhost:8080."

down/db:
	@docker compose -f docker-compose.yaml --profile db --profile debug down --remove-orphans -v

test:
	@echo "RUNTIME: ${RUNTIME}"
	@echo "COMMAND: ${COMMAND}"
	@if [ "$$RUNTIME" = "docker" ]; then \
		docker compose run --rm web pytest app; \
	else \
		uv run python -m coverage run --source=app app/manage.py test; \
		uv run python -m coverage report -m; \
		uv run python -m coverage xml -o coverage.cobertura.xml; \
	fi

manage:
	@echo "RUNTIME: ${RUNTIME}"
	@echo "COMMAND: ${COMMAND}"
	@if [ "$$RUNTIME" = "docker" ]; then \
		docker compose -f docker-compose.yaml run --rm web python app/manage.py $$COMMAND; \
	else \
		uv run python app/manage.py $$COMMAND; \
	fi


generate_ssh:
	@echo "Generating SSH key pair..."
	@ssh-keygen -t rsa -b 4096 -f ./github_ssh_key -N "" -C "github ci key"
	@echo "SSH key pair generated. Public key:"
	@cat ./github_ssh_key.pub

create_github_secret:
	@echo "Creating GitHub Action secret 'SSH_PRIVATE_KEY'..."
	@if [ ! -f ./github_ssh_key ]; then \
		echo "Error: SSH key file not found. Run 'make generate_ssh' first."; \
		exit 1; \
	fi
	@if ! command -v gh &> /dev/null; then \
		echo "Error: GitHub CLI (gh) is not installed. Please install it first."; \
		exit 1; \
	fi
	@gh secret set SSH_PRIVATE_KEY < ./github_ssh_key
	@echo "GitHub Action secret 'SSH_PRIVATE_KEY' created successfully."
	@gh variable set SSH_DEPLOYMENT_USERNAME -b "${SSH_DEPLOYMENT_USERNAME}"
	@gh variable set SSH_DEPLOYMENT_HOST -b "${SSH_DEPLOYMENT_HOST}"

add_key_to_server:
	@$(MAKE) generate_ssh
	@$(MAKE) create_github_secret
	@echo "SSHing to server and appending public key to authorized_keys..."
	@if [ ! -f ./github_ssh_key.pub ]; then \
		echo "Error: Public SSH key file not found. Run 'make generate_ssh' first."; \
		exit 1; \
	fi
	@ssh ${SSH_DEPLOYMENT_USERNAME}@${SSH_DEPLOYMENT_HOST} 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && cat >> ~/.ssh/authorized_keys' < ./github_ssh_key.pub
	@echo "Public key appended to authorized_keys on the server."
