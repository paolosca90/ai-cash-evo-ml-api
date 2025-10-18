// @ts-nocheck
/**
 * Signal Modulation System - Index
 *
 * Main export file for the Signal Modulation System.
 * Provides easy access to all components and utilities.
 *
 * @author Claude Code
 * @version 1.0.0
 */

// Core Service
export { default as SignalModulationService, signalModulationService } from './SignalModulationService';
export type {
  BaseSignal,
  SentimentAnalysis,
  RiskAssessment,
  MarketConditions,
  ModulatedSignal,
  PerformanceMetrics,
  SignalHistory,
  ModulationConfig,
} from './SignalModulationService';

// Integration Layer
export { default as SignalModulationIntegration, signalModulationIntegration } from './SignalModulationIntegration';
export type {
  IntegrationConfig,
  ModulationInput,
  ModulationResult,
} from './SignalModulationIntegration';

// Utility Functions
export {
  createDefaultSentimentAnalysis,
  createDefaultRiskAssessment,
  createDefaultMarketConditions,
} from './SignalModulationService';

// Default Configuration
export const DEFAULT_MODULATION_CONFIG = {
  sentiment_weight: 0.4,
  risk_weight: 0.3,
  confidence_weight: 0.3,
  market_condition_weights: {
    volatility: 0.25,
    trend: 0.3,
    liquidity: 0.2,
    session: 0.25,
  },
  threshold_adjustments: {
    min_confidence: 60,
    min_intensity: 0.3,
    max_risk: 4,
    quality_threshold: 0.65,
  },
  position_sizing: {
    base_size: 0.02,
    max_size: 0.10,
    risk_per_trade: 0.01,
    kelly_fraction: 0.25,
  },
};

// Integration Presets
export const INTEGRATION_PRESETS = {
  CONSERVATIVE: {
    enableLLMSentiment: true,
    enableTechnicalAnalysis: true,
    enableSmartMoneyAnalysis: true,
    enableMarketRegimeAnalysis: true,
    autoSaveResults: true,
  },
  AGGRESSIVE: {
    enableLLMSentiment: true,
    enableTechnicalAnalysis: false,
    enableSmartMoneyAnalysis: true,
    enableMarketRegimeAnalysis: false,
    autoSaveResults: true,
  },
  BALANCED: {
    enableLLMSentiment: true,
    enableTechnicalAnalysis: true,
    enableSmartMoneyAnalysis: true,
    enableMarketRegimeAnalysis: true,
    autoSaveResults: true,
  },
  TECHNICAL_ONLY: {
    enableLLMSentiment: false,
    enableTechnicalAnalysis: true,
    enableSmartMoneyAnalysis: false,
    enableMarketRegimeAnalysis: true,
    autoSaveResults: true,
  },
  SENTIMENT_ONLY: {
    enableLLMSentiment: true,
    enableTechnicalAnalysis: false,
    enableSmartMoneyAnalysis: false,
    enableMarketRegimeAnalysis: false,
    autoSaveResults: true,
  },
};

// Re-export commonly used types for convenience
export type {
  MarketData,
  TechnicalIndicators,
  SmartMoneyConcepts,
  LLMSignals,
  MarketRegime,
  SessionInfo,
} from '@/types/feature-engineering';

// Version Information
export const SIGNAL_MODULATION_VERSION = '1.0.0';
export const SIGNAL_MODULATION_CREATED = '2024-01-01';
export const SIGNAL_MODULATION_AUTHOR = 'Claude Code';

// Quick Start Guide
export const QUICK_START_GUIDE = {
  title: 'Signal Modulation System Quick Start',
  description: 'Get started with the Signal Modulation System in minutes',
  steps: [
    {
      step: 1,
      title: 'Import the System',
      code: `import { signalModulationService, BaseSignal } from '@/lib/signal-modulation';`,
    },
    {
      step: 2,
      title: 'Create a Base Signal',
      code: `const signal: BaseSignal = {
  id: 'signal-001',
  symbol: 'EURUSD',
  type: 'BUY',
  confidence: 75,
  intensity: 1.0,
  timestamp: new Date(),
  source: 'AI Analysis',
};`,
    },
    {
      step: 3,
      title: 'Provide Supporting Data',
      code: `const sentimentAnalysis = {
  score: 4.2,
  confidence: 0.85,
  reasoning: 'Positive economic data',
  risk: 2.1,
  key_factors: ['GDP growth', 'Interest rates'],
  market_context: 'Bullish conditions',
  timestamp: new Date(),
};`,
    },
    {
      step: 4,
      title: 'Modulate the Signal',
      code: `const modulatedSignal = await signalModulationService.modulateSignal(
  signal,
  sentimentAnalysis,
  riskAssessment,
  marketConditions
);`,
    },
    {
      step: 5,
      title: 'Use the Result',
      code: `if (modulatedSignal.should_execute) {
  console.log('Execute trade:', modulatedSignal.signal);
  console.log('Position size:', modulatedSignal.risk_adjusted_position_size);
}`,
    },
  ],
};

