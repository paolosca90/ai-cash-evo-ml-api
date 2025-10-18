# AI Cash Evolution - Risk Management System

## Overview

The Risk Management System is a comprehensive, professional-grade risk management solution integrated into the AI Cash Evolution trading platform. It provides ATR-based stop loss calculations, advanced position sizing, portfolio-level protection, and real-time risk monitoring.

## Key Features

### 1. ATR-Based Stop Loss Calculation
- **Multi-timeframe ATR analysis** using M15, H1, and H4 timeframes
- **Dynamic ATR multipliers** based on market volatility and structure
- **Support/resistance level integration** for optimal stop placement
- **Volatility-adjusted stop distances** for different market conditions

### 2. Take Profit Calculation
- **Risk-reward ratio validation** (minimum 1.5:1, configurable)
- **Multiple take profit levels** with partial exit strategies
- **Market condition-based adjustments** for trending/ranging markets
- **Liquidity and session-based optimizations**

### 3. Advanced Position Sizing
- **Kelly Criterion integration** for optimal bet sizing
- **Portfolio correlation considerations** for risk diversification
- **Drawdown protection** with progressive position size reduction
- **Account scaling** based on account size tiers

### 4. Portfolio-Level Protection
- **Maximum portfolio heat** monitoring (default 6%)
- **Correlation risk assessment** between positions
- **Daily loss limits** and maximum drawdown protection
- **Real-time risk alerts** and recommendations

## Architecture

### Core Components

```
src/lib/risk-management/
├── index.ts                    # Main exports and utilities
├── RiskManagementService.ts    # Core risk management service
├── ATRStopLossCalculator.ts    # ATR-based stop loss calculations
├── TakeProfitCalculator.ts     # Take profit and RR calculations
├── LotSizeCalculator.ts        # Position sizing and risk calculations
└── MT5RiskIntegration.ts      # MT5 integration layer
```

### UI Components

```
src/components/risk-management/
└── RiskManagementPanel.tsx     # Main risk management interface
```

### Integration Points

```
supabase/functions/
├── mt5-trade-signals/          # Original MT5 signals
└── mt5-trade-signals-enhanced/ # Enhanced with risk management
```

## Configuration

### Default Settings

```typescript
const DEFAULT_RISK_CONFIG = {
  maxRiskPerTrade: 2.0,        // 2% of account per trade
  maxPortfolioRisk: 6.0,       // 6% total portfolio risk
  minRiskRewardRatio: 1.5,     // Minimum 1.5:1 RR ratio
  maxPositions: 10,            // Maximum concurrent positions
  correlationThreshold: 0.7,   // Maximum position correlation
  trailingStop: false,         // Enable trailing stops
  partialExits: true          // Use multiple TP levels
};
```

### ATR Configuration

```typescript
const DEFAULT_ATR_CONFIG = {
  timeframes: ['M15', 'H1', 'H4'],
  weights: { M15: 0.2, H1: 0.3, H4: 0.25 },
  smoothingPeriod: 14,
  minATRMultiplier: 0.5,
  maxATRMultiplier: 3.0,
  useMultiTimeframe: true,
  adjustForMarketStructure: true
};
```

## Usage Examples

### Basic Risk Calculation

```typescript
import { calculateQuickRisk } from '@/lib/risk-management';

const result = await calculateQuickRisk(
  'EURUSD',                    // Symbol
  'BUY',                       // Direction
  1.1000,                      // Entry Price
  10000,                       // Account Balance
  0.0010,                      // ATR Value
  2.0                          // Risk Percentage
);

console.log({
  stopLoss: result.stopLoss.price,
  takeProfit: result.takeProfit.primaryTP,
  lotSize: result.positionSize.lotSize,
  riskPercentage: result.riskMetrics.riskPercentage
});
```

### Advanced Risk Management

