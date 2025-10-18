# Variables for AI Cash Revolution ML Trading Infrastructure

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "railway_token" {
  description = "Railway API token"
  type        = string
  sensitive   = true
}

variable "railway_project_name" {
  description = "Name of the Railway project"
  type        = string
  default     = "ai-cash-revolution-ml"
}

# Supabase configuration
variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  sensitive   = true
}

variable "supabase_service_key" {
  description = "Supabase service role key"
  type        = string
  sensitive   = true
}

variable "supabase_database_url" {
  description = "Supabase database connection string"
  type        = string
  sensitive   = true
}

# OANDA API configuration
variable "oanda_api_key" {
  description = "OANDA API key"
  type        = string
  sensitive   = true
}

variable "oanda_account_id" {
  description = "OANDA account ID"
  type        = string
  sensitive   = true
}

# VPC configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

# Redis configuration
variable "redis_instance_type" {
  description = "ElastiCache Redis instance type"
  type        = string
  default     = "cache.t3.micro"
}

# RDS configuration
variable "create_backup_database" {
  description = "Whether to create backup RDS database"
  type        = bool
  default     = false
}

variable "database_instance_type" {
  description = "RDS instance type"
  type        = string
  default     = "db.t3.micro"
}

# DNS configuration
variable "create_custom_domain" {
  description = "Whether to create custom DNS records"
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Custom domain name"
  type        = string
  default     = "aicashrevolution.com"
}

variable "api_subdomain" {
  description = "Subdomain for API"
  type        = string
  default     = "api"
}

# Cost monitoring
variable "monthly_budget_usd" {
  description = "Monthly budget in USD for cost monitoring"
  type        = number
  default     = 200
}

# Monitoring configuration
variable "enable_monitoring" {
  description = "Whether to enable comprehensive monitoring"
  type        = bool
  default     = true
}

variable "enable_alerts" {
  description = "Whether to enable alert notifications"
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email address for alert notifications"
  type        = string
  default     = ""
}

# Performance configuration
variable "enable_auto_scaling" {
  description = "Whether to enable auto-scaling"
  type        = bool
  default     = true
}

variable "min_instances" {
  description = "Minimum number of service instances"
  type        = number
  default     = 2
}

variable "max_instances" {
  description = "Maximum number of service instances"
  type        = number
  default     = 10
}

variable "memory_mb" {
  description = "Memory allocation per instance in MB"
  type        = number
  default     = 2048
}

variable "cpu_cores" {
  description = "CPU cores per instance"
  type        = number
  default     = 2
}

# Security configuration
variable "enable_redis_auth" {
  description = "Whether to enable Redis authentication"
  type        = bool
  default     = true
}

variable "enable_encryption" {
  description = "Whether to enable encryption for sensitive data"
  type        = bool
  default     = true
}

# Backup configuration
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "enable_cross_region_backup" {
  description = "Whether to enable cross-region backups"
  type        = bool
  default     = false
}

variable "backup_region" {
  description = "Secondary region for backups"
  type        = string
  default     = "us-west-2"
}

# Logging configuration
variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 14
}

variable "enable_detailed_logging" {
  description = "Whether to enable detailed logging"
  type        = bool
  default     = true
}

# ML model configuration
variable "model_version" {
  description = "Current ML model version"
  type        = string
  default     = "v1.0"
}

variable "training_schedule" {
  description = "Cron schedule for model training"
  type        = string
  default     = "0 2 * * 0"  # Weekly on Sunday at 2 AM UTC
}

variable "max_prediction_latency_ms" {
  description = "Maximum acceptable prediction latency in milliseconds"
  type        = number
  default     = 500
}

# Feature flags
variable "enable_feature_flagging" {
  description = "Whether to enable feature flagging"
  type        = bool
  default     = true
}

variable "enabled_features" {
  description = "List of enabled features"
  type        = list(string)
  default     = ["ml_predictions", "real_time_trading", "advanced_analytics"]
}

# Resource tagging
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default = {
    Owner       = "ai-cash-revolution-team"
    Project     = "ai-cash-revolution"
    ManagedBy   = "terraform"
  }
}

# Rate limiting
variable "enable_rate_limiting" {
  description = "Whether to enable API rate limiting"
  type        = bool
  default     = true
}

variable "rate_limit_requests_per_minute" {
  description = "Maximum requests per minute per client"
  type        = number
  default     = 100
}

# Performance monitoring
variable "enable_performance_monitoring" {
  description = "Whether to enable detailed performance monitoring"
  type        = bool
  default     = true
}

variable "performance_metrics_retention_days" {
  description = "Number of days to retain performance metrics"
  type        = number
  default     = 30
}