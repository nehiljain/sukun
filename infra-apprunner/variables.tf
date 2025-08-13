variable "app_name" {
  description = "Name of the application"
  type        = string
  default     = "gestral"
}

variable "deployment_name" {
  description = "Unique deployment name to avoid resource collisions"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.deployment_name))
    error_message = "Deployment name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b"]
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/24"
}

# Database variables
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Initial storage allocation for RDS"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum storage allocation for RDS"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "gestral"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "gestral"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# App Runner variables
variable "container_image_uri" {
  description = "Container image URI for App Runner (ECR repository)"
  type        = string
}

variable "apprunner_cpu" {
  description = "CPU allocation for App Runner (0.25 vCPU, 0.5 vCPU, 1 vCPU, 2 vCPU, 4 vCPU)"
  type        = string
  default     = "0.25 vCPU"
}

variable "apprunner_memory" {
  description = "Memory allocation for App Runner (0.5 GB, 1 GB, 2 GB, 3 GB, 4 GB, 6 GB, 8 GB, 10 GB, 12 GB)"
  type        = string
  default     = "0.5 GB"
}

variable "auto_deployments_enabled" {
  description = "Enable automatic deployments when new image is pushed"
  type        = bool
  default     = false
}

variable "max_concurrency" {
  description = "Maximum number of concurrent requests per instance"
  type        = number
  default     = 100
}

variable "max_size" {
  description = "Maximum number of instances"
  type        = number
  default     = 10
}

variable "min_size" {
  description = "Minimum number of instances"
  type        = number
  default     = 1
}

# Application environment variables
variable "django_secret_key" {
  description = "Django secret key"
  type        = string
  sensitive   = true
}

variable "django_debug" {
  description = "Django debug mode"
  type        = string
  default     = "False"
}

variable "allowed_hosts" {
  description = "Django allowed hosts"
  type        = string
  default     = "*"
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins"
  type        = string
  default     = "*"
}

variable "csrf_trusted_origins" {
  description = "CSRF trusted origins"
  type        = string
  default     = ""
}