```typescript
import { riskManagementService } from '@/lib/risk-management';

const result = await riskManagementService.calculateTradeRisk({
  symbol: 'GBPUSD',
  direction: 'SELL',
  entryPrice: 1.2500,
  accountInfo: {
    balance: 25000,
    equity: 25200,
    leverage: 100,
    currency: 'EUR'
  },
  symbolSpecs: {
    symbol: 'GBPUSD',
    digits: 4,
    minLot: 0.01,
    maxLot: 100,
    contractSize: 100000
  },
  marketData: {
    atrData: [
      { timeframe: 'M15', value: 0.0015 },
      { timeframe: 'H1', value: 0.0020 }
    ],
    marketStructure: {
      supportLevels: [1.2400, 1.2350],
      resistanceLevels: [1.2550, 1.2600],
      trend: 'uptrend',
      volatility: 'medium'
    }
  },
  customParameters: {
    stopLossATRMultiplier: 1.5,
    takeProfitRiskRewardRatio: 2.5,
    usePartialExits: true
  }
});
```

### MT5 Integration

```typescript
import { mt5RiskIntegration } from '@/lib/risk-management';

const processed = await mt5RiskIntegration.processTradeSignal({
  symbol: 'EURUSD',
  direction: 'BUY',
  entryPrice: 1.1000,
  confidence: 85,
  accountInfo,
  symbolSpecs,
  marketData,
  riskAmount: 200,
  aiAnalysis: {
    reasoning: 'Strong bullish momentum',
    marketBias: 'STRONG_BUY_BIAS'
  }
});

if (processed.success) {
  const tradeRequest = mt5RiskIntegration.generateTradeRequest(
    processed.enhancedSignal
  );
  // Execute trade on MT5
}
```

## API Reference

### RiskManagementService

#### Methods

##### `calculateTradeRisk(input: RiskManagementInput): Promise<RiskManagementResult>`

Main method for comprehensive risk calculation.

**Parameters:**
- `symbol`: Trading symbol (e.g., 'EURUSD')
- `direction`: 'BUY' or 'SELL'
- `entryPrice`: Entry price for the trade
- `accountInfo`: Account balance and equity information
- `symbolSpecs`: Symbol specifications (lot sizes, digits, etc.)
- `marketData`: Current market data and ATR values
- `riskAmount`: Optional specific risk amount
- `customParameters`: Optional custom risk parameters

**Returns:**
- `stopLoss`: ATR-based stop loss calculation
- `takeProfit`: Take profit levels with RR ratios
- `positionSize`: Optimal lot size calculation
- `riskMetrics`: Comprehensive risk metrics
- `validation`: Risk validation results
- `recommendations`: Trading recommendations

##### `isTradeAllowed(symbol, accountInfo, positions, portfolioRisk)`

Check if a new trade is allowed based on risk rules.

##### `updatePortfolioRisk(positions)`

Update portfolio risk metrics.

### ATRStopLossCalculator

#### Methods

##### `calculateStopLoss(entryPrice, direction, atrData, marketStructure?)`

Calculate ATR-based stop loss with multi-timeframe analysis.

##### `calculateATR(data, period?)`

Calculate Average True Range from price data.

### TakeProfitCalculator

#### Methods

##### `calculateTakeProfit(entryPrice, direction, stopLoss, riskRewardRatio?, marketStructure?)`

Calculate take profit levels with risk-reward validation.

##### `validateRiskRewardRatio(ratio)`

Validate risk-reward ratio against minimum requirements.

### LotSizeCalculator

#### Methods

##### `calculateLotSize(input)`

Calculate optimal position size based on risk parameters.

##### `validateLotSize(lotSize, accountInfo, symbolSpecs)`

Validate lot size against broker and account limits.

## Risk Metrics

### Key Metrics

- **Risk Percentage**: Percentage of account at risk
- **Risk-Reward Ratio**: Ratio of potential reward to risk
- **Win Rate Required**: Minimum win rate needed for profitability
- **Expected Value**: Mathematical expectation of the trade
- **Kelly Criterion**: Optimal bet size based on edge
- **Portfolio Heat**: Total risk exposure as percentage

### Risk Levels

- **Low**: < 2% account risk, RR > 2:1
- **Medium**: 2-3% account risk, RR 1.5-2:1
- **High**: 3-4% account risk, RR < 1.5:1
- **Extreme**: > 4% account risk or validation failures

