# Advanced ML Trading System

A comprehensive Market Regime Detection & Agent Selection system that analyzes market conditions and selects appropriate trading agents using advanced machine learning techniques.

## 🎯 Overview

This system implements a sophisticated trading architecture that combines multiple analytical approaches:

- **Multi-timeframe Market Regime Detection** - Identifies bull/bear/ranging markets across different timeframes
- **PPO vs CPPO Agent Selection** - Intelligent selection between Proximal Policy Optimization and Constrained PPO agents
- **Advanced Feature Engineering** - Comprehensive market feature extraction and normalization
- **Risk Management Integration** - Position sizing, stop-loss, and take-profit calculations
- **Real-time Signal Generation** - Continuous market analysis and signal generation
- **Performance Tracking** - Agent performance monitoring and optimization

## 🏗️ Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    TradingSystemIntegration                  │
│              (Main Integration Layer)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │AdvancedMLTrading│  │  PPOCPPOAgent   │  │UnifiedFeature   │ │
│  │     System      │  │   Selector      │  │   Engineer      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   Market Data Sources                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │Real-time│  │Historical│  │News/Sent.│  │On-chain │          │
│  │  Data   │  │  Data   │  │  Data   │  │  Data   │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

#### 1. Market Regime Detection

- **Trend Analysis**: Multi-timeframe trend detection (strong/moderate/sideways)
- **Volatility Analysis**: ATR + Bollinger Band width analysis
- **Market Phases**: Accumulation, trend, and distribution detection
- **Regime Stability**: Transition probability and stability calculations

#### 2. Agent Selection System

- **PPO Agent**: Proximal Policy Optimization for trending markets
- **CPPO Agent**: Constrained PPO for high-volatility conditions
- **Performance Tracking**: Real-time agent performance monitoring
- **Confidence Scoring**: Recommendation confidence assessment
- **Fallback Mechanisms**: Safety systems for extreme conditions

#### 3. Advanced Analytics

- **Feature Engineering**: 100+ market features extraction
- **Technical Indicators**: Comprehensive indicator suite
- **Session Analysis**: Market session timing and overlap detection
- **Smart Money Concepts**: Order blocks, FVGs, liquidity analysis

## 🚀 Quick Start

### Installation

```typescript
import { TradingSystemIntegration } from './src/lib';

// Initialize the system
const tradingSystem = new TradingSystemIntegration({
  enableAdvancedML: true,
  enablePPOCPPOSelection: true,
  enableFeatureEngineering: true,
  maxPositionSize: 0.05,
  riskPerTrade: 0.01
});
```

### Basic Usage

```typescript
// Start real-time analysis
await tradingSystem.start('BTC/USDT');

// Generate trading signal
const signal = await tradingSystem.generateTradingSignal(
  marketData,
  technicalIndicators,
  multiTimeframeData,
  sessionInfo
);

console.log(`Signal: ${signal.action} ${signal.symbol} at ${signal.price}`);
console.log(`Confidence: ${signal.confidence}%`);
console.log(`Agent: ${signal.agent}`);
```

### Configuration

```typescript
const config = {
  // System features
  enableAdvancedML: true,
  enablePPOCPPOSelection: true,
  enableFeatureEngineering: true,

  // Trading parameters
  signalGenerationInterval: 30000, // 30 seconds
  maxPositionSize: 0.05, // 5% max position
  riskPerTrade: 0.01, // 1% risk per trade
  stopLossPercentage: 0.02, // 2% stop loss
  takeProfitPercentage: 0.04, // 4% take profit

  // System modes
  enableBacktesting: true,
  enableRealtimeAnalysis: true
};

const system = new TradingSystemIntegration(config);
```

## 📊 Market Regime Detection

### Regime Components

The system detects market regimes across multiple dimensions:

#### Trend Direction
- **Strong Up**: Clear upward momentum with high conviction
- **Moderate Up**: Upward trend with some consolidation
- **Sideways**: Range-bound price action
- **Moderate Down**: Downward trend with some consolidation
- **Strong Down**: Clear downward momentum with high conviction

