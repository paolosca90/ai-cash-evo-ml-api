# Infrastructure Architecture Diagram

## Complete ML Trading System Architecture

```mermaid
graph TB
    %% External Services
    Oanda[OANDA API]
    Frontend[Trading Dashboard]
    MT5[MT5 Expert Advisors]

    %% Railway ML Service
    subgraph "Railway Cloud"
        MLAPI[ML Prediction API<br/>Flask + TensorFlow]
        Autoscaler[Auto-scaling<br/>2-10 instances]
        LoadBalancer[Load Balancer]
    end

    %% Caching Layer
    subgraph "AWS ElastiCache"
        Redis[(Redis Cluster<br/>Model Weights Cache<br/>Indicator Cache)]
    end

    %% Database Layer
    subgraph "Supabase"
        SupaDB[(PostgreSQL Database)]
        EdgeFunctions[Edge Functions<br/>Signal Generation]
        Storage[File Storage<br/>Model Artifacts]
    end

    %% Monitoring & Logging
    subgraph "AWS CloudWatch"
        Metrics[Metrics Collection]
        Logs[Log Aggregation]
        Alarms[Alert System]
        Dashboards[Monitoring Dashboards]
    end

    %% DNS & CDN
    subgraph "AWS Route 53"
        DNS[Custom Domain<br/>api.aicashrevolution.com]
    end

    %% Backup Infrastructure
    subgraph "AWS Backup Services"
        BackupDB[(Backup RDS<br/>Optional)]
        S3[(S3 Storage<br/>Model Backups)]
    end

    %% Connections - Data Flow
    Frontend -->|HTTPS Request| LoadBalancer
    LoadBalancer --> MLAPI
    MT5 -->|Trading Signals| EdgeFunctions
    EdgeFunctions -->|Store Signals| SupaDB
    MLAPI -->|Model Predictions| SupaDB
    MLAPI -->|Cache Weights| Redis
    MLAPI -->|Store Results| SupaDB

    %% External API Connections
    MLAPI -->|Market Data| Oanda
    EdgeFunctions -->|Market Data| Oanda

    %% Monitoring Connections
    MLAPI -->|Metrics| Metrics
    Redis -->|Performance Metrics| Metrics
    SupaDB -->|Query Metrics| Metrics
    Metrics -->|Alerts| Alarms
    Logs -->|Search| Dashboards

    %% Backup Connections
    SupaDB -->|Automated Backups| S3
    MLAPI -->|Model Artifacts| Storage
    Storage -->|Sync| S3

    %% DNS
    DNS -->|CNAME| LoadBalancer

    %% Styling
    classDef infrastructure fill:#e1f5fe
    classDef database fill:#f3e5f5
    classDef monitoring fill:#e8f5e8
    classDef external fill:#fff3e0

    class MLAPI,Autoscaler,LoadBalancer infrastructure
    class Redis,SupaDB,BackupDB,S3,Storage database
    class Metrics,Logs,Alarms,Dashboards monitoring
    class Oanda,Frontend,MT5,DNS external
```

## Component Interactions

### 1. Real-time Trading Signal Flow
```mermaid
sequenceDiagram
    participant Dashboard as Trading Dashboard
    participant API as ML API (Railway)
    participant Redis as Redis Cache
    participant SupaDB as Supabase DB
    participant Oanda as OANDA API
    participant Edge as Edge Functions

    Dashboard->>API: Request signal for EURUSD
    API->>Redis: Check cached weights
    alt Weights cached
        Redis-->>API: Return cached weights
    else Weights not cached
        API->>SupaDB: Fetch latest weights
        SupaDB-->>API: Return weights
        API->>Redis: Cache weights (TTL: 5min)
    end

    API->>Oanda: Fetch market data
    Oanda-->>API: Return price data

    API->>API: Calculate indicators
    API->>API: Generate ML prediction
    API->>SupaDB: Store prediction
    API-->>Dashboard: Return signal

    Edge->>Oanda: Continuous market monitoring
    Edge->>SupaDB: Store market data
```

### 2. Model Training Pipeline
```mermaid
sequenceDiagram
    participant Scheduler as Cron Scheduler
    participant API as ML API
    participant SupaDB as Supabase DB
    participant Storage as Model Storage
    participant Redis as Redis Cache

    Scheduler->>API: Trigger weekly training
    API->>SupaDB: Fetch 90 days of training data
    SupaDB-->>API: Return historical data

    API->>API: Train LSTM model
    API->>API: Calculate feature importance
    API->>API: Optimize indicator weights

    API->>Storage: Save new model version
    API->>SupaDB: Update weights table
    API->>Redis: Invalidate weight cache
    API->>API: Load new model for predictions

    API-->>Scheduler: Training complete
```

