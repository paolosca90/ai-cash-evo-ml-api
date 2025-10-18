# Variables for Railway ML Service Module

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Name of the Railway project"
  type        = string
}

variable "environment_variables" {
  description = "Environment variables for the Railway service"
  type        = map(string)
  default     = {}
}

variable "service_config" {
  description = "Configuration for the Railway service"
  type = object({
    build_command     = string
    start_command     = string
    healthcheck_path  = string
    min_instances     = number
    max_instances     = number
    memory_mb         = number
    cpu_cores         = number
  })
}

variable "enable_auto_scaling" {
  description = "Whether to enable auto-scaling"
  type        = bool
  default     = true
}

variable "create_custom_domain" {
  description = "Whether to create custom domain"
  type        = bool
  default     = false
}

variable "custom_domain" {
  description = "Custom domain name"
  type        = string
  default     = ""
}

variable "enable_deployment_hooks" {
  description = "Whether to enable deployment hooks"
  type        = bool
  default     = true
}

variable "service_url" {
  description = "Service URL for output"
  type        = string
  default     = ""
}