// Best Practices
export const BEST_PRACTICES = {
  title: 'Signal Modulation Best Practices',
  recommendations: [
    'Always provide accurate sentiment analysis for reliable modulation',
    'Use proper risk assessment to avoid excessive position sizing',
    'Monitor market conditions to adapt to changing environments',
    'Track performance metrics to optimize your modulation strategy',
    'Regularly update configuration based on backtesting results',
    'Use appropriate presets for different trading styles',
    'Consider transaction costs when setting position sizes',
    'Implement proper error handling and fallback mechanisms',
  ],
};

// Common Use Cases
export const COMMON_USE_CASES = [
  {
    title: 'AI Signal Enhancement',
    description: 'Modulate AI-generated signals with sentiment and risk analysis',
    codeSnippet: `const result = await signalModulationIntegration.modulateSignal({
  baseSignal: aiSignal,
  marketData,
  technicalIndicators,
  llmSignals,
  newsArticles,
});`,
  },
  {
    title: 'Risk Management',
    description: 'Adjust position sizes based on risk assessment',
    codeSnippet: `const positionSize = modulatedSignal.risk_adjusted_position_size;
const tradeValue = accountBalance * positionSize;`,
  },
  {
    title: 'Quality Filtering',
    description: 'Filter signals based on quality scores',
    codeSnippet: `if (modulatedSignal.quality_score >= 0.7 &&
    modulatedSignal.should_execute) {
  // Execute high-quality signals
}`,
  },
  {
    title: 'Performance Tracking',
    description: 'Track signal performance and optimize strategies',
    codeSnippet: `signalModulationService.recordSignalOutcome(
  modulatedSignal,
  executionPrice,
  exitPrice,
  exitTime,
  marketConditions
);`,
  },
];

// Error Handling Guide
export const ERROR_HANDLING_GUIDE = {
  title: 'Error Handling Guide',
  commonErrors: [
    {
      error: 'Signal modulation failed',
      solution: 'Check input data validity and ensure all required fields are provided',
    },
    {
      error: 'LLM sentiment analysis unavailable',
      solution: 'Use fallback sentiment analysis or disable LLM integration',
    },
    {
      error: 'Market data missing',
      solution: 'Implement proper market data fetching with error handling',
    },
    {
      error: 'Configuration invalid',
      solution: 'Validate configuration parameters and use provided presets',
    },
  ],
  fallbackStrategies: [
    'Use default sentiment analysis when LLM service is unavailable',
    'Implement circuit breakers during high volatility periods',
    'Use conservative position sizing when risk assessment is uncertain',
    'Cache market data to handle temporary API failures',
  ],
};

// Migration Guide
export const MIGRATION_GUIDE = {
  title: 'Migration Guide',
  from: 'Direct Signal Execution',
  to: 'Signal Modulation System',
  steps: [
    'Replace direct signal execution with modulation calls',
    'Add sentiment analysis integration',
    'Implement risk assessment workflow',
    'Add market condition monitoring',
    'Update UI components to display modulation results',
    'Implement performance tracking',
    'Add configuration management',
  ],
  benefits: [
    'Improved risk-adjusted returns',
    'Better position sizing',
    'Enhanced signal quality filtering',
    'Comprehensive performance tracking',
    'Adaptive configuration based on market conditions',
  ],
};

// Export everything as default
export default {
  SignalModulationService,
  SignalModulationIntegration,
  signalModulationService,
  signalModulationIntegration,
  DEFAULT_MODULATION_CONFIG,
  INTEGRATION_PRESETS,
  QUICK_START_GUIDE,
  BEST_PRACTICES,
  COMMON_USE_CASES,
  ERROR_HANDLING_GUIDE,
  MIGRATION_GUIDE,
  SIGNAL_MODULATION_VERSION,
  SIGNAL_MODULATION_CREATED,
  SIGNAL_MODULATION_AUTHOR,
};