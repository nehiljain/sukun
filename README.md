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

- [x] RESTFul API backend with Swagger docs.
- [x] Simple Frontend Stack - Vite.js, React.
- [x] Email Flows
- [x] Authentication (Google)
- [x] Stripe Integration for Subscriptions
- [x] Async Job Queues with Celery
- [x] Celery Tasks available via API (Hook into workflow automation like N8N)
- [ ] Simple Product Blog with CMS

DX Features:

- [x] Continuous deployment (Github)
- [x] Frontend Hot Reloading
- [x] Jupyter <> DB Integration

Deployment and Infra Features:

- [ ] Public S3 bucket + CDN for storing assets
- [ ] Deployment to Fly.io
- [ ] Deployment to AWS Fargate

Monitoring and Observability:

- [x] PostHog Analytics
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

## Deployment (WIP)

This application can be deployed in 3 ways:

1. Self Managed VM (AWS, GCP, OVHCloud )
2. Serverless - Fargate, Fly.io

For both pathways, the instructions are the same, except the terraform code to apply:

1. Update the .tfvars files with the necessary credentials.

2. Run terraform to provision the infrastructure.

```sh
cd infra/<aws-fargate|aws-vm>/
terraform plan
terraform apply
```

3. Push the infra details (IPs, Access Keys etc) to Github Secrets.

```sh
make update_ci
```

4. Deploy the application, by simply running github CI and CD.
