# Railway ML Service Module

resource "railway_project" "ml_project" {
  name = var.project_name
}

resource "railway_service" "ml_service" {
  project_id = railway_project.ml_project.id
  name       = "ml-prediction-api"

  # Build configuration
  build {
    builder = "NIXPACKS"
    build_command = var.service_config.build_command
  }

  # Deploy configuration
  deploy {
    start_command = var.service_config.start_command
    healthcheck_path = var.service_config.healthcheck_path
    healthcheck_timeout = 30
    restart_policy_type = "ON_FAILURE"
    restart_policy_max_retries = 5

    # Auto-scaling
    instances = var.service_config.min_instances
  }

  # Resource allocation
  instance_settings {
    cpu        = var.service_config.cpu_cores
    memory_mb  = var.service_config.memory_mb
  }

  # Environment variables
  dynamic "environment_variable" {
    for_each = var.environment_variables
    content {
      key   = environment_variable.key
      value = environment_variable.value
    }
  }
}

# Railway domain (custom domain support)
resource "railway_domain" "custom_domain" {
  count      = var.create_custom_domain ? 1 : 0
  project_id = railway_project.ml_project.id
  service_id = railway_service.ml_service.id
  domain     = var.custom_domain
}

# Auto-scaling configuration
resource "railway_autoscaling" "ml_autoscaling" {
  count      = var.enable_auto_scaling ? 1 : 0
  project_id = railway_project.ml_project.id
  service_id = railway_service.ml_service.id

  min_instances = var.service_config.min_instances
  max_instances = var.service_config.max_instances

  scaling_policy {
    metric_type    = "CPU_UTILIZATION"
    target_value   = 70
    scale_up_cooldown = 300
    scale_down_cooldown = 600
  }

  scaling_policy {
    metric_type    = "MEMORY_UTILIZATION"
    target_value   = 80
    scale_up_cooldown = 300
    scale_down_cooldown = 600
  }

  scaling_policy {
    metric_type    = "RESPONSE_TIME"
    target_value   = 2000  # 2 seconds
    scale_up_cooldown = 120
    scale_down_cooldown = 300
  }
}

# Railway deployment hooks
resource "railway_deployment_hook" "pre_deploy" {
  count      = var.enable_deployment_hooks ? 1 : 0
  project_id = railway_project.ml_project.id
  service_id = railway_service.ml_service.id
  trigger    = "BEFORE_DEPLOY"

  script = <<-EOT
    #!/bin/bash
    echo "Starting pre-deployment checks..."

    # Check database connectivity
    python -c "
import os
from supabase import create_client
import sys

try:
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    client = create_client(url, key)
    client.table('trading_signals').select('id').limit(1).execute()
    print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    sys.exit(1)
"

    # Check Redis connectivity
    python -c "
import os
import redis
import sys

try:
    redis_url = os.getenv('REDIS_URL')
    r = redis.from_url(redis_url)
    r.ping()
    print('✅ Redis connection successful')
except Exception as e:
    print(f'❌ Redis connection failed: {e}')
    sys.exit(1)
"

    echo "Pre-deployment checks completed successfully"
  EOT
}

resource "railway_deployment_hook" "post_deploy" {
  count      = var.enable_deployment_hooks ? 1 : 0
  project_id = railway_project.ml_project.id
  service_id = railway_service.ml_service.id
  trigger    = "AFTER_DEPLOY"

  script = <<-EOT
    #!/bin/bash
    echo "Starting post-deployment verification..."

    # Health check
    sleep 30  # Wait for service to start

    curl -f "${railway_service.ml_service.url}/health" || {
      echo "❌ Health check failed"
      exit 1
    }

    echo "✅ Service is healthy"

    # Model loading check
    curl -f "${railway_service.ml_service.url}/health/detailed" || {
      echo "❌ Detailed health check failed"
      exit 1
    }

    echo "✅ All systems operational"
  EOT
}

# Railway project settings
resource "railway_project_settings" "ml_settings" {
  project_id = railway_project.ml_project.id

  # Environment settings
  environment = var.environment

  # CI/CD settings
  auto_deploy_on_push = true
  build_timeout_seconds = 900  # 15 minutes

  # Monitoring settings
  enable_metrics = true
  enable_logs = true
  log_retention_days = 30

  # Security settings
  enable_ssl = true
  enforce_https = true

  # Performance settings
  enable_response_compression = true
  enable_request_caching = true
}