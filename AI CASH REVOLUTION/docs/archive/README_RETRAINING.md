# Continuous Retraining System for AI Trading Models

A comprehensive weekly batch retraining system that maintains and improves Reinforcement Learning (RL) models based on trading performance. This system automates the entire ML lifecycle from data collection to model deployment.

## 🚀 Features

### Core Functionality
- **Weekly Batch Processing**: Automatically collects and processes last week's trade data
- **Model Retraining**: Retrains PPO/CPPO models with incremental learning capabilities
- **Version Control**: Complete model versioning with rollback capabilities
- **A/B Testing**: Automated model comparison and traffic splitting
- **Performance Monitoring**: Real-time tracking of model performance and health
- **Smart Deployment**: Automated deployment with rollback protection

### Advanced Capabilities
- **Hyperparameter Optimization**: Automated hyperparameter tuning using Bayesian optimization
- **Data Quality Validation**: Comprehensive data preprocessing and cleaning
- **Drift Detection**: Statistical model performance degradation detection
- **Alert System**: Multi-channel notifications for critical issues
- **Scheduling**: Cron-based job scheduling with timezone support
- **Comprehensive Logging**: Detailed audit trails and debugging information

## 📋 Requirements

### Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Dependencies
- **TensorFlow.js** (^4.0.0) - For neural network training
- **Supabase** (^2.0.0) - Database and storage
- **Node.js** (>=16.0.0) - Runtime environment

### Database Tables
The system requires the following Supabase tables:

```sql
-- Model versions storage
CREATE TABLE ml_model_versions (
  id UUID PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  model_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trained_on TIMESTAMP WITH TIME ZONE NOT NULL,
  data_points INTEGER NOT NULL,
  metrics JSONB NOT NULL,
  config JSONB NOT NULL,
  hyperparameters JSONB,
  status VARCHAR(20) DEFAULT 'training',
  deployed_at TIMESTAMP WITH TIME ZONE,
  rollback_reason TEXT,
  performance_score INTEGER,
  file_url TEXT,
  checksum VARCHAR(64)
);

-- A/B testing management
CREATE TABLE ab_tests (
  id UUID PRIMARY KEY,
  model_a_version VARCHAR(50) NOT NULL,
  model_b_version VARCHAR(50) NOT NULL,
  traffic_split INTEGER NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active',
  winner VARCHAR(20),
  metrics JSONB
);

-- Performance alerts
CREATE TABLE performance_alerts (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message TEXT NOT NULL,
  details JSONB,
  acknowledged BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution TEXT
);

-- Deployment tracking
CREATE TABLE deployment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics history
CREATE TABLE model_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metrics JSONB NOT NULL
);
```

## 🛠️ Installation

### 1. Install Dependencies
```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-node supabase
```

### 2. Load TensorFlow.js
Add to your HTML head or main application file:
```html
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.0.0/dist/tf.min.js"></script>
```

### 3. Initialize the System
```typescript
import { quickStartRetraining, DEFAULT_RETRAINING_CONFIG } from './src/lib/retraining';

const config = {
  ...DEFAULT_RETRAINING_CONFIG,
  schedule: {
    enabled: true,
    cronExpression: '0 2 * * 0', // Weekly on Sunday at 2 AM
    timezone: 'UTC'
  }
};

const { system, stop, getStatus } = await quickStartRetraining(config);
```

## 📖 Usage

### Basic Setup
```typescript
import { useContinuousRetraining } from './src/hooks/useContinuousRetraining';

function RetrainingDashboard() {
  const {
    system,
    isLoading,
    error,
    isRunning,
    metrics,
    startSystem,
    stopSystem,
    runRetraining,
    startABTest
  } = useContinuousRetraining(true);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Retraining System</h2>
      <p>Status: {isRunning ? 'Running' : 'Stopped'}</p>
      <button onClick={() => runRetraining()}>
        Run Retraining Now
      </button>
    </div>
  );
}
```

