terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC for RDS and other resources
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-vpc"
    Deployment = var.deployment_name
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-igw"
    Deployment = var.deployment_name
  }
}

# Public subnets for NAT Gateway
resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-public-subnet-${count.index + 1}"
    Deployment = var.deployment_name
  }
}

# Private subnets for RDS
resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-private-subnet-${count.index + 1}"
    Deployment = var.deployment_name
  }
}

# Route table for public subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-public-rt"
    Deployment = var.deployment_name
  }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# VPC Connector for App Runner
resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = "${var.app_name}-${var.deployment_name}-vpc-connector"
  subnets            = aws_subnet.private[*].id
  security_groups    = [aws_security_group.apprunner.id]

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-vpc-connector"
    Deployment = var.deployment_name
  }
}

# Security group for App Runner
resource "aws_security_group" "apprunner" {
  name_prefix = "${var.app_name}-${var.deployment_name}-apprunner-"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-apprunner-sg"
    Deployment = var.deployment_name
  }
}

# Security group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "${var.app_name}-${var.deployment_name}-rds-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.apprunner.id]
  }

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-rds-sg"
    Deployment = var.deployment_name
  }
}

# DB subnet group for RDS
resource "aws_db_subnet_group" "main" {
  name       = "${var.app_name}-${var.deployment_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-db-subnet-group"
    Deployment = var.deployment_name
  }
}

# RDS PostgreSQL instance
resource "aws_db_instance" "main" {
  identifier = "${var.app_name}-${var.deployment_name}-postgres"

  engine         = "postgres"
  engine_version = "17.2"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-postgres"
    Deployment = var.deployment_name
  }
}

# S3 buckets for static files and media
resource "aws_s3_bucket" "static" {
  bucket = "${var.app_name}-${var.deployment_name}-static-${random_string.bucket_suffix.result}"

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-static"
    Deployment = var.deployment_name
  }
}

resource "aws_s3_bucket" "media" {
  bucket = "${var.app_name}-${var.deployment_name}-media-${random_string.bucket_suffix.result}"

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-media"
    Deployment = var.deployment_name
  }
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "aws_s3_bucket_public_access_block" "static" {
  bucket = aws_s3_bucket.static.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "static" {
  bucket = aws_s3_bucket.static.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.static.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.static]
}

# IAM role for App Runner
resource "aws_iam_role" "apprunner_access_role" {
  name = "${var.app_name}-${var.deployment_name}-apprunner-access-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-apprunner-access-role"
    Deployment = var.deployment_name
  }
}

resource "aws_iam_role_policy_attachment" "apprunner_access_role" {
  role       = aws_iam_role.apprunner_access_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# IAM role for App Runner instance
resource "aws_iam_role" "apprunner_instance_role" {
  name = "${var.app_name}-${var.deployment_name}-apprunner-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "tasks.apprunner.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-apprunner-instance-role"
    Deployment = var.deployment_name
  }
}

# IAM policy for S3 access
resource "aws_iam_role_policy" "apprunner_s3_policy" {
  name = "${var.app_name}-${var.deployment_name}-apprunner-s3-policy"
  role = aws_iam_role.apprunner_instance_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.static.arn,
          "${aws_s3_bucket.static.arn}/*",
          aws_s3_bucket.media.arn,
          "${aws_s3_bucket.media.arn}/*"
        ]
      }
    ]
  })
}

# SQS Queue for Celery tasks (App Runner doesn't support background workers directly)
resource "aws_sqs_queue" "celery_queue" {
  name                        = "${var.app_name}-${var.deployment_name}-celery"
  delay_seconds               = 90
  max_message_size            = 2048
  message_retention_seconds   = 1209600
  receive_wait_time_seconds   = 10
  visibility_timeout_seconds  = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.celery_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-celery-queue"
    Deployment = var.deployment_name
  }
}

# Dead Letter Queue for failed tasks
resource "aws_sqs_queue" "celery_dlq" {
  name = "${var.app_name}-${var.deployment_name}-celery-dlq"

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-celery-dlq"
    Deployment = var.deployment_name
  }
}

