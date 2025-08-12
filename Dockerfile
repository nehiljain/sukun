# Base stage with dependencies
FROM python:3.12-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy

# Set working directory
WORKDIR /app

# Install system dependencies
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    ffmpeg \
    curl \
    nodejs \
    npm && \
    npm install -g yarn && \
    pip install uv && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml ./

# Create virtual environment and install dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    uv venv && \
    uv sync --group dev

# Development stage
FROM base AS development

# Set development environment variables
ENV DJANGO_SETTINGS_MODULE=settings \
    DEBUG=1 \
    PATH="/app/.venv/bin:$PATH"

# Install development dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    . .venv/bin/activate && \
    uv pip install \
    watchdog \
    ipdb \
    django-debug-toolbar \
    django-extensions

# Create non-root user for development
# RUN groupadd --gid 1001 django && \
#     useradd --uid 1001 --gid django --shell /bin/bash --create-home django

# RUN chown -R django:django /app

# # Switch to non-root user
# USER django

# Expose port
EXPOSE 8000

# Health check for development
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Development server with auto-reload
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# Production builder stage
FROM base AS builder

# Copy frontend code and build it first
COPY web ./web
# COPY package.json yarn.lock* ./

# Build frontend assets
WORKDIR /app/web
RUN mkdir ../static && \
    yarn install --frozen-lockfile && \
    yarn build

# Go back to app directory
WORKDIR /app

# Copy application code for static file collection
COPY app .

# Set environment variables for static file collection
ENV PATH="/app/.venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=settings

# Create static directory and collect static files (including frontend assets)
RUN mkdir -p /app/static && \
    . .venv/bin/activate && \
    python manage.py collectstatic --noinput

# Production stage
FROM python:3.12-slim AS production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=settings

# Set working directory
WORKDIR /app

# Install minimal runtime dependencies
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    ffmpeg \
    curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Create non-root user
RUN groupadd --gid 1001 django && \
    useradd --uid 1001 --gid django --shell /bin/bash --create-home django

# Copy application code
COPY --chown=django:django app .

# Copy static files
COPY --from=builder --chown=django:django /app/static /app/static

# Change to non-root user
USER django

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Run application with gunicorn
CMD ["/app/.venv/bin/python", "-m", "gunicorn","app.wsgi:application"]
