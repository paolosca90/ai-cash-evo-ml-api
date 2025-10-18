# Outputs for Railway ML Service Module

output "service_url" {
  description = "URL of the deployed Railway service"
  value       = railway_service.ml_service.url
}

output "project_id" {
  description = "ID of the Railway project"
  value       = railway_project.ml_project.id
}

output "service_id" {
  description = "ID of the Railway service"
  value       = railway_service.ml_service.id
}

output "custom_domain_url" {
  description = "URL of the custom domain (if configured)"
  value       = var.create_custom_domain ? railway_domain.custom_domain[0].domain : null
}

output "auto_scaling_enabled" {
  description = "Whether auto-scaling is enabled"
  value       = var.enable_auto_scaling
}

output "current_instances" {
  description = "Current number of instances"
  value       = railway_service.ml_service.instances
}

output "resource_allocation" {
  description = "Resource allocation per instance"
  value = {
    cpu       = var.service_config.cpu_cores
    memory_mb = var.service_config.memory_mb
  }
}

output "deployment_urls" {
  description = "All URLs associated with the service"
  value = {
    service_url       = railway_service.ml_service.url
    custom_domain_url = var.create_custom_domain ? railway_domain.custom_domain[0].domain : null
    health_endpoint   = "${railway_service.ml_service.url}/health"
  }
}