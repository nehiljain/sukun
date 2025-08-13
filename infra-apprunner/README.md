# AWS App Runner Infrastructure for Gestral

This Terraform configuration deploys the Gestral Django application to AWS App Runner with supporting infrastructure.

## Architecture

- **App Runner Service**: Containerized Django application with auto-scaling
- **Database**: PostgreSQL RDS instance in private VPC
- **Storage**: S3 buckets for static files and media
- **Queue**: SQS for Celery task management
- **VPC Connector**: Connects App Runner to VPC resources (RDS)

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform installed (>= 1.0)
3. Docker installed for building container images
4. AWS account with necessary permissions

## Key Features

- **Serverless**: Pay only for what you use with automatic scaling
- **Container-based**: Uses ECR for container image storage
- **VPC Integration**: Secure access to RDS database
- **Auto-deployment**: Automatic deployments when new images are pushed
- **Cost-effective**: Lower cost than traditional EC2-based solutions

## Deployment

### 1. Configure Variables

Copy the example variables file and customize it:

```bash
cp terraform.tfvars.example terraform.tfvars
```

**Important**: Set a unique `deployment_name` to avoid resource collisions:

```hcl
deployment_name = "my-unique-deployment"  # Change this for each deployment
container_image_uri = "123456789012.dkr.ecr.us-west-2.amazonaws.com/gestral-my-deployment:latest"
```

### 2. Deploy Infrastructure

```bash
terraform init
terraform plan
terraform apply
```

### 3. Build and Deploy Application

Use the deployment script to build and push your container:

```bash
./scripts/deploy_apprunner.sh
```

Or manually:

```bash
# Build and push container
make apprunner/build
make apprunner/push

# Trigger deployment
make apprunner/deploy
```

## Environment Variables

The following environment variables are automatically configured:

- `DJANGO_SETTINGS_MODULE`
- `DATABASE_URL`
- `CELERY_BROKER_URL` (SQS)
- `CELERY_RESULT_BACKEND` (PostgreSQL)
- `AWS_STORAGE_BUCKET_NAME_STATIC`
- `AWS_STORAGE_BUCKET_NAME_MEDIA`

## Container Requirements

Your container image must:

1. Expose port 8000
2. Include all Python dependencies
3. Have Django static files collected
4. Run with gunicorn or similar WSGI server

## Multiple Deployments

This configuration supports multiple deployments in the same AWS account by using the `deployment_name` variable. Each deployment creates:

- Isolated VPC and subnets
- Separate databases
- Unique S3 buckets
- Independent SQS queues
- Separate ECR repositories

## Monitoring

- View logs: AWS CloudWatch Logs
- Monitor performance: App Runner console
- Database metrics: RDS CloudWatch metrics
- Queue metrics: SQS CloudWatch metrics

## Scaling

App Runner automatically scales based on:

- Request volume
- CPU utilization
- Memory usage

Configure scaling limits with:

- `min_size`: Minimum number of instances
- `max_size`: Maximum number of instances
- `max_concurrency`: Requests per instance

## Cost Optimization

- **Automatic scaling**: Scales to zero when no traffic
- **Pay per use**: No idle capacity costs
- **Right-sizing**: Start with small CPU/memory and adjust
- **Database**: Use appropriate RDS instance size

Estimated costs (us-west-2):

- App Runner: $0.064/vCPU hour + $0.007/GB hour
- RDS (db.t3.micro): ~$13/month
- S3 storage: Variable based on usage

## Limitations

- **No background workers**: App Runner doesn't support background processes
- **Celery workers**: Need separate solution (ECS, Lambda, or EC2)
- **WebSockets**: Limited WebSocket support
- **File system**: Read-only file system (use S3 for uploads)

## Cleanup

To destroy the infrastructure:

```bash
terraform destroy
```

## Troubleshooting

### Common Issues

1. **Container fails to start**: Check CloudWatch logs
2. **Database connection errors**: Verify VPC connector configuration
3. **Image build fails**: Check Docker build context and dependencies
4. **Permission errors**: Verify IAM roles and policies

### Useful Commands

```bash
# Check service status
aws apprunner describe-service --service-arn <service-arn>

# View logs
aws logs tail /aws/apprunner/<service-name>/<service-id>/application

# List deployments
aws apprunner list-operations --service-arn <service-arn>
```
