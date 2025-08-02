# ShipFaster AI Agent Instructions

This document helps AI coding agents understand the key patterns and structures of the ShipFaster codebase to provide more accurate and contextual assistance.

## Project Overview

ShipFaster is a Django-based SaaS application with a React frontend that helps businesses manage and optimize their content. Key components:

- Django REST API backend (`app/`)
- React SPA frontend (`app/client/`)
- AI-powered blog checking services (`app/blogchecker_service/`)
- Infrastructure as Code with Terraform (`infra/`)

## Key Development Workflows

### Local Development

1. Initial setup:
```bash
make setup      # Install Python dependencies
make up         # Start application with local database
```

2. Frontend development:
```bash
make fe/dev     # Start frontend dev server with hot reload
make fe/build   # Build frontend for production
```

### Database Operations

- Database operations are handled through Django migrations
- Scripts for database initialization are in `db_scripts/`
- Local database can be managed with:
```bash
make up/localdb
make down/localdb
```

## Architecture Patterns

### Service Boundaries

1. Blog Checking Flow:
   - `app/blogchecker/` - Core blog checking logic and models
   - `app/blogchecker_service/` - AI-powered analysis services
   - Communication happens through Django signals and Celery tasks

2. Content Generation:
   - `app/sound_gen/` - Audio content generation
   - `app/video_gen/` - Video content generation
   - `app/remotion_render/` - Video rendering service

### Key Integration Points

1. External Services:
   - Resend for email delivery
   - Stripe for subscription management
   - Hosted Postgres database

2. Authentication:
   - Google OAuth integration
   - User/Organization management in `app/user_org/`

## Common Patterns

### Async Processing
- Long-running tasks use Celery queues
- Task definitions are in respective service modules
- Queue configuration in `app/celeryapp.py`

### Configuration Management
- Environment variables in `.env` (copy from `.env.example`)
- Service-specific configs in `configs/`
- Infrastructure variables in `infra/environments/`

## Testing

- Django tests are located alongside their respective apps
- Run tests with: `make test`
- Integration tests require local database (use `make up/localdb`)

## Deployment

- Deployments managed through GitHub Actions
- Two deployment options:
  1. Self-managed VM (AWS, GCP)
  2. Serverless (AWS Fargate, Fly.io)
- Infrastructure provisioned via Terraform in `infra/`
