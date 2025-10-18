# Unified Feature Engineering System

A comprehensive feature engineering system that combines multiple data sources into normalized feature vectors suitable for machine learning models in cryptocurrency trading.

## Overview

The Unified Feature Engineering system integrates:
- **Technical Indicators**: Multi-timeframe ATR, Bollinger Bands, RSI, MACD
- **Session Information**: London/New York/Asian session times and overlaps
- **Smart Money Concepts**: Order blocks, FVGs, liquidity pools
- **LLM Sentiment**: AI-powered sentiment and risk analysis
- **Market Regime**: Trend direction, volatility state, momentum
- **Market Context**: Price action, volume, volatility patterns

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Technical Data │    │  Session Data   │    │ Smart Money     │
│  - ATR          │    │  - London       │    │  - Order Blocks │
│  - Bollinger    │    │  - NY           │    │  - FVGs         │
│  - RSI          │    │  - Asian        │    │  - Liquidity    │
│  - MACD         │    │  - Overlaps     │    │  - Confluence   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
┌─────────┴───────┐    ┌─────────┴───────┐    ┌─────────┴───────┐
│  LLM Sentiment   │    │  Market Regime  │    │ Market Context  │
│  - Sentiment     │    │  - Trend        │    │  - Price        │
│  - Risk          │    │  - Volatility    │    │  - Volume       │
│  - Fear/Greed    │    │  - Momentum     │    │  - Volatility   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │  Unified Feature Engineer  │
                    │  - Normalization          │
                    │  - Feature Selection      │
                    │  - Missing Data Handling  │
                    │  - Importance Weighting   │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    ML-Ready Vector       │
                    │    (29 features)         │
                    └───────────────────────────┘
```

## Features

### 1. Technical Indicators (8 features)
- **ATR Normalized**: Average True Range normalized by price
- **Bollinger Position**: Price position within Bollinger Bands
- **Bollinger Width**: Band width indicating volatility
- **RSI Value**: Relative Strength Index normalized
- **RSI Divergence**: Divergence detection signals
- **MACD Line**: MACD line normalized
- **MACD Signal**: Signal line normalized
- **MACD Histogram**: Histogram value normalized

### 2. Session Features (4 features)
- **London Session**: Binary indicator for London session
- **NY Session**: Binary indicator for New York session
- **Asian Session**: Binary indicator for Asian session
- **Session Overlap**: Intensity of session overlaps

### 3. Smart Money Features (4 features)
- **Order Block Density**: Density of order blocks near current price
- **FVG Density**: Density of Fair Value Gaps
- **Liquidity Pool Pressure**: Net liquidity pressure
- **Smart Money Confluence**: Overall confluence score

### 4. Sentiment Features (4 features)
- **Sentiment Score**: LLM sentiment analysis (-1 to 1)
- **Sentiment Confidence**: Confidence in sentiment analysis
- **Risk Level**: Assessed risk level (0 to 1)
- **Market Fear/Greed**: Fear/Greed index normalized

### 5. Market Regime Features (4 features)
- **Trend Strength**: Market trend strength (-1 to 1)
- **Volatility Regime**: Current volatility state
- **Momentum State**: Market momentum indicator
- **Regime Stability**: Stability of current regime

### 6. Market Context Features (5 features)
- **Price Change**: Normalized price change
- **Range**: Normalized price range
- **Volume**: Normalized trading volume
- **ATR**: Normalized ATR value
- **Session Volatility**: Session-specific volatility

## Installation

```bash
npm install # Dependencies should already be included in the project
```

## Quick Start

### Basic Usage

```typescript
import { UnifiedFeatureEngineer } from './src/lib/feature-engineering';
import { MarketData, TechnicalIndicators, SessionInfo, SmartMoneyConcepts, LLMSignals, MarketRegime } from './src/types/feature-engineering';

// Initialize feature engineer
const featureEngineer = new UnifiedFeatureEngineer({
  enableTechnicalIndicators: true,
  enableSessionFeatures: true,
  enableSmartMoneyFeatures: true,
  enableSentimentFeatures: true,
  enableRegimeFeatures: true,
  normalizeFeatures: true,
  featureImportanceThreshold: 0.05
});

// Generate feature vector
const featureVector = featureEngineer.generateFeatureVector(
  marketData,
  technicalIndicators,
  sessionInfo,
  smartMoneyConcepts,
  llmSignals,
  marketRegime
);

// Get ML-ready vector
const mlVector = featureEngineer.createMLReadyVector(featureVector);
console.log('Feature vector length:', mlVector.length); // 29 features
```

### React Hook Usage

```typescript
import { useFeatureEngineering } from './src/hooks/useFeatureEngineering';

function MyComponent() {
  const {
    featureVector,
    mlVector,
    isCalculating,
    error,
    calculateFeatureVector,
    exportFeatureVector
  } = useFeatureEngineering({
    symbol: 'BTCUSD',
    timeframe: '1h',
    enableAutoUpdate: true,
    updateInterval: 30000
  });

  const handleGenerateVector = async () => {
    await calculateFeatureVector(
      marketData,
      technicalIndicators,
      sessionInfo,
      smartMoneyConcepts,
      llmSignals,
      marketRegime
    );
  };

  return (
    <div>
      <button onClick={handleGenerateVector} disabled={isCalculating}>
        Generate Features
      </button>
      {mlVector && <div>Features: {mlVector.length}</div>}
    </div>
  );
}
```

### Dashboard Component

```typescript
import { FeatureEngineeringDashboard } from './src/components/FeatureEngineeringDashboard';

