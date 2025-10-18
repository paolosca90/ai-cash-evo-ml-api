# Monitoring and Alerting Module

# SNS Topics for alerts
resource "aws_sns_topic" "budget_alerts" {
  count = var.create_alert_topics ? 1 : 0
  name  = "${var.environment}-ai-cash-revolution-budget-alerts"

  tags = var.tags
}

resource "aws_sns_topic" "operational_alerts" {
  count = var.create_alert_topics ? 1 : 0
  name  = "${var.environment}-ai-cash-revolution-operational-alerts"

  tags = var.tags
}

resource "aws_sns_topic" "performance_alerts" {
  count = var.create_alert_topics ? 1 : 0
  name  = "${var.environment}-ai-cash-revolution-performance-alerts"

  tags = var.tags
}

# Email subscriptions for alerts
resource "aws_sns_topic_subscription" "budget_email" {
  count     = var.create_alert_topics && var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.budget_alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_sns_topic_subscription" "operational_email" {
  count     = var.create_alert_topics && var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.operational_alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_sns_topic_subscription" "performance_email" {
  count     = var.create_alert_topics && var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.performance_alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "ml_service_logs" {
  name              = "/aws/railway/${var.environment}-ml-service"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "application_logs" {
  name              = "/aws/application/${var.environment}-ai-cash-revolution"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# CloudWatch Dashboards
resource "aws_cloudwatch_dashboard" "ml_service_dashboard" {
  count = var.create_dashboards ? 1 : 0
  name  = "${var.environment}-ai-cash-revolution-ml-service"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Railway", "CPUUtilization", "ServiceName", "ml-prediction-api"],
            [".", "MemoryUtilization", ".", "."],
            [".", "RequestCount", ".", "."],
            [".", "ErrorRate", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
          title  = "ML Service Metrics"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ElastiCache", "CurrConnections", "CacheClusterId", "ml-redis"],
            [".", "CacheHits", ".", "."],
            [".", "CacheMisses", ".", "."],
            [".", "Evictions", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
          title  = "Redis Performance"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 24
        height = 6

        properties = {
          metrics = [
            ["AWS/Railway", "ResponseTime", "ServiceName", "ml-prediction-api"],
            [".", "4XXError", ".", "."],
            [".", "5XXError", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
          title  = "API Performance and Errors"
          view   = "timeSeries"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_cloudwatch_dashboard" "cost_dashboard" {
  count = var.create_dashboards ? 1 : 0
  name  = "${var.environment}-ai-cash-revolution-costs"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 24
        height = 6

        properties = {
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "Currency", "USD"]
          ]
          period = 86400
          stat   = "Maximum"
          region = "us-east-1"
          title  = "Daily Estimated Charges"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AWS Railway"],
            [".", ".", "ServiceName", "AWS ElastiCache"],
            [".", ".", "ServiceName", "Amazon RDS"]
          ]
          period = 86400
          stat   = "Maximum"
          region = "us-east-1"
          title  = "Service-wise Costs"
          view   = "timeSeries"
        }
      }
    ]
  })

  tags = var.tags
}

# CloudWatch Alarms

# ML Service Health Alerts
resource "aws_cloudwatch_metric_alarm" "high_cpu_utilization" {
  alarm_name          = "${var.environment}-ml-service-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/Railway"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ec2 cpu utilization"
  alarm_actions       = var.create_alert_topics ? [aws_sns_topic.operational_alerts[0].arn] : []

  dimensions = {
    ServiceName = "ml-prediction-api"
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "high_memory_utilization" {
  alarm_name          = "${var.environment}-ml-service-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/Railway"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors memory utilization"
  alarm_actions       = var.create_alert_topics ? [aws_sns_topic.operational_alerts[0].arn] : []

  dimensions = {
    ServiceName = "ml-prediction-api"
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "${var.environment}-ml-service-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ErrorRate"
  namespace           = "AWS/Railway"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "This metric monitors API error rate"
  alarm_actions       = var.create_alert_topics ? [aws_sns_topic.operational_alerts[0].arn] : []

  dimensions = {
    ServiceName = "ml-prediction-api"
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "high_response_time" {
  alarm_name          = "${var.environment}-ml-service-slow-response"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ResponseTime"
  namespace           = "AWS/Railway"
  period              = "300"
  statistic           = "Average"
  threshold           = "2000"  # 2 seconds
  alarm_description   = "This metric monitors API response time"
  alarm_actions       = var.create_alert_topics ? [aws_sns_topic.performance_alerts[0].arn] : []

  dimensions = {
    ServiceName = "ml-prediction-api"
  }

  tags = var.tags
}

# Redis Alerts
resource "aws_cloudwatch_metric_alarm" "redis_high_connections" {
  alarm_name          = "${var.environment}-redis-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Redis connections"
  alarm_actions       = var.create_alert_topics ? [aws_sns_topic.operational_alerts[0].arn] : []

  dimensions = {
    CacheClusterId = "ml-redis"
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_low_hit_rate" {
  alarm_name          = "${var.environment}-redis-low-hit-rate"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CacheHitRate"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "This metric monitors Redis cache hit rate"
  alarm_actions       = var.create_alert_topics ? [aws_sns_topic.performance_alerts[0].arn] : []

  dimensions = {
    CacheClusterId = "ml-redis"
  }

  tags = var.tags
}

# Custom CloudWatch Metrics for ML Operations
resource "aws_cloudwatch_log_metric_filter" "prediction_count" {
  name           = "${var.environment}-ml-prediction-count"
  log_group_name = aws_cloudwatch_log_group.application_logs.name
  pattern        = "[timestamp, request_id, level, \"PREDICTION_REQUEST\", symbol, confidence]"

  metric_transformation {
    name      = "PredictionCount"
    namespace = "AI-Cash-Revolution"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "low_prediction_volume" {
  alarm_name          = "${var.environment}-low-prediction-volume"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "PredictionCount"
  namespace           = "AI-Cash-Revolution"
  period              = "3600"  # 1 hour
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors ML prediction volume"
  alarm_actions       = var.create_alert_topics ? [aws_sns_topic.operational_alerts[0].arn] : []

  tags = var.tags
}

# Budget Alerts (using AWS Budgets)
resource "aws_budgets_budget" "monthly_budget" {
  name              = "${var.environment}-ai-cash-revolution-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget_usd
  limit_unit        = "USD"
  time_unit         = "MONTHLY"

  cost_filter {
    name = "Service"
    values = [
      "AWS Railway",
      "AWS ElastiCache",
      "Amazon RDS",
      "Amazon CloudWatch"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email != "" ? [var.alert_email] : []
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 75
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email != "" ? [var.alert_email] : []
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 90
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email != "" ? [var.alert_email] : []
  }

  tags = var.tags
}