#### Volatility State
- **Low**: Minimal price fluctuations (< 1% daily)
- **Medium**: Normal market conditions (1-3% daily)
- **High**: Elevated volatility (3-6% daily)
- **Extreme**: Very high volatility (> 6% daily)

#### Market Phases
- **Accumulation**: Smart money building positions
- **Trend**: Sustained directional movement
- **Distribution**: Smart money exiting positions

### Multi-timeframe Analysis

```typescript
// Analyze across multiple timeframes
const multiTimeframeData = [
  { timeframe: '15m', data: [...], indicators: {...} },
  { timeframe: '1h', data: [...], indicators: {...} },
  { timeframe: '4h', data: [...], indicators: {...} },
  { timeframe: '1d', data: [...], indicators: {...} }
];

// Get confluence score and regime analysis
const analysis = await system.analyzeMultiTimeframe(multiTimeframeData);
console.log(`Confluence Score: ${analysis.confluenceScore}`);
console.log(`Primary Regime: ${analysis.primaryRegime.trendDirection}`);
```

## 🤖 Agent Selection System

### PPO vs CPPO Selection

The system intelligently selects between two advanced RL agents:

#### PPO (Proximal Policy Optimization)
- **Best for**: Stable trending markets
- **Strengths**: Strong trend following, good exploration
- **Risk Profile**: Balanced
- **Configuration**: Standard clip range and learning rate

#### CPPO (Constrained PPO)
- **Best for**: High volatility, risky conditions
- **Strengths**: Risk management, constraint satisfaction
- **Risk Profile**: Conservative
- **Configuration**: Safety constraints and risk thresholds

### Selection Logic

```typescript
// Agent selection based on market conditions
const decision = selector.selectAgent(
  currentRegime,
  volatilityAnalysis,
  trendAnalysis,
  ppoPerformance,
  cppoPerformance
);

console.log(`Selected Agent: ${decision.agent}`);
console.log(`Confidence: ${decision.confidence}`);
console.log(`Reasoning: ${decision.reasoning}`);
```

### Performance Tracking

```typescript
// Get agent performance metrics
const ppoPerformance = system.getAgentPerformance('PPO');
const cppoPerformance = system.getAgentPerformance('CPPO');

console.log('PPO Performance:');
console.log(`- Sharpe Ratio: ${ppoPerformance.sharpeRatio}`);
console.log(`- Win Rate: ${ppoPerformance.winRate}`);
console.log(`- Max Drawdown: ${ppoPerformance.maxDrawdown}`);
```

## 🔧 Feature Engineering

### Feature Categories

The system extracts and analyzes 100+ market features:

#### Technical Features (24 features)
- ATR (normalized)
- Bollinger Band position and width
- RSI value and divergence
- MACD line, signal, and histogram
- EMA crossovers
- ADX trend strength

#### Session Features (4 features)
- London session activity
- New York session activity
- Asian session activity
- Session overlap periods

#### Smart Money Features (4 features)
- Order block density
- Fair value gap analysis
- Liquidity pool pressure
- Smart money confluence

#### Sentiment Features (4 features)
- Market sentiment score
- Sentiment confidence
- Risk assessment level
- Fear & greed index

#### Regime Features (4 features)
- Trend strength
- Volatility regime
- Momentum state
- Regime stability

### Feature Usage

```typescript
// Generate feature vector
const featureVector = system.generateFeatureVector(
  marketData,
  technicalIndicators,
  sessionInfo,
  smartMoneyConcepts,
  llmSignals
);

// Get feature importance
const importance = system.calculateFeatureImportance(
  featureVectors,
  targetVariable
);

console.log('Top Features:');
importance.slice(0, 5).forEach(feature => {
  console.log(`- ${feature.featureName}: ${feature.importance.toFixed(3)}`);
});
```

## 📈 Signal Generation

### Signal Structure