## Integration Guidelines

### Frontend Integration

1. **Import the Risk Management Panel**:
```typescript
import { RiskManagementPanel } from '@/lib/risk-management';
```

2. **Use in Trading Components**:
```typescript
<RiskManagementPanel
  symbol={symbol}
  accountInfo={accountInfo}
  currentPrice={currentPrice}
  onSettingsChange={handleSettingsChange}
/>
```

### Backend Integration

1. **Enhanced MT5 Signals**:
Use the `mt5-trade-signals-enhanced` edge function for risk-managed signals.

2. **Account Balance Updates**:
Update account information in real-time for accurate risk calculations.

### EA Integration

1. **Use Enhanced Signal Format**:
```mql5
// Enhanced signal format with risk metrics
struct EnhancedSignal {
    string id;
    string symbol;
    string action;
    double entry;
    double stopLoss;
    double takeProfit;
    double lot_size;
    double confidence;
    double risk_amount;
    // Risk metrics
    double risk_percentage;
    double risk_reward_ratio;
    string risk_level;
    string recommendations[];
};
```

## Best Practices

### 1. Risk Management Setup
- Never risk more than 2% per trade
- Maintain maximum 6% portfolio exposure
- Use minimum 1.5:1 risk-reward ratio
- Consider correlation between positions

### 2. ATR Configuration
- Use multi-timeframe ATR for robust calculations
- Adjust ATR multiplier based on market volatility
- Consider market structure for stop placement

### 3. Position Sizing
- Use Kelly Criterion for optimal sizing
- Scale position size based on account balance
- Apply drawdown protection during losing streaks

### 4. Portfolio Management
- Monitor portfolio heat in real-time
- Diversify across uncorrelated instruments
- Use partial exits to lock in profits

## Monitoring and Alerts

### Risk Alerts
The system generates alerts for:
- High risk per trade (> 3%)
- Portfolio heat limits exceeded
- Invalid risk-reward ratios
- Maximum positions reached
- Daily loss limits approached

### Performance Metrics
Track:
- Win rate vs required win rate
- Average win vs average loss
- Profit factor
- Maximum drawdown
- Risk-adjusted returns

## Testing and Validation

### Unit Tests
Run comprehensive tests:
```bash
npm test -- risk-management
```

### Integration Tests
Test MT5 integration:
```bash
npm run test:mt5-integration
```

### Example Usage
Run example scenarios:
```typescript
import { runAllRiskManagementExamples } from '@/examples/risk-management-example';
await runAllRiskManagementExamples();
```

## Troubleshooting

### Common Issues

1. **Invalid Risk Calculations**
   - Verify account balance and leverage
   - Check symbol specifications
   - Ensure ATR data is available

2. **MT5 Integration Problems**
   - Check edge function logs
   - Verify email authentication
   - Ensure database schema is updated

3. **UI Rendering Issues**
   - Check TypeScript compilation
   - Verify component imports
   - Review console for errors

### Debug Mode

Enable debug logging:
```typescript
riskManagementService.updateSettings({
  alertsEnabled: true,
  // Add debug configuration
});
```

## Future Enhancements

### Planned Features
- Machine learning-based risk optimization
- Advanced correlation analysis
- Real-time volatility modeling
- Multi-asset portfolio optimization
- Backtesting integration

### API Extensions
- Webhook support for real-time alerts
- REST API for external integrations
- WebSocket streaming for live data
- GraphQL for complex queries

## Contributing

### Development Setup
1. Install dependencies: `npm install`
2. Run development server: `npm run dev`
3. Run tests: `npm test`
4. Build for production: `npm run build`

### Code Standards
- Use TypeScript strict mode
- Follow ESLint configuration
- Include comprehensive type definitions
- Add JSDoc comments for all public APIs

## License

This risk management system is part of the AI Cash Evolution platform and is subject to the main project license terms.

## Support

For technical support or feature requests:
- Create an issue in the project repository
- Contact the development team
- Review the documentation and examples

---

**Version**: 1.0.0
**Last Updated**: September 2024
**Compatible**: AI Cash Evolution v2.0+