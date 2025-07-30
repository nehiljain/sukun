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
- RESTFul API backend
- Simple Frontend Stack - Vite.js, React.
- Email Flows
- Authentication (Google)
- Stripe Integration for Subscriptions
- Async Job Queues

Ops and Infra Features:
- Continuous deployment (Github)
- Notebook <> DB Integration
- TBD

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
   make setup
   make dev
   ```
4. App is running at http://localhost:8000/

## Deployment

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
