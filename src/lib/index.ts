// @ts-nocheck
// Main Advanced ML Trading System exports
export { AdvancedMLTradingSystem } from './AdvancedMLTradingSystem';
export { PPOCPPOAgentSelector } from './PPOCPPOAgentSelector';
export { TradingSystemIntegration } from './TradingSystemIntegration';

// Risk Management exports
export * from './risk-management';
export { RiskManagementPanel } from '../components/risk-management/RiskManagementPanel';

// Type exports
export * from '../types/market-regime-detection';
export * from '../types/risk-management';

// Feature engineering exports
export { UnifiedFeatureEngineer } from './feature-engineering/UnifiedFeatureEngineer';
export * from '../types/feature-engineering';

// Example exports
export { AdvancedMLTradingSystemExample, runAdvancedMLTradingSystemExamples } from '../examples/AdvancedMLTradingSystemExample';

// Version information
export const VERSION = '1.0.0';
export const BUILD_DATE = new Date().toISOString();

/**
 * AI Cash Evolution Trading System
 *
 * A comprehensive trading platform with advanced ML capabilities,
 * risk management, and MT5 integration.
 *
 * Features:
 * - Multi-timeframe market regime detection
 * - PPO vs CPPO agent selection with performance tracking
 * - Advanced risk management with ATR-based calculations
 * - Position sizing and portfolio protection
 * - Real-time signal generation and execution
 * - MT5 Expert Advisor integration
 * - Backtesting and optimization capabilities
 *
 * Risk Management Features:
 * - ATR-based stop loss calculation with multi-timeframe analysis
 * - Take profit calculation with risk-reward ratio validation
 * - Advanced position sizing with account risk management
 * - Portfolio-level risk monitoring and protection
 * - Real-time risk alerts and recommendations
 *
 * @example
 * ```typescript
 * // Use risk management system
 * import { riskManagementService, calculateQuickRisk } from './src/lib';
 *
 * // Quick risk calculation
 * const result = await calculateQuickRisk('EURUSD', 'BUY', 1.1000, 10000, 0.0010);
 *
 * // Advanced risk management
 * const detailed = await riskManagementService.calculateTradeRisk({
 *   symbol: 'EURUSD',
 *   direction: 'BUY',
 *   entryPrice: 1.1000,
 *   accountInfo,
 *   symbolSpecs,
 *   marketData,
 *   riskAmount: 200
 * });
 *
 * // Use full trading system
 * import { TradingSystemIntegration } from './src/lib';
 * const system = new TradingSystemIntegration();
 * await system.start('EURUSD');
 * ```
 */