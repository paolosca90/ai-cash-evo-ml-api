# MT5 EA Invocation & Callback System

A comprehensive TypeScript-based system for seamless integration between AI trading systems and MetaTrader 5 Expert Advisors.

## 🚀 Features

### Core Functionality
- **Dual Protocol Support**: HTTP and WebSocket communication with MT5 EAs
- **Command Structure**: Complete market orders, pending orders, and position management
- **Real-time Callbacks**: Trade confirmations, position updates, and order status
- **Error Handling**: Comprehensive error recovery and retry mechanisms
- **Risk Management**: Dynamic risk assessment and position sizing
- **Batch Processing**: Execute multiple trades with conditional logic
- **Monitoring**: Real-time system health and performance metrics

### Technical Capabilities
- **Circuit Breakers**: Prevent cascading failures
- **Exponential Backoff**: Intelligent retry strategies
- **Connection Management**: Automatic reconnection and health monitoring
- **Type Safety**: Full TypeScript support with comprehensive types
- **Event-driven Architecture**: Flexible subscription-based callbacks
- **Database Integration**: Seamless Supabase integration for persistence
- **React Hooks**: Ready-to-use React integration hooks

## 📋 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Trading    │    │   MT5 System    │    │  MetaTrader 5   │
│   System        │◄──►│   Integration   │◄──►│   Expert Advisor │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                    ┌─────────────────┐
                    │   Supabase DB   │
                    │   & Auth        │
                    └─────────────────┘
```

### Core Components

1. **MT5InvocationSystem** (`mt5-invocation.ts`)
   - HTTP/WebSocket connection management
   - Command execution and retry logic
   - Connection health monitoring
   - Protocol abstraction

2. **MT5CommandBuilder** (`mt5-commands.ts`)
   - Trade command creation and validation
   - Risk management application
   - Batch processing capabilities
   - Order type support (market, pending, positions)

3. **MT5CallbackSystem** (`mt5-callbacks.ts`)
   - Real-time callback processing
   - Trade journal and statistics
   - Performance metrics collection
   - Event subscription management

4. **MT5ErrorHandler** (`mt5-error-handling.ts`)
   - Comprehensive error handling
   - Circuit breaker implementation
   - Retry strategies with backoff
   - Error pattern analysis

5. **MT5Integration** (`mt5-integration.ts`)
   - Unified system interface
   - Database integration
   - Real-time signal processing
   - System orchestration

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- TypeScript 5+
- Supabase account
- MetaTrader 5 with Expert Advisor

### Installation Steps

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Environment Variables**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Database Setup**
```bash
# Run database migrations
npx supabase db push

# Apply database schema
# See mt5-schema.sql for complete schema
```

4. **Build the Application**
```bash
npm run build
```

## 📊 Database Schema

### Core Tables

```sql
-- MT5 Accounts
CREATE TABLE mt5_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(100),
  server_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  ea_version VARCHAR(20),
  broker_name VARCHAR(100),
  leverage INTEGER DEFAULT 100,
  balance DECIMAL(15, 2) DEFAULT 0,
  equity DECIMAL(15, 2) DEFAULT 0,
  margin DECIMAL(15, 2) DEFAULT 0,
  free_margin DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  trade_allowed BOOLEAN DEFAULT true,
  expert_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MT5 Connections
CREATE TABLE mt5_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES mt5_accounts(id),
  protocol VARCHAR(10) NOT NULL CHECK (protocol IN ('HTTP', 'WebSocket')),
  endpoint_url TEXT NOT NULL,
  api_key TEXT,
  is_connected BOOLEAN DEFAULT false,
  last_ping TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  timeout_ms INTEGER DEFAULT 30000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trade Signals