# IAM policy for SQS access
resource "aws_iam_role_policy" "apprunner_sqs_policy" {
  name = "${var.app_name}-${var.deployment_name}-apprunner-sqs-policy"
  role = aws_iam_role.apprunner_instance_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ChangeMessageVisibility",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ReceiveMessage",
          "sqs:SendMessage"
        ]
        Resource = [
          aws_sqs_queue.celery_queue.arn,
          aws_sqs_queue.celery_dlq.arn
        ]
      }
    ]
  })
}

# ECR Repository for container images
resource "aws_ecr_repository" "main" {
  name                 = "${var.app_name}-${var.deployment_name}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  lifecycle_policy {
    policy = jsonencode({
      rules = [
        {
          rulePriority = 1
          description  = "Keep last 10 images"
          selection = {
            tagStatus     = "tagged"
            tagPrefixList = ["v"]
            countType     = "imageCountMoreThan"
            countNumber   = 10
          }
          action = {
            type = "expire"
          }
        },
        {
          rulePriority = 2
          description  = "Delete untagged images older than 1 day"
          selection = {
            tagStatus   = "untagged"
            countType   = "sinceImagePushed"
            countUnit   = "days"
            countNumber = 1
          }
          action = {
            type = "expire"
          }
        }
      ]
    })
  }

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}-ecr"
    Deployment = var.deployment_name
  }
}

# App Runner Service
resource "aws_apprunner_service" "main" {
  service_name = "${var.app_name}-${var.deployment_name}"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access_role.arn
    }
    image_repository {
      image_configuration {
        port = "8000"
        runtime_environment_variables = {
          DJANGO_SETTINGS_MODULE    = "settings"
          DJANGO_SECRET_KEY         = var.django_secret_key
          DEBUG                     = var.django_debug
          ALLOWED_HOSTS             = var.allowed_hosts
          CORS_ALLOWED_ORIGINS      = "${var.cors_allowed_origins}${var.cors_allowed_origins != "" ? "," : ""}https://*.awsapprunner.com"
          CSRF_TRUSTED_ORIGINS      = "${var.csrf_trusted_origins}${var.csrf_trusted_origins != "" ? "," : ""}https://*.awsapprunner.com"
          APP_DATABASE_URL              = "postgres://${aws_db_instance.main.username}:${var.db_password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
          AWS_STORAGE_BUCKET_NAME_STATIC = aws_s3_bucket.static.bucket
          AWS_STORAGE_BUCKET_NAME_MEDIA  = aws_s3_bucket.media.bucket
          AWS_S3_REGION_NAME        = var.aws_region
          USE_S3                    = "True"
          CELERY_BROKER_URL         = aws_sqs_queue.celery_queue.url
          CELERY_RESULT_BACKEND     = "db+postgresql://${aws_db_instance.main.username}:${var.db_password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
          SQS_QUEUE_URL             = aws_sqs_queue.celery_queue.url
        }
      }
      image_identifier      = var.container_image_uri
      image_repository_type = "ECR"
    }
    auto_deployments_enabled = var.auto_deployments_enabled
  }

  instance_configuration {
    instance_role_arn = aws_iam_role.apprunner_instance_role.arn
    cpu               = var.apprunner_cpu
    memory            = var.apprunner_memory
  }

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.main.arn

  tags = {
    Name       = "${var.app_name}-${var.deployment_name}"
    Deployment = var.deployment_name
  }
}

# Auto Scaling Configuration
resource "aws_apprunner_auto_scaling_configuration_version" "main" {
  auto_scaling_configuration_name = "${var.app_name}-${substr(var.deployment_name, 0, 15)}-asc"

  max_concurrency = var.max_concurrency
  max_size        = var.max_size
  min_size        = var.min_size

  tags = {
    Name       = "${var.app_name}-${substr(var.deployment_name, 0, 15)}-asc"
    Deployment = var.deployment_name
  }
}