```typescript
interface TradingSignal {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100%
  price: number;
  timestamp: number;
  agent: string; // Selected agent
  reasoning: string; // Detailed reasoning
  riskLevel: number; // 0-1
  expectedReturn: number; // Expected return
  positionSize?: number; // Position size as percentage
  stopLoss?: number; // Stop loss price
  takeProfit?: number; // Take profit price
  metadata: {
    regime: MarketRegime;
    volatility: string;
    trendStrength: number;
    agentConfidence: number;
    featureImportance: string[];
  };
}
```

### Risk Management

```typescript
// Automatic risk management
const signal = await system.generateTradingSignal(data);

console.log(`Position Size: ${(signal.positionSize * 100).toFixed(2)}%`);
console.log(`Stop Loss: $${signal.stopLoss}`);
console.log(`Take Profit: $${signal.takeProfit}`);
console.log(`Risk Level: ${(signal.riskLevel * 100).toFixed(1)}%`);
```

## 🔄 Real-time Operation

### Starting the System

```typescript
// Start real-time analysis
await tradingSystem.start('BTC/USDT');

// Monitor system status
const status = tradingSystem.getSystemStatus();
console.log(`System Status: ${status.systemHealth}`);
console.log(`Active Agent: ${status.activeAgent}`);
console.log(`Signals Generated: ${status.signalsGenerated}`);
```

### System Monitoring

```typescript
// Get system health
const health = tradingSystem.getSystemHealth();
console.log(`Overall Health: ${health.overall}`);
console.log(`Component Health:`, health.components);
console.log(`Issues:`, health.issues);

// Get recent signals
const signals = tradingSystem.getRecentSignals(50);
signals.forEach(signal => {
  console.log(`${signal.action} ${signal.symbol} - ${signal.confidence}%`);
});
```

## 🔍 Backtesting

### Running Backtests

```typescript
// Run backtest
const results = await tradingSystem.runBacktest(
  'BTC/USDT',
  new Date('2024-01-01'),
  new Date('2024-12-31'),
  10000 // Initial balance
);

console.log('Backtest Results:');
console.log(`Final Balance: $${results.finalBalance}`);
console.log(`Total Return: ${(results.totalReturn * 100).toFixed(2)}%`);
console.log(`Sharpe Ratio: ${results.sharpeRatio.toFixed(2)}`);
console.log(`Win Rate: ${(results.winRate * 100).toFixed(1)}%`);
```

## 🎛️ Configuration Management

### Configuration Options

```typescript
interface IntegrationConfig {
  // Feature toggles
  enableAdvancedML: boolean;
  enablePPOCPPOSelection: boolean;
  enableFeatureEngineering: boolean;

  // Trading parameters
  signalGenerationInterval: number; // milliseconds
  maxPositionSize: number; // 0-1
  riskPerTrade: number; // 0-1
  stopLossPercentage: number; // 0-1
  takeProfitPercentage: number; // 0-1

  // System modes
  enableBacktesting: boolean;
  enableRealtimeAnalysis: boolean;
}
```

### Dynamic Configuration

```typescript
// Update configuration
system.updateConfig({
  maxPositionSize: 0.03,
  riskPerTrade: 0.005,
  signalGenerationInterval: 60000
});

// Export/Import system state
const state = system.exportSystemState();
system.importSystemState(state);
```

## 📊 Examples

### Complete Example

```typescript
import { TradingSystemIntegration } from './src/lib';

async function main() {
  // Initialize system
  const system = new TradingSystemIntegration({
    enableAdvancedML: true,
    enablePPOCPPOSelection: true,
    maxPositionSize: 0.05,
    riskPerTrade: 0.01
  });

  try {
    // Start system
    await system.start('BTC/USDT');

    // Monitor for 5 minutes
    setTimeout(async () => {
      const status = system.getSystemStatus();
      console.log(`Generated ${status.signalsGenerated} signals`);

      await system.stop();
    }, 300000);

  } catch (error) {
    console.error('System error:', error);
    await system.stop();
  }
}

main();
```

## 🧪 Testing

### Unit Tests

```typescript
// Test regime detection
const regime = system.detectMarketRegime(data);
console.assert(regime.confidence > 0, 'Regime confidence should be positive');

// Test agent selection
const agent = system.selectBestAgent(regime, volatility, trend);
console.assert(['PPO', 'CPPO'].includes(agent.id), 'Valid agent selected');
```

