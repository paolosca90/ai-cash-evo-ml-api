// @ts-nocheck
// MT5 EA Invocation & Callback System - Main Export
// Complete integration system for AI-powered trading with MetaTrader 5

export * from './mt5-types';
export * from './mt5-invocation';
export * from './mt5-commands';
export * from './mt5-callbacks';
export * from './mt5-error-handling';
export * from './mt5-integration';

// Re-export commonly used classes and interfaces
import { MT5Integration } from './mt5-integration';
import { MT5CommandBuilder } from './mt5-commands';
import { MT5InvocationSystem } from './mt5-invocation';
import { MT5CallbackSystem } from './mt5-callbacks';
import { MT5ErrorHandler } from './mt5-error-handling';

// Factory functions for easy initialization
export function createMT5Integration(config?: import('./mt5-integration').MT5IntegrationConfig): MT5Integration {
  return MT5Integration.getInstance(config);
}

export function createCommandBuilder(riskManagement?: import('./mt5-types').RiskManagement): MT5CommandBuilder {
  return MT5CommandBuilder.getInstance(riskManagement);
}

export function createInvocationSystem(config?: import('./mt5-types').SystemConfig): MT5InvocationSystem {
  return new MT5InvocationSystem(config);
}

export function createCallbackSystem(config?: import('./mt5-types').SystemConfig): MT5CallbackSystem {
  return new MT5CallbackSystem(config);
}

export function createErrorHandler(config?: import('./mt5-types').SystemConfig): MT5ErrorHandler {
  return new MT5ErrorHandler(config);
}

// Default configurations
export const DEFAULT_SYSTEM_CONFIG: import('./mt5-types').SystemConfig = {
  http_timeout: 30000,
  ws_timeout: 60000,
  max_retries: 3,
  retry_delay_ms: 1000,
  heartbeat_interval_ms: 30000,
  command_queue_size: 1000,
  callback_queue_size: 1000,
  enable_logging: true,
  log_level: 'info',
  enable_metrics: true,
  metrics_interval_ms: 60000
};

export const DEFAULT_RISK_MANAGEMENT: import('./mt5-types').RiskManagement = {
  max_risk_per_trade: 2.0,
  max_daily_risk: 10.0,
  max_concurrent_trades: 10,
  max_positions_per_symbol: 3,
  max_lot_size: 10.0,
  min_lot_size: 0.01,
  lot_step: 0.01,
  risk_multiplier: 1.0,
  use_dynamic_risk: true,
  stop_loss_pips: 50,
  take_profit_pips: 100,
  volatility_threshold: 0.02
};

// Utility functions
export function validateMT5Account(account: Partial<MT5Account>): boolean {
  return (
    account &&
    typeof account.id === 'string' &&
    typeof account.account_number === 'string' &&
    typeof account.is_active === 'boolean'
  );
}

export function validateTradeCommand(command: Partial<TradeCommand>): boolean {
  return (
    command &&
    typeof command.account_id === 'string' &&
    typeof command.symbol === 'string' &&
    typeof command.action === 'string' &&
    typeof command.lot_size === 'number' &&
    command.lot_size > 0
  );
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function calculateProfitFactor(totalProfit: number, totalLoss: number): number {
  if (totalLoss === 0) return totalProfit > 0 ? Infinity : 0;
  return totalProfit / totalLoss;
}

export function calculateWinRate(winningTrades: number, totalTrades: number): number {
  if (totalTrades === 0) return 0;
  return (winningTrades / totalTrades) * 100;
}

export function calculateDrawdown(peak: number, current: number): number {
  if (peak === 0) return 0;
  return ((peak - current) / peak) * 100;
}

// Constants
export const SUPPORTED_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF',
  'XAUUSD', 'XAGUSD',
  'BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD'
];

export const TRADE_ACTIONS = [
  'BUY', 'SELL', 'BUY_STOP', 'SELL_STOP', 'BUY_LIMIT', 'SELL_LIMIT', 'CLOSE', 'MODIFY', 'CANCEL'
] as const;

export const ORDER_TYPES = [
  'MARKET', 'PENDING', 'POSITION'
] as const;

export const PRIORITY_LEVELS = [
  'low', 'medium', 'high', 'critical'
] as const;

// Error codes
export const ERROR_CODES = {
  CONNECTION_FAILED: 1001,
  AUTHENTICATION_FAILED: 1002,
  INVALID_PARAMETERS: 2001,
  ORDER_REJECTED: 3001,
  TRADE_CONTEXT_BUSY: 4001,
  INSUFFICIENT_MARGIN: 4002,
  INVALID_SYMBOL: 4003,
  TIME_SYNC_ERROR: 5001,
  SERVER_ERROR: 5002,
  NETWORK_ERROR: 5003
} as const;

// Logging levels
export const LOG_LEVELS = [
  'debug', 'info', 'warn', 'error', 'critical'
] as const;

// System status
export const SYSTEM_STATUS = [
  'disconnected', 'connecting', 'connected', 'reconnecting', 'error'
] as const;