### 3. Auto-scaling Behavior
```mermaid
graph TD
    Load[Load Increase<br/>Trading Hours] --> Monitor{Monitor Metrics}

    Monitor -->|CPU > 70%| ScaleUp[Scale Up Instance]
    Monitor -->|Memory > 80%| ScaleUp
    Monitor -->|Response Time > 2s| ScaleUp
    Monitor -->|Request Rate Increase| ScaleUp

    Monitor -->|CPU < 40%| ScaleDown[Scale Down Instance]
    Monitor -->|Memory < 50%| ScaleDown
    Monitor -->|Low Request Rate| ScaleDown

    ScaleUp --> CheckMax{Max Instances?}
    CheckMax -->|No| AddInstance[Add New Instance]
    CheckMax -->|Yes| AlertMax[Alert: Max Capacity]

    ScaleDown --> CheckMin{Min Instances?}
    CheckMin -->|No| RemoveInstance[Remove Instance]
    CheckMin -->|Yes| StayMin[Maintain Min Instances]

    AddInstance --> HealthCheck[Health Check New Instance]
    HealthCheck --> Success[✅ Instance Ready]
    HealthCheck --> Failed[❌ Rollback]

    classDef success fill:#c8e6c9
    classDef warning fill:#fff3cd
    classDef error fill:#f8d7da

    class Success success
    class Warning warning
    class Error error
```

## Infrastructure Cost Analysis

### Monthly Cost Breakdown

| Service | Tier | Monthly Cost | Purpose |
|---------|------|--------------|---------|
| Railway ML Service | Pro + Auto-scaling | $60 | ML model serving |
| Supabase Database | Pro | $25 | Primary database |
| Supabase Functions | Pay-as-you-go | $5 | Signal generation |
| AWS ElastiCache (Redis) | cache.t3.micro | $25 | Caching layer |
| AWS CloudWatch | Basic | $10 | Monitoring |
| Custom Domain | Route 53 | $1 | DNS management |
| **Total** | | **$126** | **Production Infrastructure** |

### Cost Optimization Strategies

1. **Auto-scaling**: Pay only for resources used
2. **Caching**: Reduce database queries by 80%
3. **Scheduled Scaling**: Reduce instances during off-hours
4. **Model Optimization**: Quantize models to reduce memory usage
5. **Data Retention**: Archive old data to cheaper storage

## Security Architecture

### Network Security
- **HTTPS Only**: All traffic encrypted with TLS 1.3
- **Private Endpoints**: Database connections via private networks
- **VPC Isolation**: Redis and backup DB in isolated VPC
- **Firewall Rules**: Restrict access to necessary services only

### Application Security
- **API Keys**: Secure storage in Railway secrets
- **Database Authentication**: Service role keys with least privilege
- **Rate Limiting**: Prevent API abuse and DDoS
- **Input Validation**: Sanitize all user inputs

### Data Security
- **Encryption at Rest**: All data encrypted in databases
- **Encryption in Transit**: All API calls encrypted
- **Access Logs**: Comprehensive audit trail
- **Backup Encryption**: Encrypted backups in S3

## Disaster Recovery Plan

### RTO (Recovery Time Objective): 15 minutes
### RPO (Recovery Point Objective): 5 minutes

### Backup Strategy
1. **Database**: Automated daily backups + point-in-time recovery
2. **Model Artifacts**: Versioned storage in Supabase + S3
3. **Configuration**: Git version control + Infrastructure as Code
4. **Application**: Blue-green deployment strategy

### Recovery Procedures
1. **Service Outage**: Auto-scaling + health checks
2. **Database Failure**: Failover to read replica + restore from backup
3. **Model Corruption**: Rollback to previous version
4. **Region Outage**: Manual failover to secondary region

## Performance Optimization

### Response Time Targets
- **API Predictions**: <500ms (95th percentile)
- **Database Queries**: <100ms average
- **Cache Hits**: <10ms
- **Model Loading**: <2s initial, then cached

### Caching Strategy
- **Model Weights**: 5-minute TTL in Redis
- **Technical Indicators**: 1-minute TTL
- **Market Data**: 30-second TTL
- **API Responses**: 1-minute TTL for identical requests

### Database Optimization
- **Connection Pooling**: 2-20 connections per service
- **Read Replicas**: Reporting queries to replicas
- **Indexing Strategy**: Optimized for symbol + timestamp queries
- **Query Optimization**: Prepared statements and batch operations

## Monitoring & Alerting Strategy

### Key Performance Indicators (KPIs)
1. **System Health**: Uptime >99.9%
2. **API Performance**: Response time <500ms
3. **Model Accuracy**: Win rate >65%
4. **Cost Efficiency**: <$200/month total

### Alert Thresholds
- **Critical**: Service down, error rate >10%
- **Warning**: High CPU/memory, slow response times
- **Info**: Low prediction volume, cache misses

### Dashboard Views
1. **Executive Overview**: System health, costs, performance
2. **Technical Details**: Metrics, logs, traces
3. **Trading Performance**: Win rates, profit/loss, signal quality
4. **Infrastructure**: Resource utilization, scaling events

This architecture provides a robust, scalable, and cost-effective foundation for your ML trading system, capable of handling real-time trading operations with high reliability and performance.