function App() {
  return (
    <FeatureEngineeringDashboard
      symbol="BTCUSD"
      timeframe="1h"
      onFeatureVectorGenerated={(vector) => {
        console.log('Generated feature vector:', vector);
      }}
    />
  );
}
```

## Configuration Options

```typescript
interface UnifiedFeatureEngineerConfig {
  enableTechnicalIndicators: boolean;  // Enable technical indicators
  enableSessionFeatures: boolean;      // Enable session-based features
  enableSmartMoneyFeatures: boolean;   // Enable smart money concepts
  enableSentimentFeatures: boolean;    // Enable sentiment analysis
  enableRegimeFeatures: boolean;       // Enable market regime detection
  normalizeFeatures: boolean;          // Normalize features to [-1, 1]
  featureImportanceThreshold: number; // Minimum importance threshold
  maxHistoryLength: number;           // Maximum history to keep
  smoothingFactor: number;            // Exponential smoothing factor
}
```

## Advanced Usage

### Feature Importance Analysis

```typescript
// Generate multiple feature vectors
const featureVectors = [];
const targetVariable = []; // e.g., price changes

// ... populate with historical data ...

// Calculate feature importance
const importanceResults = featureEngineer.calculateFeatureImportance(
  featureVectors,
  targetVariable
);

// Sort by importance
const sortedFeatures = importanceResults.sort((a, b) => b.importance - a.importance);

console.log('Most important features:');
sortedFeatures.forEach((result, index) => {
  console.log(`${index + 1}. ${result.featureName}: ${result.importance.toFixed(3)}`);
});
```

### Custom Feature Weights

```typescript
// Update feature weights based on analysis
const weightUpdates = [
  { featureName: 'atr_normalized', weight: 0.2, importance: 0.9 },
  { featureName: 'sentiment_score', weight: 0.15, importance: 0.8 }
];

featureEngineer.updateFeatureWeights(weightUpdates);
```

### Data Persistence

```typescript
// Export feature vector
const exported = featureEngineer.exportFeatureVector(featureVector);
console.log(exported);

// Import feature vector
const imported = featureEngineer.importFeatureVector(exported);
```

## Feature Statistics

```typescript
// Get feature statistics
const stats = featureEngineer.getFeatureStatistics();
console.log('Feature statistics:', stats);

// Sample output:
// {
//   "atr_normalized": { mean: 0.45, std: 0.12, min: 0.1, max: 0.9 },
//   "rsi_value": { mean: 0.5, std: 0.2, min: 0.1, max: 0.9 },
//   ...
// }
```

## Handling Missing Data

The system automatically handles missing data using:
1. **Feature-specific default values**
2. **Exponential smoothing of recent values**
3. **Historical interpolation**

```typescript
// Custom missing data handler
featureEngineer.setMissingDataHandler((featureName, timestamp) => {
  // Custom logic for handling missing data
  return 0; // Default fallback
});
```

## ML Integration

### For Training

```typescript
// Generate training dataset
const trainingData = [];
const labels = [];

for (const historicalData of historicalDataset) {
  const featureVector = featureEngineer.generateFeatureVector(
    historicalData.marketData,
    historicalData.technicalIndicators,
    historicalData.sessionInfo,
    historicalData.smartMoneyConcepts,
    historicalData.llmSignals,
    historicalData.marketRegime
  );

  trainingData.push(featureEngineer.createMLReadyVector(featureVector));
  labels.push(historicalData.target); // e.g., future price movement
}

// Use with any ML library
// trainingData: number[][] (samples x 29 features)
// labels: number[] (target values)
```

### For Inference

```typescript
// Real-time prediction
async function predictPriceMovement(currentData) {
  const featureVector = featureEngineer.generateFeatureVector(
    currentData.marketData,
    currentData.technicalIndicators,
    currentData.sessionInfo,
    currentData.smartMoneyConcepts,
    currentData.llmSignals,
    currentData.marketRegime
  );

  const mlVector = featureEngineer.createMLReadyVector(featureVector);

  // Use with your trained model
  const prediction = await model.predict(mlVector);
  return prediction;
}
```

## Performance Considerations

- **Vector Size**: 29 features per time point
- **Update Frequency**: Configurable (default: 1 minute)
- **Memory Usage**: Linear with history length
- **Processing Time**: < 10ms per feature vector on modern hardware

## Testing

Run the example implementation:

```bash
npm run dev
# Or run the example directly:
npx ts-node src/examples/feature-engineering-example.ts
```

## Best Practices

1. **Feature Selection**: Use importance analysis to identify most relevant features
2. **Normalization**: Always normalize features for better ML performance
3. **Data Quality**: Handle missing data appropriately
4. **Regular Updates**: Keep feature weights updated based on model performance
5. **Monitoring**: Monitor feature statistics for data drift

## Troubleshooting

### Common Issues

1. **NaN Values**: Check for division by zero or invalid inputs
2. **Feature Vector Size**: Ensure all data sources are available
3. **Performance**: Reduce history length or update frequency if needed
4. **Memory Usage**: Clear feature history periodically

### Debug Mode

```typescript
const featureEngineer = new UnifiedFeatureEngineer({
  // ... config
});

// Enable debug logging
featureEngineer.setDebugMode(true);
```

## API Reference

### UnifiedFeatureEngineer

#### Methods
- `generateFeatureVector()` - Create feature vector from data sources
- `createMLReadyVector()` - Convert to ML-compatible format
- `calculateFeatureImportance()` - Analyze feature importance
- `exportFeatureVector()` - Export to JSON
- `importFeatureVector()` - Import from JSON
- `updateFeatureWeights()` - Update feature weights
- `getFeatureStatistics()` - Get feature statistics
- `resetFeatureHistory()` - Clear feature history

### Types

See `src/types/feature-engineering.ts` for complete type definitions.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Update documentation
5. Submit a pull request

## License

This project is part of the AI Cash Evolution trading platform.