// Health status
export const HEALTH_STATUS = [
  'healthy', 'degraded', 'unhealthy'
] as const;

// Default webhook handler for HTTP callbacks
export function createWebhookHandler(integration: MT5Integration) {
  return async (request: Request): Promise<Response> => {
    try {
      const payload = await request.json();

      // Validate webhook signature (if implemented)
      // const signature = request.headers.get('X-Webhook-Signature');
      // if (!validateWebhookSignature(payload, signature)) {
      //   return new Response('Invalid signature', { status: 401 });
      // }

      // Handle different webhook types
      switch (payload.type) {
        case 'trade_execution':
          await integration['callbackSystem'].processTradeCallback(payload.data);
          break;
        case 'position_update':
          await integration['callbackSystem'].processPositionUpdate(payload.data);
          break;
        case 'order_update':
          await integration['callbackSystem'].processOrderUpdate(payload.data);
          break;
        case 'error':
          await integration['callbackSystem'].processError(payload.data);
          break;
        default:
          console.warn('Unknown webhook type:', payload.type);
      }

      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('Webhook handler error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  };
}

// React hook for MT5 integration
import { useState, useEffect, useCallback } from 'react';

export interface UseMT5IntegrationOptions {
  autoInitialize?: boolean;
  enableRealtime?: boolean;
  enableMonitoring?: boolean;
}

export function useMT5Integration(options: UseMT5IntegrationOptions = {}) {
  const [integration, setIntegration] = useState<MT5Integration | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async (config?: import('./mt5-integration').MT5IntegrationConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      const mt5Integration = createMT5Integration({
        enableRealtime: options.enableRealtime,
        enableMonitoring: options.enableMonitoring,
        ...config
      });

      await mt5Integration.initialize();
      setIntegration(mt5Integration);
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize MT5 integration');
    } finally {
      setIsLoading(false);
    }
  }, [options.enableRealtime, options.enableMonitoring]);

  const shutdown = useCallback(async () => {
    if (integration) {
      try {
        await integration.shutdown();
        setIntegration(null);
        setIsInitialized(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to shutdown MT5 integration');
      }
    }
  }, [integration]);

  useEffect(() => {
    if (options.autoInitialize && !isInitialized && !isLoading) {
      initialize();
    }

    return () => {
      if (isInitialized && integration) {
        shutdown();
      }
    };
  }, [options.autoInitialize, isInitialized, isLoading, initialize, shutdown, integration]);

  return {
    integration,
    isInitialized,
    isLoading,
    error,
    initialize,
    shutdown
  };
}

// React hook for trading statistics
export function useTradingStatistics(userId?: string) {
  const [statistics, setStatistics] = useState<import('./mt5-types').TradingStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const integration = createMT5Integration();
      await integration.initialize();
      const stats = await integration.getTradingStatistics(userId);
      setStatistics(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    statistics,
    isLoading,
    error,
    refetch: fetchStatistics
  };
}

// React hook for account positions
export function useAccountPositions(userId: string) {
  const [positions, setPositions] = useState<import('./mt5-types').PositionUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const integration = createMT5Integration();
      await integration.initialize();
      const accountPositions = await integration.getAccountPositions(userId);
      setPositions(accountPositions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return {
    positions,
    isLoading,
    error,
    refetch: fetchPositions
  };
}

// Example usage and integration patterns
export const MT5_INTEGRATION_EXAMPLES = {
  BASIC_USAGE: `
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

// Subscribe to trade callbacks
const subscriptionId = integration.subscribeToTradeCallbacks((callback) => {
  console.log('Trade executed:', callback);
});

// Get trading statistics
const stats = await integration.getTradingStatistics();
console.log('Win rate:', stats.win_rate);

// Shutdown when done
await integration.shutdown();
  `,

  REACT_USAGE: `
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
  `,

  BATCH_PROCESSING: `
import { createMT5Integration, createCommandBuilder } from '@/lib/mt5-system';

const integration = createMT5Integration();
const commandBuilder = createCommandBuilder();

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
  `,

  ERROR_HANDLING: `
import { createMT5Integration, createErrorHandler } from '@/lib/mt5-system';

const integration = createMT5Integration();
const errorHandler = createErrorHandler();

// Register custom error handler
errorHandler.registerErrorHandler('critical', (error, context) => {
  // Send alert to monitoring system
  sendAlertToMonitoring(error, context);

  // Log to external service
  logToExternalService(error);
});

// Use the integration with error handling
try {
  const result = await integration.executeTradeSignal(tradeSignal);
} catch (error) {
  await errorHandler.handleError(error, {
    operation: 'trade_execution',
    tradeSignal
  });
}
  `,

  WEBSOCKET_INTEGRATION: `
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

// Subscribe to order updates
integration.subscribeToOrderUpdates((update) => {
  console.log('Order update:', update);

  // Handle order execution, cancellation, etc.
  if (update.state === 'FILLED') {
    onOrderFilled(update);
  }
});
  `,

  CUSTOM_RISK_MANAGEMENT: `
import { createMT5Integration, createCommandBuilder } from '@/lib/mt5-system';

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
  `
};