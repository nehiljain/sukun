# Docker-First Development Setup

This project has been refactored to use Docker for both local development and production deployment. This ensures consistency across environments and simplifies setup.

## Quick Start

```bash
# Initial setup (only needed once)
make setup

# Start development environment
make dev/up

# Access your application
# - Web app: http://localhost:8001
# - Database admin: http://localhost:8889 (admin/admin)
# - Database: localhost:5433
```

## 🚀 Development Workflow

### Starting Development

```bash
# Start full development stack
make dev/up

# Or start individual services
make db/up          # Database only
make dev/build      # Build development image
```

### Code Changes

The development setup automatically reloads when you change code in the `app/` directory thanks to:

- Volume mounting (`./app:/app/app:cached`)
- Django's development server with auto-reload
- Hot reloading for file changes

### Running Commands

```bash
# Django management commands
make manage COMMAND=makemigrations
make manage COMMAND=migrate
make manage COMMAND=createsuperuser

# Or use shortcuts
make migrate
make makemigrations
make shell

# Access container shell
make dev/shell
```

### Testing

```bash
# Run all tests
make test

# Run specific test types
make test/unit
make test/integration
make test/coverage
```

## 🏭 Production Deployment

### Building for Production

```bash
# Build production image
make prod/build

# Test production build locally
make prod/up
```

### CI/CD Pipeline

The CI pipeline is optimized for speed and reliability:

1. **Lint Check** (5 min timeout) - Fails fast on code quality issues
2. **Change Detection** - Only runs relevant tests based on file changes
3. **Parallel Testing** - Backend and frontend tests run in parallel
4. **Smart Caching** - Docker layer and dependency caching
5. **Conditional Builds** - Only builds Docker images when necessary

## 📁 Project Structure

```
├── Dockerfile                 # Multi-stage build (dev/prod)
├── docker-compose.yaml       # Local development
├── docker-compose.prod.yaml  # Production deployment
├── Makefile                  # Developer commands
└── .env.example              # Environment template
```

## 🐳 Docker Configuration

### Multi-stage Dockerfile

- **Base stage**: Common dependencies and setup
- **Development stage**: Auto-reload, debug tools, mounted volumes
- **Production stage**: Optimized for size and security

### Development Features

- Code mounting for hot reloading
- Development dependencies (debug tools, test runners)
- Non-root user for security
- Volume caching for faster rebuilds

### Production Features

- Multi-stage build for smaller images
- Static file collection
- Security hardening
- Health checks
- Resource limits

## 🔧 Available Commands

### Development

```bash
make dev/up         # Start development environment
make dev/down       # Stop development environment
make dev/build      # Build development image
make dev/rebuild    # Rebuild without cache
make dev/logs       # View application logs
make dev/shell      # Access container shell
```

### Database

```bash
make db/up          # Start database
make db/down        # Stop database
make db/reset       # Reset database (⚠️ destroys data)
make db/backup      # Create database backup
make db/restore     # Restore from backup
```

### Django Management

```bash
make manage COMMAND=<cmd>  # Run Django command
make migrate               # Run migrations
make makemigrations       # Create migrations
make shell                # Django shell
make collectstatic        # Collect static files
```

### Testing

```bash
make test              # Run all tests
make test/unit         # Unit tests only
make test/integration  # Integration tests only
make test/coverage     # Tests with coverage
```

### Production

```bash
make prod/build    # Build production image
make prod/up       # Start production environment
make prod/down     # Stop production environment
make prod/deploy   # Full deployment
```

### CI/CD

```bash
make ci/build      # Fast CI build
make ci/test       # Fast CI tests
make ci/lint       # Code quality checks
```

### Utilities

```bash
make clean         # Clean Docker resources
make setup         # Initial project setup
make env           # Create .env from template
make help          # Show all commands
```

## 🚀 Performance Optimizations

### Local Development

- **Volume caching**: Python packages cached between container restarts
- **Code mounting**: Instant reload on file changes
- **Layer caching**: Docker layers cached for faster builds
- **Parallel services**: Database and app start concurrently

### CI/CD Pipeline

- **Fail fast**: Linting runs first (5 min timeout)
- **Change detection**: Only runs tests for changed code
- **Parallel jobs**: Frontend and backend tests run simultaneously
- **Smart caching**: GitHub Actions cache + Registry cache
- **Conditional builds**: Docker images only built when necessary

### Production

- **Multi-stage builds**: Smaller final images
- **Static file optimization**: Pre-collected static files
- **Resource limits**: Memory and CPU constraints
- **Health checks**: Automatic container health monitoring

## 🔄 Migration from UV-based Development

If you were previously using `uv` for local development:

1. **Backup your data**: `make db/backup` (if needed)
2. **Stop old services**: Stop any running Django dev servers
3. **Setup Docker environment**: `make setup`
4. **Start development**: `make dev/up`

Your data will be preserved if you use the same database configuration.

## 🐛 Troubleshooting

### Common Issues

**Port conflicts**:

```bash
# Check what's using the ports
lsof -i :8001  # Web app
lsof -i :5433  # Database

# Stop conflicting services or change ports in docker-compose.yaml
```

**Database connection issues**:

```bash
# Check database is running
make db/up

# Check database health
docker compose exec db pg_isready -d gestral -U postgres

# Reset database if corrupted
make db/reset  # ⚠️ This destroys all data
```

**Build issues**:

```bash
# Clean Docker cache
make clean

# Rebuild without cache
make dev/rebuild

# Check Docker disk space
docker system df
```

**Permission issues**:

```bash
# Fix file permissions (if needed)
sudo chown -R $USER:$USER .

# Rebuild containers
make dev/rebuild
```

### Getting Help

1. **Check logs**: `make dev/logs`
2. **Inspect container**: `make dev/shell`
3. **Verify setup**: `make help`
4. **Clean state**: `make clean && make setup`

## 🔧 Customization

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
# Edit .env with your settings
```

### Docker Compose Override

Create `docker-compose.override.yaml` for local customizations:

```yaml
services:
  web:
    ports:
      - "8080:8000" # Use different port
    environment:
      - CUSTOM_VAR=value
```

### Additional Services

Add services to `docker-compose.yaml`:

```yaml
services:
  elasticsearch:
    image: elasticsearch:8.0.0
    ports:
      - "9200:9200"
    profiles: ["search"]
```

Then start with: `docker compose --profile search up -d`

---

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Django in Docker Best Practices](https://testdriven.io/blog/dockerizing-django-with-postgres-gunicorn-and-nginx/)
- [Multi-stage Docker Builds](https://docs.docker.com/develop/dev-best-practices/)
