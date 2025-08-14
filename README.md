# Gestral

This is an opnionated version of [Shipfast](https://shipfa.st/). More details about the high level architecture is at [Architecture](ARCHITECTURE.md)

## Table of Contents

- [Who should use it?](#who-should-use-it)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Deployment](#deployment)

## Who should use it?

- Want to build a python based webapp.
- You want to quickly go to production with a SaaS idea.
- You want to build an internal web tool for your company.

## Features

App Features:

- ✅ RESTFul API backend with Swagger docs.
- ✅ Simple Frontend Stack - Vite.js, React.
- ✅ Email Flows
- ✅ Authentication (Google)
- ✅ Stripe Integration for Subscriptions
- ✅ Async Job Queues with Celery
- ✅ Celery Tasks available via API (Hook into workflow automation like N8N)
- [ ] Simple Product Blog with CMS

DX Features:

- ✅ Continuous deployment (Github)
- ✅ Frontend Hot Reloading
- ✅ Jupyter <> DB Integration

Deployment and Infra Features:

- ✅ Deployment to Fly.io
- ✅ Deployment to AWS App Runner
- [ ] Public S3 bucket + CDN for storing assets
- [ ] Deployment to AWS EC2

Monitoring and Observability:

- ✅ PostHog Analytics
- [ ] LLM Tracing with LangSmith?
- [ ] Log forwarding to NewRelic
- [ ] Service Uptime Monitoring with NewRelic

## Prerequisites

Before you begin, ensure you have the following installed:

- Docker
- Git

Following SaaS services are needed to operate this:

- Resend
- Stripe
- Hosted Postgres

## Local Setup

1. Clone the repository.

2. Update the environment variables.

   - Copy `.env.example` to `.env`
   - Update the `.env` file with your specific configuration

3. Build and Deploy app.

   ```sh
   make dev/up
   make manage COMMAND=migrate
   ```

4. (Optional) Start the frontend development server with hot reloading:
   ```sh
   make fe/dev
   ```
5. App is running at http://localhost:8000/ . Access the Swagger API docs at http://localhost:8000/api/docs/

6. If you want to commit code, install pre-commit hooks:
   ```sh
   pre-commit install
   ```

## Deployment

This application can be deployed in 3 ways:

1. PaaS - Fly.io,
2. PaaS - AWS App Runner
3. Self Managed VM (AWS, GCP, OVHCloud)

### Using Fly.io

This section expects that a publicly accessible Postgres database is available. You can use services like [Supabase](https://supabase.com/) or [Neon](https://neon.tech/) for this.

Video Tutorial: https://1drv.ms/v/c/b345fdd8ccc30f21/EaUDWF2-oiVCr1fFFg3UQ3cBrfp4gOMhVL5POHv2wIKZJg?e=dlGHdd

1. Create a Fly.io account.
2. Install the Fly CLI.

   ```sh
   curl -L https://fly.io/install.sh | sh
   ```

3. Create a new Fly application.

   ```sh
   fly create app_name
   ```

4. Configure secrets and update fly.toml with your environment variables.

   ```sh
   fly secrets --app app_name set APP_DATABASE_URL=<your-database-url>
   fly secrets --app app_name set GOOGLE_REDIRECT_URI="http://yourdomain.com/auth/google/callback"
   fly secrets --app app_name set GOOGLE_CLIENT_ID="....."
   fly secrets --app app_name set GOOGLE_CLIENT_SECRET="....."
   ```

5. Deploy the application.

   ```sh
   fly deploy
   ```

### Using AWS App Runner

AWS App Runner provides a fully managed containerized application platform with automatic scaling and pay-per-use pricing.

#### Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.0 installed
- Docker installed for building container images
- AWS account with necessary permissions

#### Infrastructure Setup

1. Navigate to the App Runner infrastructure directory:

   ```sh
   cd infra-apprunner
   ```

2. Copy and configure the variables file:

   ```sh
   cp terraform.tfvars.example terraform.tfvars
   ```

3. Edit `terraform.tfvars` and set:

   ```hcl
   deployment_name = "my-unique-deployment"  # Change for each deployment
   db_password = "............"
   django_secret_key = "..........."
   container_image_uri = "123456789012.dkr.ecr.us-west-2.amazonaws.com/gestral-my-deployment:latest"
   allowed_hosts = "*.awsapprunner.com,yourdomain.com"
   cors_allowed_origins = "https://yourdomain.com"
   csrf_trusted_origins = "https://yourdomain.com"
   ```

4. Deploy the infrastructure:
   ```sh
   terraform init
   terraform plan
   terraform apply
   ```

#### Multiple Deployments

This setup supports multiple independent deployments in the same AWS account. Each deployment is isolated with its own:

- VPC and networking
- Database instances
- Storage buckets
- Container repositories
- Task queues

Simply use different `deployment_name` values in your `terraform.tfvars` for each environment.

#### Cleanup

To destroy the infrastructure:

```sh
cd infra-apprunner
terraform destroy
```