### Manual Retraining
```typescript
import { RetrainingFactory } from './src/lib/retraining';

const factory = RetrainingFactory.getInstance();
const system = await factory.createSystem(config);

// Run immediate retraining
const job = await (system as any)._services.retrainingService.startRetraining();
console.log('Retraining job started:', job.id);
```

### A/B Testing
```typescript
// Start A/B test between two models
const deploymentManager = (system as any)._services.deploymentManager;
const rollout = await deploymentManager.startABTest('1.0.0', '1.1.0', 20);

// Check results
const results = await deploymentManager.getABTestResults(rollout.id);
console.log('Test results:', results.recommendation);
```

### Performance Monitoring
```typescript
const monitoringService = (system as any)._services.monitoringService;

// Get current metrics
const health = await monitoringService.getSystemHealth();
console.log('System health:', health.status);

// Get active alerts
const alerts = await monitoringService.getActiveAlerts();
console.log('Active alerts:', alerts.length);
```

## ⚙️ Configuration

### Default Configuration
```typescript
const DEFAULT_RETRAINING_CONFIG = {
  schedule: {
    enabled: true,
    cronExpression: '0 2 * * 0', // Weekly Sunday 2 AM
    timezone: 'UTC',
    runOnStartup: false
  },
  dataCollection: {
    lookbackDays: 7,
    minTradesThreshold: 50,
    maxTradesPerBatch: 1000,
    includeIncompleteTrades: false,
    dataQualityThreshold: 0.7
  },
  training: {
    epochs: 100,
    batchSize: 32,
    learningRate: 0.001,
    validationSplit: 0.2,
    earlyStoppingPatience: 10,
    hyperparameterOptimization: {
      enabled: true,
      maxTrials: 20,
      optimizationMetric: 'sharpe_ratio'
    }
  },
  evaluation: {
    minWinRate: 0.45,
    minProfitFactor: 1.2,
    maxDrawdownThreshold: 0.2,
    minTradesForValidation: 30,
    performanceDecayThreshold: 0.1
  },
  deployment: {
    autoDeploy: true,
    abTesting: {
      enabled: true,
      trafficSplit: 10,
      minConfidenceThreshold: 0.8
    },
    rollbackOnDegradation: true,
    cooldownPeriodHours: 24
  },
  monitoring: {
    alertsEnabled: true,
    performanceTracking: true,
    modelDriftDetection: {
      enabled: true,
      sensitivity: 0.1,
      checkIntervalHours: 6
    }
  }
};
```

### Cron Expression Examples
```typescript
// Every Sunday at 2 AM
'0 2 * * 0'

// Every Monday and Friday at 3 AM
'0 3 * * 1,5'

// Every day at midnight
'0 0 * * *'

// Every 6 hours
'0 */6 * * *'

// First day of every month at 1 AM
'0 1 1 * *'
```

## 🔧 API Reference

### Core Classes

#### RetrainingService
Main service coordinating all retraining operations.

```typescript
class RetrainingService {
  async startRetraining(): Promise<RetrainingJob>
  async startABTest(modelA: string, modelB: string, trafficSplit: number): Promise<void>
  async rollbackModel(reason: string): Promise<void>
  async checkSystemHealth(): Promise<{ status: string; issues: string[] }>
  async shutdown(): Promise<void>
}
```

#### DataCollector
Handles trade data collection and preprocessing.

```typescript
class DataCollector {
  async collectTradeData(startDate: string, endDate: string): Promise<TradeData[]>
  async validateDataQuality(trades: TradeData[]): Promise<{ valid: boolean; score: number; issues: string[] }>
  async generateFeatureVectors(trades: TradeData[]): Promise<TrainingSample[]>
}
```

#### ModelTrainer
Manages neural network training and evaluation.