### Integration Tests

```typescript
// Test full signal generation pipeline
const signal = await system.generateTradingSignal(
  marketData,
  indicators,
  multiTimeframeData
);

console.assert(['BUY', 'SELL', 'HOLD'].includes(signal.action), 'Valid signal action');
console.assert(signal.confidence >= 0 && signal.confidence <= 100, 'Valid confidence');
```

## 🔧 API Reference

### Core Classes

#### TradingSystemIntegration
Main integration class that coordinates all subsystems.

**Methods:**
- `start(symbol: string)` - Start real-time analysis
- `stop()` - Stop the system
- `generateTradingSignal(...)` - Generate trading signal
- `getSystemStatus()` - Get current system status
- `runBacktest(...)` - Run backtest
- `updateConfig(...)` - Update configuration

#### AdvancedMLTradingSystem
Core ML system for market regime detection and agent selection.

**Methods:**
- `analyzeAndSelectAgent(...)` - Analyze market and select agent
- `detectMarketRegime(...)` - Detect market regime
- `getCurrentRegime()` - Get current regime
- `getAgentPerformance(id)` - Get agent performance

#### PPOCPPOAgentSelector
Specialized agent selector for PPO vs CPPO.

**Methods:**
- `selectAgent(...)` - Select between PPO and CPPO
- `getDecisionHistory()` - Get selection history
- `getAverageConfidence()` - Get average confidence

### Type Definitions

Comprehensive TypeScript definitions are provided for all components, ensuring type safety and better development experience.

## 🐛 Troubleshooting

### Common Issues

#### Low Confidence Signals
```typescript
// Check system health
const health = system.getSystemHealth();
if (health.overall === 'warning' || health.overall === 'critical') {
  console.log('System issues:', health.issues);
}
```

#### Agent Performance Issues
```typescript
// Check agent performance
const performance = system.getAgentPerformance('PPO');
if (performance.sharpeRatio < 1.0) {
  console.log('PPO underperforming - consider CPPO');
}
```

#### Data Quality Issues
```typescript
// Validate data quality
const isValid = validateMarketData(marketData);
if (!isValid) {
  console.log('Invalid market data - skipping analysis');
}
```

### Debug Mode

```typescript
// Enable debug logging
system.updateConfig({
  enableAdvancedML: true,
  enableFeatureEngineering: true,
  // ... other config
});

// Check recent logs
const logs = system.getRecentLogs(100);
logs.forEach(log => {
  if (log.level === 'error') {
    console.log(`Error: ${log.message}`);
  }
});
```

## 📈 Performance Optimization

### Memory Management
```typescript
// Limit history size
system.updateConfig({
  maxHistoryLength: 1000
});
```

### CPU Optimization
```typescript
// Reduce analysis frequency
system.updateConfig({
  signalGenerationInterval: 60000 // 1 minute instead of 30 seconds
});
```

### Feature Optimization
```typescript
// Disable unused features
system.updateConfig({
  enableFeatureEngineering: false, // If not needed
  enablePPOCPPOSelection: false // If only using basic ML
});
```

## 🚀 Future Enhancements

### Planned Features
- [ ] Additional RL agents (DQN, SAC, TD3)
- [ ] Ensemble methods for agent selection
- [ ] Advanced sentiment analysis integration
- [ ] On-chain data analysis
- [ ] Multi-asset correlation analysis
- [ ] Advanced backtesting with walk-forward optimization
- [ ] Real-time performance monitoring dashboard
- [ ] Cloud deployment capabilities

### Performance Improvements
- [ ] GPU acceleration for model training
- [ ] Distributed computing support
- [ ] Caching mechanisms
- [ ] Stream processing for real-time data

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support, questions, or feature requests:
- Create an issue in the repository
- Check the troubleshooting section
- Review the examples and documentation

---

**Advanced ML Trading System** - Intelligent market analysis and agent selection for cryptocurrency trading.