CREATE TABLE trade_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  symbol VARCHAR(20) NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL')),
  lot_size DECIMAL(10, 2) NOT NULL,
  stop_loss DECIMAL(15, 5),
  take_profit DECIMAL(15, 5),
  confidence DECIMAL(5, 2) CHECK (confidence >= 0 AND confidence <= 100),
  strategy VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed')),
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trade Log
CREATE TABLE trade_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  signal_id UUID REFERENCES trade_signals(id),
  command_id VARCHAR(100) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  action VARCHAR(10) NOT NULL,
  lot_size DECIMAL(10, 2) NOT NULL,
  confidence DECIMAL(5, 2),
  strategy VARCHAR(100),
  success BOOLEAN NOT NULL,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MT5 Positions
CREATE TABLE mt5_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES mt5_accounts(id),
  position_ticket BIGINT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('BUY', 'SELL')),
  volume DECIMAL(10, 2) NOT NULL,
  open_price DECIMAL(15, 5) NOT NULL,
  current_price DECIMAL(15, 5),
  stop_loss DECIMAL(15, 5),
  take_profit DECIMAL(15, 5),
  unrealized_pnl DECIMAL(15, 2) DEFAULT 0,
  realized_pnl DECIMAL(15, 2) DEFAULT 0,
  commission DECIMAL(15, 2) DEFAULT 0,
  swap DECIMAL(15, 2) DEFAULT 0,
  open_time TIMESTAMP WITH TIME ZONE NOT NULL,
  last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  magic_number INTEGER DEFAULT 888777,
  comment TEXT,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MT5 Orders
