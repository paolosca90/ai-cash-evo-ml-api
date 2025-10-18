# Terraform configuration for AI Cash Revolution ML Trading Infrastructure
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    railway = {
      source  = "railway/railway"
      version = "~> 1.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Railway provider configuration
provider "railway" {
  token = var.railway_token
}

# Random password generation
resource "random_password" "redis_password" {
  length  = 32
  special = true
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# VPC for infrastructure
module "vpc" {
  source = "./modules/vpc"

  environment = var.environment
  vpc_cidr    = var.vpc_cidr

  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  enable_nat_gateway = true
  enable_vpn_gateway = false
}

# Redis ElastiCache for caching layer
module "redis" {
  source = "./modules/redis"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id

  subnet_ids          = module.vpc.private_subnet_ids
  redis_password      = random_password.redis_password.result
  redis_instance_type = var.redis_instance_type

  security_group_ids = [module.security.redis_security_group_id]

  tags = {
    Project     = "ai-cash-revolution"
    Environment = var.environment
    Component   = "redis-cache"
  }
}

# RDS for backup database (optional)
module "rds" {
  source = "./modules/rds"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id

  subnet_ids          = module.vpc.private_subnet_ids
  database_password   = random_password.db_password.result
  database_instance_type = var.database_instance_type

  security_group_ids = [module.security.rds_security_group_id]

  create_backup_database = var.create_backup_database

  tags = {
    Project     = "ai-cash-revolution"
    Environment = var.environment
    Component   = "backup-database"
  }
}

# Security groups
module "security" {
  source = "./modules/security"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id

  # Redis access from Railway
  redis_allowed_cidrs = ["0.0.0.0/0"] # Railway IPs

  # RDS access from Railway
  rds_allowed_cidrs = ["0.0.0.0/0"] # Railway IPs

  tags = {
    Project     = "ai-cash-revolution"
    Environment = var.environment
    Component   = "security-groups"
  }
}

# CloudWatch for monitoring
module "monitoring" {
  source = "./modules/monitoring"

  environment = var.environment

  # Create SNS topics for alerts
  create_alert_topics = true

  # CloudWatch dashboards
  create_dashboards = true

  tags = {
    Project     = "ai-cash-revolution"
    Environment = var.environment
    Component   = "monitoring"
  }
}

# Railway ML Service
module "railway_ml_service" {
  source = "./modules/railway"

  environment = var.environment

  project_name = var.railway_project_name

  # Environment variables for Railway
  environment_variables = {
    # Database configuration
    DATABASE_URL = var.supabase_database_url
    SUPABASE_URL = var.supabase_url
    SUPABASE_KEY = var.supabase_service_key

    # Redis configuration
    REDIS_URL = "redis://:${random_password.redis_password.result}@${module.redis.redis_endpoint}:6379"

    # Model configuration
    MODEL_VERSION = "v1.0"
    TRAINING_SCHEDULE = "0 2 * * 0"  # Weekly training

    # Performance settings
    WORKERS = "2"
    TIMEOUT = "300"
    MAX_REQUESTS = "1000"

    # Monitoring
    ENABLE_METRICS = "true"
    LOG_LEVEL = "INFO"

    # External APIs
    OANDA_API_KEY = var.oanda_api_key
    OANDA_ACCOUNT_ID = var.oanda_account_id
  }

  # Railway service configuration
  service_config = {
    build_command = "pip install -r requirements.txt"
    start_command = "gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 300 --worker-class gevent"
    healthcheck_path = "/health"

    # Auto-scaling
    min_instances = 2
    max_instances = 10

    # Resource allocation
    memory_mb = 2048
    cpu_cores = 2
  }

  depends_on = [module.redis, module.monitoring]
}

# Route 53 for custom domain (optional)
module "dns" {
  source = "./modules/dns"

  environment = var.environment

  domain_name = var.domain_name
  subdomain   = var.api_subdomain

  railway_service_url = module.railway_ml_service.service_url

  create_dns_records = var.create_custom_domain

  tags = {
    Project     = "ai-cash-revolution"
    Environment = var.environment
    Component   = "dns"
  }
}

# Cost monitoring
module "cost_monitoring" {
  source = "./modules/cost-monitoring"

  environment = var.environment

  # Budget alerts
  monthly_budget_usd = var.monthly_budget_usd
  budget_thresholds = [50, 75, 90]  # Alert at 50%, 75%, 90%

  # SNS topic for budget alerts
  budget_alert_topic_arn = module.monitoring.budget_alert_topic_arn

  tags = {
    Project     = "ai-cash-revolution"
    Environment = var.environment
    Component   = "cost-monitoring"
  }
}

# Outputs
output "railway_service_url" {
  description = "URL of the deployed Railway ML service"
  value       = module.railway_ml_service.service_url
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.redis.redis_endpoint
}

output "backup_database_endpoint" {
  description = "RDS backup database endpoint"
  value       = var.create_backup_database ? module.rds.database_endpoint : null
}

output "monitoring_dashboard_urls" {
  description = "CloudWatch dashboard URLs"
  value       = module.monitoring.dashboard_urls
}

output "cost_monitoring_setup" {
  description = "Cost monitoring configuration"
  value       = {
    monthly_budget_usd  = var.monthly_budget_usd
    alert_thresholds    = [50, 75, 90]
    notification_topic  = module.monitoring.budget_alert_topic_arn
  }
}