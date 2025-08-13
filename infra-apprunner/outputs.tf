output "app_runner_service_url" {
  description = "App Runner service URL"
  value       = "https://${aws_apprunner_service.main.service_url}"
}

output "app_runner_service_arn" {
  description = "App Runner service ARN"
  value       = aws_apprunner_service.main.arn
}

output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "database_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "static_bucket_name" {
  description = "S3 bucket name for static files"
  value       = aws_s3_bucket.static.bucket
}

output "media_bucket_name" {
  description = "S3 bucket name for media files"
  value       = aws_s3_bucket.media.bucket
}

output "sqs_queue_url" {
  description = "SQS queue URL for Celery tasks"
  value       = aws_sqs_queue.celery_queue.url
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_connector_arn" {
  description = "VPC Connector ARN"
  value       = aws_apprunner_vpc_connector.main.arn
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.main.repository_url
}

output "ecr_repository_name" {
  description = "ECR repository name"
  value       = aws_ecr_repository.main.name
}