```typescript
class ModelTrainer {
  async train(samples: TrainingSample[], config: RetrainingConfig): Promise<ModelVersion>
  async evaluate(model: ModelVersion, testData: TrainingSample[]): Promise<ModelMetrics>
  async hyperparameterOptimization(samples: TrainingSample[], config: RetrainingConfig): Promise<Record<string, any>>
}
```

### React Hooks

#### useContinuousRetraining
Main hook for managing the retraining system.

```typescript
const {
  system,
  isLoading,
  error,
  isRunning,
  metrics,
  startSystem,
  stopSystem,
  runRetraining,
  startABTest,
  rollbackModel
} = useContinuousRetraining(autoStart, config);
```

#### useAlerts
Hook for managing performance alerts.

```typescript
const { alerts, loading, acknowledgeAlert, resolveAlert } = useAlerts();
```

#### useSystemHealth
Hook for monitoring system health.

```typescript
const { health, refresh } = useSystemHealth();
```

## 📊 Monitoring & Alerts

### Alert Types
- **Performance Degradation**: When model metrics drop below thresholds
- **Model Drift**: Statistical performance changes detected
- **Training Failure**: Training job failures or timeouts
- **Data Quality**: Issues with input data validation

### Alert Severities
- **Critical**: Immediate attention required
- **High**: Should be addressed soon
- **Medium**: Monitor for escalation
- **Low**: Informational only

### Performance Metrics
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Ratio of total wins to total losses
- **Sharpe Ratio**: Risk-adjusted return metric
- **Max Drawdown**: Maximum peak-to-trough decline
- **Consistency Score**: Reliability of performance

## 🚀 Deployment

### Environment Setup
1. **Development**: Use local TensorFlow.js and development database
2. **Staging**: Test with production-like data and models
3. **Production**: Deploy with monitoring and alerts enabled

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
name: Model Retraining
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly Sunday 2 AM

jobs:
  retrain:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm install
      - name: Run retraining
        run: npm run retrain
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

### Docker Deployment
```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

CMD ["npm", "start"]
```

## 🔍 Troubleshooting

### Common Issues

#### TensorFlow.js Not Loaded
```javascript
// Check if TensorFlow is available
if (typeof tf === 'undefined') {
  console.error('TensorFlow.js not loaded');
  // Load dynamically
  import('@tensorflow/tfjs').then(tf => {
    window.tf = tf;
  });
}
```

#### Database Connection Issues
```typescript
// Check Supabase connection
const { data, error } = await supabase.from('ml_model_versions').select('*').limit(1);
if (error) {
  console.error('Database connection failed:', error.message);
}
```

#### Training Failures
```typescript
// Check training logs
const logs = await retrainingService.getCurrentJob();
console.log('Training logs:', logs?.logs);
```

### Debug Mode
Enable debug logging:
```typescript
const logger = new Logger({ logToConsole: true, maxLogs: 2000 });
```

## 📈 Performance Optimization

### Training Optimization
- **Batch Size**: Adjust based on available memory
- **Learning Rate**: Use learning rate scheduling
- **Early Stopping**: Prevent overfitting
- **GPU Acceleration**: Use TensorFlow.js GPU backend

### Data Optimization
- **Incremental Learning**: Reuse existing model weights
- **Data Caching**: Cache preprocessed features
- **Parallel Processing**: Use web workers for data preprocessing

### Monitoring Optimization
- **Sampling**: Monitor subset of trades for real-time metrics
- **Caching**: Cache frequently accessed model data
- **Lazy Loading**: Load models on demand

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Setup
```bash
git clone https://github.com/your-org/ai-trading-retraining.git
cd ai-trading-retraining
npm install
npm run dev
```

### Running Tests
```bash
npm test
npm run test:watch
npm run test:coverage
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- TensorFlow.js team for the ML framework
- Supabase for the excellent backend platform
- OpenAI for inspiration in automated trading systems

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

---

**Note**: This is a powerful automated trading system. Always test thoroughly in staging environments before deploying to production.