CREATE TABLE mt5_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES mt5_accounts(id),
  order_ticket BIGINT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('BUY_STOP', 'SELL_STOP', 'BUY_LIMIT', 'SELL_LIMIT')),
  volume DECIMAL(10, 2) NOT NULL,
  order_price DECIMAL(15, 5) NOT NULL,
  stop_loss DECIMAL(15, 5),
  take_profit DECIMAL(15, 5),
  state VARCHAR(20) NOT NULL CHECK (state IN ('PLACED', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED')),
  filled_volume DECIMAL(10, 2) DEFAULT 0,
  remaining_volume DECIMAL(10, 2),
  placement_time TIMESTAMP WITH TIME ZONE NOT NULL,
  last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiration_time TIMESTAMP WITH TIME ZONE,
  magic_number INTEGER DEFAULT 888777,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Statistics
CREATE TABLE user_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  total_profit DECIMAL(15, 2) DEFAULT 0,
  total_loss DECIMAL(15, 2) DEFAULT 0,
  net_profit DECIMAL(15, 2) DEFAULT 0,
  average_win DECIMAL(15, 2) DEFAULT 0,
  average_loss DECIMAL(15, 2) DEFAULT 0,
  profit_factor DECIMAL(10, 2) DEFAULT 0,
  max_drawdown DECIMAL(15, 2) DEFAULT 0,
  current_drawdown DECIMAL(15, 2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Health
CREATE TABLE system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  components JSONB DEFAULT '{}',
  issues TEXT[] DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batch Log
CREATE TABLE batch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_count INTEGER NOT NULL,
  successful_commands INTEGER NOT NULL,
  failed_commands INTEGER NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  overall_success BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE mt5_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own MT5 accounts" ON mt5_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MT5 accounts" ON mt5_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MT5 accounts" ON mt5_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own trade signals" ON trade_signals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trade signals" ON trade_signals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own trade log" ON trade_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own statistics" ON user_statistics
  FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_mt5_accounts_user_id ON mt5_accounts(user_id);
CREATE INDEX idx_mt5_accounts_account_number ON mt5_accounts(account_number);
CREATE INDEX idx_trade_signals_user_id ON trade_signals(user_id);
CREATE INDEX idx_trade_signals_created_at ON trade_signals(created_at);
CREATE INDEX idx_trade_signals_status ON trade_signals(status);
CREATE INDEX idx_trade_log_user_id ON trade_log(user_id);
CREATE INDEX idx_trade_log_created_at ON trade_log(created_at);
CREATE INDEX idx_mt5_positions_account_id ON mt5_positions(account_id);
CREATE INDEX idx_mt5_positions_symbol ON mt5_positions(symbol);
CREATE INDEX idx_mt5_orders_account_id ON mt5_orders(account_id);
CREATE INDEX idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX idx_system_health_timestamp ON system_health(timestamp);
```

## 🎯 Usage Examples

### Basic Integration

```typescript
import { createMT5Integration } from '@/lib/mt5-system';

// Initialize the integration
const integration = createMT5Integration({
  enableRealtime: true,
  enableMonitoring: true
});

// Initialize the system
await integration.initialize();

// Execute a trade signal
const result = await integration.executeTradeSignal({
  id: 'signal_123',
  symbol: 'EURUSD',
  action: 'BUY',
  lot_size: 0.1,
  stop_loss: 1.0800,
  take_profit: 1.1200,
  confidence: 85,
  strategy: 'AI_Scalper',
  timestamp: new Date(),
  user_id: 'user_123'
});

console.log('Trade executed:', result);
```

### React Integration

```typescript
import { useMT5Integration, useTradingStatistics } from '@/lib/mt5-system';

function TradingComponent() {
  const { integration, isInitialized, error } = useMT5Integration({
    autoInitialize: true,
    enableRealtime: true
  });

  const { statistics } = useTradingStatistics('user_123');

  const handleTrade = async () => {
    if (!integration) return;

    try {
      const result = await integration.executeTradeSignal({
        id: 'signal_456',
        symbol: 'GBPUSD',
        action: 'SELL',
        lot_size: 0.2,
        confidence: 92,
        strategy: 'AI_Trend_Follower',
        timestamp: new Date(),
        user_id: 'user_123'
      });

      console.log('Trade executed:', result);
    } catch (error) {
      console.error('Trade failed:', error);
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>MT5 Integration</h2>
      <button onClick={handleTrade}>Execute Trade</button>
      {statistics && (
        <div>
          <p>Win Rate: {statistics.win_rate.toFixed(2)}%</p>
          <p>Total Trades: {statistics.total_trades}</p>
        </div>
      )}
    </div>
  );
}
```

### Batch Processing

```typescript
import { createMT5Integration } from '@/lib/mt5-system';

const integration = createMT5Integration();

// Create multiple trade signals
const signals = [
  {
    id: 'signal_1',
    symbol: 'EURUSD',
    action: 'BUY' as const,
    lot_size: 0.1,
    confidence: 85,
    strategy: 'AI_Scalper',
    timestamp: new Date(),
    user_id: 'user_123'
  },
  {
    id: 'signal_2',
    symbol: 'GBPUSD',
    action: 'SELL' as const,
    lot_size: 0.15,
    confidence: 90,
    strategy: 'AI_Trend_Follower',
    timestamp: new Date(),
    user_id: 'user_123'
  }
];

// Execute batch signals
const batchResult = await integration.executeBatchSignals(signals);

console.log('Batch execution result:', batchResult);
```

### Real-time Subscriptions

```typescript
import { createMT5Integration } from '@/lib/mt5-system';

const integration = createMT5Integration();

// Subscribe to real-time position updates
integration.subscribeToPositionUpdates((update) => {
  console.log('Position update:', update);

  // Update UI or trigger alerts
  if (update.unrealized_pnl < -100) {
    sendWarningAlert(update);
  }
});

// Subscribe to trade callbacks
integration.subscribeToTradeCallbacks((callback) => {
  console.log('Trade executed:', callback);

  if (callback.success) {
    // Handle successful trade
    onTradeSuccess(callback);
  } else {
    // Handle failed trade
    onTradeFailure(callback);
  }
});
```

### Custom Risk Management

```typescript
import { createMT5Integration } from '@/lib/mt5-system';

const customRiskManagement = {
  max_risk_per_trade: 1.5,      // 1.5% per trade
  max_daily_risk: 5.0,         // 5% daily max
  max_concurrent_trades: 5,     // Max 5 concurrent trades
  max_positions_per_symbol: 2,  // Max 2 positions per symbol
  max_lot_size: 5.0,           // Max 5 lots per trade
  min_lot_size: 0.01,          // Min 0.01 lots
  lot_step: 0.01,              // Lot increment
  risk_multiplier: 0.8,        // Reduce risk by 20%
  use_dynamic_risk: true,       // Enable dynamic risk
  stop_loss_pips: 30,          // 30 pip stop loss
  take_profit_pips: 60,        // 60 pip take profit
  volatility_threshold: 0.015   // 1.5% volatility threshold
};

const integration = createMT5Integration({
  riskManagement: customRiskManagement
});

await integration.initialize();
```

## 🔧 Configuration

### System Configuration

```typescript
const systemConfig = {
  http_timeout: 30000,           // HTTP timeout in ms
  ws_timeout: 60000,            // WebSocket timeout in ms
  max_retries: 3,               // Maximum retry attempts
  retry_delay_ms: 1000,         // Base retry delay in ms
  heartbeat_interval_ms: 30000, // Heartbeat interval in ms
  command_queue_size: 1000,     // Maximum command queue size
  callback_queue_size: 1000,    // Maximum callback queue size
  enable_logging: true,         // Enable logging
  log_level: 'info',            // Log level
  enable_metrics: true,         // Enable metrics collection
  metrics_interval_ms: 60000   // Metrics collection interval
};
```

### Risk Management Configuration

```typescript
const riskManagement = {
  max_risk_per_trade: 2.0,       // Maximum risk per trade (%)
  max_daily_risk: 10.0,         // Maximum daily risk (%)
  max_concurrent_trades: 10,    // Maximum concurrent trades
  max_positions_per_symbol: 3,  // Maximum positions per symbol
  max_lot_size: 10.0,           // Maximum lot size
  min_lot_size: 0.01,           // Minimum lot size
  lot_step: 0.01,               // Lot step size
  risk_multiplier: 1.0,         // Risk multiplier
  use_dynamic_risk: true,       // Use dynamic risk management
  stop_loss_pips: 50,           // Default stop loss in pips
  take_profit_pips: 100,        // Default take profit in pips
  volatility_threshold: 0.02    // Volatility threshold
};
```

## 🚀 Deployment

### Production Deployment

1. **Build the Application**
```bash
npm run build
```

2. **Configure Environment Variables**
```bash
# Production environment
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
NODE_ENV=production
```

3. **Deploy to Hosting Platform**
```bash
# Deploy to Vercel
npm run deploy:vercel

# Or deploy to Netlify
npm run deploy:netlify

# Or deploy to your own server
npm run start:production
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Environment-specific Configurations

#### Development
```typescript
const devConfig = {
  enable_logging: true,
  log_level: 'debug',
  enable_metrics: true,
  enable_realtime: true
};
```

#### Production
```typescript
const prodConfig = {
  enable_logging: true,
  log_level: 'warn',
  enable_metrics: true,
  enable_realtime: true,
  max_retries: 5,
  http_timeout: 45000
};
```

## 🔍 Monitoring & Observability

### Health Checks

```typescript
const health = integration.getSystemHealth();
console.log('System health:', health.overall_status);
console.log('Component status:', health.components);
```

### Performance Metrics

```typescript
const metrics = callbackSystem.getMetrics();
console.log('Average callback latency:', metrics.callback_latency.avg);
console.log('Success rate:', metrics.success_rate);
console.log('Commands per second:', metrics.commands_per_second);
```

### Error Tracking

```typescript
const errorStats = errorHandler.getErrorStatistics();
console.log('Total errors:', errorStats.totalErrors);
console.log('Error rate:', errorStats.errorRate);
console.log('Recent errors:', errorStats.recentErrors);
```

## 🛡️ Security Considerations

### Authentication & Authorization
- Row Level Security (RLS) enabled on all tables
- JWT-based authentication
- User-specific data isolation

### Data Validation
- Input validation on all API endpoints
- Type safety with TypeScript
- SQL injection prevention

### Network Security
- HTTPS-only communication
- WebSocket secure (WSS) support
- API key authentication

### Error Handling
- No sensitive information in error messages
- Proper error logging without exposing internals
- Graceful degradation on failures

## 🤝 Integration Guide

### Expert Advisor Integration

The MT5 EA should implement the following endpoints:

#### HTTP Endpoints
```
POST /trade - Execute trade command
GET /heartbeat - Health check
POST /webhook - Receive trade callbacks
GET /positions - Get current positions
GET /orders - Get pending orders
```

#### WebSocket Messages
```json
{
  "type": "command",
  "payload": {
    "id": "cmd_123",
    "account_id": "acc_123",
    "symbol": "EURUSD",
    "action": "BUY",
    "lot_size": 0.1,
    "stop_loss": 1.0800,
    "take_profit": 1.1200
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Webhook Integration

The system expects webhooks in the following format:

```json
{
  "type": "trade_execution",
  "account_id": "acc_123",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "request_id": "req_123",
    "success": true,
    "order_ticket": 12345,
    "execution_price": 1.0850,
    "executed_volume": 0.1,
    "profit": 25.50
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Connection Issues**
   - Check MT5 EA is running and accessible
   - Verify firewall settings allow outbound connections
   - Ensure correct endpoint URLs and API keys

2. **Authentication Issues**
   - Verify Supabase configuration
   - Check user permissions
   - Ensure proper JWT tokens

3. **Trade Execution Issues**
   - Verify MT5 EA has trading permissions
   - Check sufficient margin and account balance
   - Verify market hours and symbol availability

4. **Performance Issues**
   - Monitor network latency
   - Check database query performance
   - Review system resource usage

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
const integration = createMT5Integration({
  systemConfig: {
    enable_logging: true,
    log_level: 'debug'
  }
});
```

## 📚 API Reference

### MT5Integration Class

#### Methods
- `initialize()` - Initialize the integration system
- `executeTradeSignal(signal)` - Execute a single trade signal
- `executeBatchSignals(signals)` - Execute multiple trade signals
- `closePosition(userId, positionTicket, symbol, volume)` - Close position
- `getAccountPositions(userId)` - Get user's current positions
- `getTradingStatistics(userId)` - Get trading statistics
- `getSystemHealth()` - Get system health status
- `subscribeToTradeCallbacks(handler, userId)` - Subscribe to trade callbacks
- `subscribeToPositionUpdates(handler, userId)` - Subscribe to position updates
- `unsubscribe(subscriptionId)` - Unsubscribe from callbacks
- `shutdown()` - Shutdown the integration system

### React Hooks

- `useMT5Integration(options)` - MT5 integration hook
- `useTradingStatistics(userId)` - Trading statistics hook
- `useAccountPositions(userId)` - Account positions hook

## 📈 Performance Benchmarks

### Expected Performance Metrics
- **Command Execution**: < 100ms average latency
- **Callback Processing**: < 50ms average latency
- **Connection Health**: 99.9% uptime
- **Success Rate**: > 95% trade execution success
- **Throughput**: 100+ trades per second

### Optimization Tips
- Use WebSocket for real-time communication
- Implement proper connection pooling
- Monitor memory usage for long-running processes
- Use appropriate batch sizes for bulk operations
- Implement proper caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- MetaTrader 5 for the trading platform
- Supabase for the database and authentication
- OpenAI for AI capabilities integration
- The trading community for feedback and contributions

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Join our community Discord
- Contact our support team

---

**Note**: This system is designed for professional trading use. Please ensure proper testing in demo environments before deploying to production.