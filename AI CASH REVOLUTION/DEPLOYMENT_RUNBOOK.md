# Deployment Runbook - AI Cash Revolution ML Trading System

## Overview

This runbook provides step-by-step instructions for deploying, managing, and troubleshooting the AI Cash Revolution ML trading system in production.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Deployment Process](#deployment-process)
4. [Monitoring & Verification](#monitoring--verification)
5. [Troubleshooting](#troubleshooting)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Emergency Procedures](#emergency-procedures)
8. [Rollback Procedures](#rollback-procedures)

## Prerequisites

### Required Accounts & Services
- [x] Railway account with Pro tier ($20/month)
- [x] Supabase project with Pro tier ($25/month)
- [x] AWS account (for monitoring and Redis)
- [x] Domain name (optional, for custom domain)
- [x] OANDA account with paper trading

### Required Tools
```bash
# Install necessary CLI tools
npm install -g @supabase/cli
npm install -g @railway/cli
npm install -g aws-cli

# Terraform for infrastructure
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform
```

### Required Secrets & Configuration
Create a `.env` file with the following:
```bash
# Railway
RAILWAY_TOKEN=your_railway_token
RAILWAY_PROJECT_NAME=ai-cash-revolution-ml

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_DATABASE_URL=postgresql://...

# OANDA
OANDA_API_KEY=your_oanda_key
OANDA_ACCOUNT_ID=your_account_id

# AWS
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=us-east-1

# Monitoring
ALERT_EMAIL=your-email@example.com
```

## Initial Setup

### 1. Database Setup

#### Apply Supabase Schema
```bash
# Navigate to project root
cd /path/to/ai-cash-revolution

# Apply ML training schema
npx supabase db push --db-url $SUPABASE_DATABASE_URL

# Or manually execute SQL in Supabase dashboard
# File: database/schemas/ml_training_schema.sql
```

#### Verify Database Tables
```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'trading_signals',
    'ml_training_samples',
    'ml_model_performance',
    'ml_generation_logs',
    'ml_indicator_weights',
    'oanda_paper_trades'
  );
```

### 2. Redis Cache Setup (Terraform)

```bash
# Navigate to Terraform directory
cd TERRAFORM_MODULES

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var-file="production.tfvars"

# Apply infrastructure
terraform apply -var-file="production.tfvars"
```

### 3. Railway Project Setup

```bash
# Login to Railway
railway login

# Create new project
railway project create ai-cash-revolution-ml

# Set environment variables
railway variables set DATABASE_URL=$SUPABASE_DATABASE_URL
railway variables set SUPABASE_URL=$SUPABASE_URL
railway variables set SUPABASE_KEY=$SUPABASE_SERVICE_KEY
railway variables set REDIS_URL=redis://your-redis-endpoint:6379
railway variables set OANDA_API_KEY=$OANDA_API_KEY
railway variables set OANDA_ACCOUNT_ID=$OANDA_ACCOUNT_ID
```

## Deployment Process

### Step 1: Code Preparation

#### Update Railway Configuration
```toml
# railway-ml-service/railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 300 --worker-class gevent"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 5

[env]
PORT = "8080"
PYTHON_VERSION = "3.11"
WORKERS = "2"
WORKER_CLASS = "gevent"
TIMEOUT = "300"
MAX_REQUESTS = "1000"
MODEL_VERSION = "v1.0"
ENABLE_METRICS = "true"
LOG_LEVEL = "INFO"
```

#### Enhanced Flask Application
Update `railway-ml-service/app.py` with production-ready code:
```python
# See INFRASTRUCTURE_ANALYSIS.md for complete implementation
```

### Step 2: Deploy to Railway

#### Option A: Automatic Deployment (Recommended)
```bash
# Push to GitHub (Railway auto-deploys)
git add .
git commit -m "Deploy production-ready ML API"
git push origin main

# Monitor deployment in Railway dashboard
# https://railway.app/project/ai-cash-revolution-ml
```

#### Option B: Manual Deployment
```bash
# Deploy via Railway CLI
railway up
```

### Step 3: Configure Edge Functions

```bash
# Deploy Supabase edge functions
npx supabase functions deploy generate-ai-signals
npx supabase functions deploy ml-random-signals
npx supabase functions deploy technical-indicators

# Set edge function secrets
npx supabase secrets set ML_API_URL=https://your-app.railway.app
```

## Monitoring & Verification

### 1. Health Checks

#### Basic Health Check
```bash
curl -f https://your-app.railway.app/health
# Expected: {"status": "healthy", "models_loaded": true}
```

#### Detailed Health Check
```bash
curl -f https://your-app.railway.app/health/detailed
# Expected: Detailed status of all components
```

### 2. API Testing

#### Test Prediction Endpoint
```bash
curl -X POST https://your-app.railway.app/predict \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "EURUSD",
    "indicators": {
      "adx_value": 35.5,
      "rsi_value": 65.2,
      "ema_12": 1.0850,
      "ema_21": 1.0840,
      "entry_price": 1.0855
    }
  }'
```

#### Test Training Endpoint
```bash
curl -X POST https://your-app.railway.app/train \
  -H "Content-Type: application/json" \
  -d '{"force_retrain": false}'
```

### 3. Database Verification

```sql
-- Check if signals are being generated
SELECT COUNT(*) as signal_count,
       AVG(confidence) as avg_confidence,
       MAX(created_at) as latest_signal
FROM trading_signals
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check ML weights
SELECT indicator_name, weight, model_version, updated_at
FROM ml_indicator_weights
ORDER BY updated_at DESC
LIMIT 10;
```

### 4. Monitoring Dashboard

Access monitoring dashboards:
- **Railway Dashboard**: https://railway.app/project/ai-cash-revolution-ml
- **CloudWatch**: https://console.aws.amazon.com/cloudwatch/
- **Supabase Dashboard**: https://app.supabase.com/project/your-project

## Troubleshooting

### Common Issues

#### 1. Deployment Fails
```bash
# Check build logs
railway logs

# Common solutions:
# - Check requirements.txt for valid dependencies
# - Verify railway.toml syntax
# - Ensure all environment variables are set
```

#### 2. Database Connection Issues
```bash
# Test database connection
psql $SUPABASE_DATABASE_URL -c "SELECT 1;"

# Common solutions:
# - Verify DATABASE_URL format
# - Check network access from Railway
# - Confirm Supabase service key permissions
```

#### 3. Redis Connection Issues
```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# Common solutions:
# - Check Redis cluster status in AWS
# - Verify security group allows Railway access
# - Confirm Redis password
```

#### 4. Model Loading Issues
```bash
# Check model files
ls -la railway-ml-service/models/

# Common solutions:
# - Ensure model files exist in repository
# - Check model file permissions
# - Verify model compatibility with TensorFlow version
```

#### 5. High Memory Usage
```bash
# Monitor memory usage
railway logs | grep "memory"

# Solutions:
# - Reduce LSTM batch size
# - Implement model quantization
# - Increase Railway memory allocation
```

#### 6. Slow Response Times
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-app.railway.app/health

# Solutions:
# - Enable Redis caching
# - Optimize database queries
# - Enable Railway auto-scaling
```

### Debug Mode

Enable debug logging:
```bash
# Set debug environment variable
railway variables set DEBUG=true
railway variables set LOG_LEVEL=DEBUG

# Restart service
railway restart
```

## Maintenance Procedures

### Daily Tasks
1. **Check System Health**: Verify all services are operational
2. **Review Metrics**: Check response times and error rates
3. **Monitor Costs**: Ensure within budget limits
4. **Review Logs**: Look for unusual patterns or errors

### Weekly Tasks
1. **Model Performance Review**: Analyze prediction accuracy
2. **Database Cleanup**: Remove old data (older than 90 days)
3. **Backup Verification**: Ensure backups are working
4. **Security Review**: Check for any security alerts

### Monthly Tasks
1. **Performance Optimization**: Review and optimize bottlenecks
2. **Cost Analysis**: Review spending and optimize
3. **Dependency Updates**: Update Python packages
4. **Documentation Update**: Update runbooks and documentation

### Database Cleanup
```sql
-- Clean old trading signals (older than 90 days)
DELETE FROM trading_signals
WHERE created_at < NOW() - INTERVAL '90 days';

-- Clean old ML training samples (older than 1 year)
DELETE FROM ml_training_samples
WHERE created_at < NOW() - INTERVAL '1 year';

-- Optimize tables
VACUUM ANALYZE trading_signals;
VACUUM ANALYZE ml_training_samples;
```

## Emergency Procedures

### Service Outage Response

#### Severity 1: Complete Service Outage
1. **Immediate Action**: Check Railway status page
2. **Assessment**: Determine if it's infrastructure or application issue
3. **Communication**: Notify stakeholders via email/Slack
4. **Resolution**: Follow troubleshooting steps
5. **Post-mortem**: Document root cause and prevention measures

#### Severity 2: Performance Degradation
1. **Assessment**: Monitor response times and error rates
2. **Scaling**: Manually increase instances if needed
3. **Optimization**: Identify and fix bottlenecks
4. **Monitoring**: Increased monitoring during incident

#### Severity 3: Model Performance Issues
1. **Assessment**: Check prediction accuracy and win rates
2. **Rollback**: If needed, rollback to previous model version
3. **Retraining**: Trigger manual model retraining
4. **Validation**: Thoroughly test new model before deployment

### Data Corruption Response
```bash
# Stop all write operations
railway variables set MAINTENANCE_MODE=true

# Assess damage extent
SELECT COUNT(*) FROM trading_signals
WHERE created_at > NOW() - INTERVAL '1 hour';

# Restore from backup if needed
npx supabase db restore --timestamp="2025-01-01T12:00:00Z"

# Resume operations
railway variables set MAINTENANCE_MODE=false
```

## Rollback Procedures

### Application Rollback
```bash
# List recent deployments
railway deployments list

# Rollback to previous version
railway rollback <deployment-id>

# Verify rollback
curl -f https://your-app.railway.app/health
```

### Database Rollback
```bash
# Point-in-time recovery
npx supabase db restore --timestamp="2025-01-01T12:00:00Z"

# Verify data integrity
SELECT COUNT(*) FROM trading_signals;
SELECT * FROM ml_indicator_weights ORDER BY updated_at DESC LIMIT 5;
```

### Model Rollback
```sql
-- Update to previous model version
UPDATE ml_indicator_weights
SET model_version = 'v0.9'
WHERE model_version = 'v1.0';

-- Invalidate cache
FLUSH redis;
```

## Performance Tuning

### Railway Service Optimization
```toml
# Optimize worker configuration
[deploy]
startCommand = "gunicorn app:app --bind 0.0.0.0:$PORT --workers 4 --worker-class gevent --preload"

# Resource allocation
[env]
WORKERS = "4"
WORKER_CLASS = "gevent"
PRELOAD_APP = "true"
MAX_REQUESTS = "500"
MAX_REQUESTS_JITTER = "50"
```

### Redis Optimization
```bash
# Optimize Redis configuration
CONFIG SET maxmemory 256mb
CONFIG SET maxmemory-policy allkeys-lru
CONFIG SET save 900 1 300 10 60 10000
```

### Database Optimization
```sql
-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_signals_symbol_created
ON trading_signals(symbol, created_at DESC);

CREATE INDEX CONCURRENTLY idx_training_symbol_outcome
ON ml_training_samples(symbol, actual_outcome);

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM trading_signals
WHERE symbol = 'EURUSD'
  AND created_at > NOW() - INTERVAL '1 day';
```

## Contact Information

### Emergency Contacts
- **DevOps Lead**: [Contact Information]
- **Development Team**: [Contact Information]
- **Infrastructure Provider**: Railway Support, Supabase Support

### External Support
- **Railway Support**: https://railway.app/support
- **Supabase Support**: https://supabase.com/docs/support
- **AWS Support**: https://aws.amazon.com/support/

---

**Last Updated**: October 18, 2025
**Version**: 1.0
**Next Review**: November 18, 2025