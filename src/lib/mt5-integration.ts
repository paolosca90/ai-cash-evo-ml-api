// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { MT5InvocationSystem } from './mt5-invocation';
import { MT5CommandBuilder, MT5BatchProcessor } from './mt5-commands';
import { MT5CallbackSystem } from './mt5-callbacks';
import { MT5ErrorHandler } from './mt5-error-handling';
// @ts-nocheck
import {
  MT5Account,
  MT5Connection,
  TradeCommand,
  TradeCallback,
  PositionUpdate,
  OrderUpdate,
  RiskManagement,
  MarketData,
  SystemConfig,
  TradingStatistics,
  BatchCommand,
  BatchResult,
  CommandResult,
  HealthStatus
} from './mt5-types';

export interface MT5IntegrationConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  systemConfig?: Partial<SystemConfig>;
  riskManagement?: Partial<RiskManagement>;
  enableRealtime?: boolean;
  enableMonitoring?: boolean;
  enableAlerts?: boolean;
}

export interface TradeSignal {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  lot_size: number;
  stop_loss?: number;
  take_profit?: number;
  confidence: number;
  strategy: string;
  timestamp: Date;
  user_id: string;
}

// Supabase realtime subscription interface
export interface RealtimeSubscription {
  unsubscribe: () => void;
}

// Trade signal data from Supabase realtime
export interface TradeSignalData {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  lot_size: number;
  stop_loss?: number;
  take_profit?: number;
  confidence: number;
  strategy: string;
  created_at: string;
  user_id: string;
}

export class MT5Integration {
  private static instance: MT5Integration;
  private invocationSystem: MT5InvocationSystem;
  private commandBuilder: MT5CommandBuilder;
  private batchProcessor: MT5BatchProcessor;
  private callbackSystem: MT5CallbackSystem;
  private errorHandler: MT5ErrorHandler;
  private config: MT5IntegrationConfig;
  private accounts: Map<string, MT5Account> = new Map();
  private connections: Map<string, MT5Connection> = new Map();
  private isInitialized = false;
  private realtimeSubscription?: RealtimeSubscription;

  private constructor(config?: MT5IntegrationConfig) {
    this.config = {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      enableRealtime: true,
      enableMonitoring: true,
      enableAlerts: true,
      ...config
    };

    this.initializeSystems();
  }

  public static getInstance(config?: MT5IntegrationConfig): MT5Integration {
    if (!MT5Integration.instance) {
      MT5Integration.instance = new MT5Integration(config);
    }
    return MT5Integration.instance;
  }

  /**
   * Initialize the MT5 integration system
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Load accounts and connections from database
      await this.loadAccountsAndConnections();

      // Initialize connections
      await this.initializeConnections();

      // Setup realtime subscriptions
      if (this.config.enableRealtime) {
        await this.setupRealtimeSubscriptions();
      }

      // Setup monitoring
      if (this.config.enableMonitoring) {
        await this.setupMonitoring();
      }

      this.isInitialized = true;
      console.log('🚀 MT5 Integration System initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize MT5 Integration:', error);
      throw error;
    }
  }

  /**
   * Execute trade signal from AI system
   */
  async executeTradeSignal(signal: TradeSignal): Promise<CommandResult> {
    try {
      // Validate signal
      this.validateTradeSignal(signal);

      // Get user's MT5 account
      const account = await this.getUserAccount(signal.user_id);
      if (!account) {
        throw new Error('No MT5 account found for user');
      }

      // Check if account is active
      if (!account.is_active) {
        throw new Error('MT5 account is not active');
      }

      // Create trade command
      const command = this.commandBuilder.createMarketOrder(
        account.id,
        signal.symbol,
        signal.action,
        signal.lot_size,
        signal.stop_loss,
        signal.take_profit,
        `AI Signal: ${signal.strategy} (Confidence: ${signal.confidence}%)`
      );

      // Apply risk management
      const riskManagedCommand = this.commandBuilder.applyRiskManagement(command);

      // Execute command
      const result = await this.invocationSystem.sendCommand(riskManagedCommand);

      // Log trade to database
      await this.logTradeToDatabase(signal, command, result);

      return result;
    } catch (error) {
      console.error('Error executing trade signal:', error);
      throw error;
    }
  }

  /**
   * Execute batch trade signals
   */
  async executeBatchSignals(signals: TradeSignal[]): Promise<BatchResult> {
    try {
      if (signals.length === 0) {
        throw new Error('No signals to execute');
      }

      // Group signals by user
      const signalsByUser = this.groupSignalsByUser(signals);
      const results: BatchResult[] = [];

      for (const [userId, userSignals] of signalsByUser) {
        const account = await this.getUserAccount(userId);
        if (!account) {
          console.warn(`No MT5 account found for user ${userId}`);
          continue;
        }

        // Create commands for this user
        const commands = userSignals.map(signal => {
          const command = this.commandBuilder.createMarketOrder(
            account.id,
            signal.symbol,
            signal.action,
            signal.lot_size,
            signal.stop_loss,
            signal.take_profit,
            `AI Batch Signal: ${signal.strategy}`
          );
          return this.commandBuilder.applyRiskManagement(command);
        });

        // Create batch command
        const batchCommand = this.commandBuilder.createBatchCommand(
          account.id,
          commands,
          'parallel',
          30000,
          true
        );

        // Execute batch
        const batchResult = await this.batchProcessor.executeBatch(batchCommand);
        results.push(batchResult);

        // Log batch to database
        await this.logBatchToDatabase(userSignals, batchResult);
      }

      // Aggregate results
      return this.aggregateBatchResults(results);
    } catch (error) {
      console.error('Error executing batch signals:', error);
      throw error;
    }
  }

  /**
   * Close position
   */
  async closePosition(
    userId: string,
    positionTicket: number,
    symbol: string,
    volume?: number
  ): Promise<CommandResult> {
    try {
      const account = await this.getUserAccount(userId);
      if (!account) {
        throw new Error('No MT5 account found for user');
      }

      const command = this.commandBuilder.createClosePositionCommand(
        account.id,
        positionTicket,
        symbol,
        volume,
        'Manual close request'
      );

      return await this.invocationSystem.sendCommand(command);
    } catch (error) {
      console.error('Error closing position:', error);
      throw error;
    }
  }

  /**
   * Get account positions
   */
  async getAccountPositions(userId: string): Promise<PositionUpdate[]> {
    try {
      const account = await this.getUserAccount(userId);
      if (!account) {
        throw new Error('No MT5 account found for user');
      }

      // Query positions from database
      const { data, error } = await supabase
        .from('mt5_positions')
        .select('*')
        .eq('account_id', account.id)
        .is('closed_at', null);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting account positions:', error);
      throw error;
    }
  }

  /**
   * Get trading statistics
   */
  async getTradingStatistics(userId?: string): Promise<TradingStatistics> {
    try {
      if (userId) {
        return await this.getUserStatistics(userId);
      } else {
        return this.callbackSystem.getStatistics();
      }
    } catch (error) {
      console.error('Error getting trading statistics:', error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  getSystemHealth(): HealthStatus {
    return this.callbackSystem.getHealthStatus();
  }

  /**
   * Subscribe to trade callbacks
   */
  subscribeToTradeCallbacks(
    handler: (callback: TradeCallback) => void,
    userId?: string
  ): string {
    return this.callbackSystem.subscribeToTradeCallbacks(handler, userId);
  }

  /**
   * Subscribe to position updates
   */
  subscribeToPositionUpdates(
    handler: (update: PositionUpdate) => void,
    userId?: string
  ): string {
    return this.callbackSystem.subscribeToPositionUpdates(handler, userId);
  }

  /**
   * Unsubscribe from callbacks
   */
  unsubscribe(subscriptionId: string): boolean {
    return this.callbackSystem.unsubscribe(subscriptionId);
  }

  /**
   * Update risk management settings
   */
  updateRiskManagement(settings: Partial<RiskManagement>, userId?: string): void {
    this.commandBuilder.updateRiskManagement(settings);
  }

  /**
   * Shutdown the integration system
   */
  async shutdown(): Promise<void> {
    try {
      console.log('🔄 Shutting down MT5 Integration System...');

      // Close all connections
      await this.invocationSystem.closeAllConnections();

      // Clean up realtime subscriptions
      if (this.realtimeSubscription) {
        this.realtimeSubscription.unsubscribe();
      }

      // Reset state
      this.accounts.clear();
      this.connections.clear();
      this.isInitialized = false;

      console.log('✅ MT5 Integration System shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Initialize internal systems
   */
  private initializeSystems(): void {
    // Initialize invocation system
    this.invocationSystem = new MT5InvocationSystem(this.config.systemConfig);

    // Initialize command builder
    this.commandBuilder = MT5CommandBuilder.getInstance(this.config.riskManagement);

    // Initialize batch processor
    this.batchProcessor = new MT5BatchProcessor(this.invocationSystem);

    // Initialize callback system
    this.callbackSystem = new MT5CallbackSystem(this.config.systemConfig);

    // Initialize error handler
    this.errorHandler = new MT5ErrorHandler(this.config.systemConfig);

    // Setup error handlers
    this.setupErrorHandlers();
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers(): void {
    this.errorHandler.registerErrorHandler('critical', (error, context) => {
      console.error('🚨 Critical error:', error, context);
      // Could trigger alerts, notifications, etc.
    });

    this.errorHandler.registerErrorHandler('error', (error, context) => {
      console.error('❌ Error:', error, context);
    });

    this.errorHandler.registerErrorHandler('warning', (error, context) => {
      console.warn('⚠️ Warning:', error, context);
    });
  }

  /**
   * Load accounts and connections from database
   */
  private async loadAccountsAndConnections(): Promise<void> {
    try {
      // Load accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('mt5_accounts')
        .select('*')
        .eq('is_active', true);

      if (accountsError) {
        throw accountsError;
      }

      accounts?.forEach(account => {
        this.accounts.set(account.id, account);
      });

      // Load connections
      const { data: connections, error: connectionsError } = await supabase
        .from('mt5_connections')
        .select('*');

      if (connectionsError) {
        throw connectionsError;
      }

      connections?.forEach(connection => {
        this.connections.set(connection.id, connection);
      });

      console.log(`Loaded ${accounts?.length || 0} accounts and ${connections?.length || 0} connections`);
    } catch (error) {
      console.error('Error loading accounts and connections:', error);
      throw error;
    }
  }

  /**
   * Initialize connections
   */
  private async initializeConnections(): Promise<void> {
    const connectionPromises = Array.from(this.connections.values()).map(async (connection) => {
      try {
        await this.invocationSystem.initializeConnection(connection);
        console.log(`✅ Connected to MT5 EA: ${connection.id}`);
      } catch (error) {
        console.error(`❌ Failed to connect to MT5 EA ${connection.id}:`, error);
      }
    });

    await Promise.all(connectionPromises);
  }

  /**
   * Setup realtime subscriptions
   */
  private async setupRealtimeSubscriptions(): Promise<void> {
    try {
      // Subscribe to trade signals
      this.realtimeSubscription = supabase
        .channel('trade_signals')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'trade_signals'
        }, async (payload) => {
          await this.handleRealtimeTradeSignal(payload.new);
        })
        .subscribe();

      console.log('✅ Realtime subscriptions setup complete');
    } catch (error) {
      console.error('Error setting up realtime subscriptions:', error);
      throw error;
    }
  }

  /**
   * Setup monitoring
   */
  private async setupMonitoring(): Promise<void> {
    try {
      // Start health checks
      setInterval(() => {
        this.performHealthCheck();
      }, 30000); // Every 30 seconds

      // Setup callback handlers for monitoring
      this.callbackSystem.subscribeToErrors((error) => {
        console.error('System error:', error);
      });

      console.log('✅ Monitoring setup complete');
    } catch (error) {
      console.error('Error setting up monitoring:', error);
      throw error;
    }
  }

  /**
   * Handle realtime trade signal
   */
  private async handleRealtimeTradeSignal(signalData: TradeSignalData): Promise<void> {
    try {
      const signal: TradeSignal = {
        id: signalData.id,
        symbol: signalData.symbol,
        action: signalData.action,
        lot_size: signalData.lot_size,
        stop_loss: signalData.stop_loss,
        take_profit: signalData.take_profit,
        confidence: signalData.confidence,
        strategy: signalData.strategy,
        timestamp: new Date(signalData.created_at),
        user_id: signalData.user_id
      };

      // Execute the signal
      await this.executeTradeSignal(signal);
    } catch (error) {
      console.error('Error handling realtime trade signal:', error);
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const health = this.getSystemHealth();

      if (health.overall_status === 'unhealthy') {
        console.error('🚨 System health check failed:', health.issues);
        // Could trigger alerts here
      } else if (health.overall_status === 'degraded') {
        console.warn('⚠️ System health degraded:', health.issues);
      }

      // Update health status in database
      await supabase
        .from('system_health')
        .upsert({
          status: health.overall_status,
          issues: health.issues,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error during health check:', error);
    }
  }

  /**
   * Get user account
   */
  private async getUserAccount(userId: string): Promise<MT5Account | undefined> {
    // Find account by user ID
    for (const account of this.accounts.values()) {
      if (account.account_number === userId) { // This is a simplification
        return account;
      }
    }

    // Try to load from database
    const { data, error } = await supabase
      .from('mt5_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return undefined;
    }

    // Cache the account
    this.accounts.set(data.id, data);
    return data;
  }

  /**
   * Validate trade signal
   */
  private validateTradeSignal(signal: TradeSignal): void {
    if (!signal.symbol || signal.symbol.trim() === '') {
      throw new Error('Symbol is required');
    }

    if (!signal.action || !['BUY', 'SELL'].includes(signal.action)) {
      throw new Error('Invalid trade action');
    }

    if (signal.lot_size <= 0) {
      throw new Error('Lot size must be positive');
    }

    if (!signal.user_id) {
      throw new Error('User ID is required');
    }

    if (signal.confidence < 0 || signal.confidence > 100) {
      throw new Error('Confidence must be between 0 and 100');
    }
  }

  /**
   * Group signals by user
   */
  private groupSignalsByUser(signals: TradeSignal[]): Map<string, TradeSignal[]> {
    const grouped = new Map<string, TradeSignal[]>();

    signals.forEach(signal => {
      if (!grouped.has(signal.user_id)) {
        grouped.set(signal.user_id, []);
      }
      grouped.get(signal.user_id)!.push(signal);
    });

    return grouped;
  }

  /**
   * Create market order (helper method)
   */
  private createMarketOrder(
    accountId: string,
    symbol: string,
    action: 'BUY' | 'SELL',
    lotSize: number,
    stopLoss?: number,
    takeProfit?: number,
    comment?: string
  ): TradeCommand {
    if (action === 'BUY') {
      return this.commandBuilder.createMarketBuyOrder(
        accountId,
        symbol,
        lotSize,
        stopLoss,
        takeProfit,
        comment
      );
    } else {
      return this.commandBuilder.createMarketSellOrder(
        accountId,
        symbol,
        lotSize,
        stopLoss,
        takeProfit,
        comment
      );
    }
  }

  /**
   * Log trade to database
   */
  private async logTradeToDatabase(
    signal: TradeSignal,
    command: TradeCommand,
    result: CommandResult
  ): Promise<void> {
    try {
      await supabase
        .from('trade_log')
        .insert({
          user_id: signal.user_id,
          signal_id: signal.id,
          command_id: command.id,
          symbol: signal.symbol,
          action: signal.action,
          lot_size: signal.lot_size,
          confidence: signal.confidence,
          strategy: signal.strategy,
          success: result.success,
          execution_time_ms: result.execution_time_ms,
          error_message: result.error?.message,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging trade to database:', error);
    }
  }

  /**
   * Log batch to database
   */
  private async logBatchToDatabase(
    signals: TradeSignal[],
    result: BatchResult
  ): Promise<void> {
    try {
      await supabase
        .from('batch_log')
        .insert({
          signal_count: signals.length,
          successful_commands: result.successful_commands,
          failed_commands: result.failed_commands,
          execution_time_ms: result.execution_time_ms,
          overall_success: result.overall_success,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging batch to database:', error);
    }
  }

  /**
   * Get user statistics
   */
  private async getUserStatistics(userId: string): Promise<TradingStatistics> {
    try {
      const { data, error } = await supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return this.callbackSystem.getStatistics(); // Fallback to system stats
      }

      return {
        total_trades: data.total_trades || 0,
        winning_trades: data.winning_trades || 0,
        losing_trades: data.losing_trades || 0,
        win_rate: data.win_rate || 0,
        total_profit: data.total_profit || 0,
        total_loss: data.total_loss || 0,
        net_profit: data.net_profit || 0,
        average_win: data.average_win || 0,
        average_loss: data.average_loss || 0,
        profit_factor: data.profit_factor || 0,
        max_drawdown: data.max_drawdown || 0,
        current_drawdown: data.current_drawdown || 0
      };
    } catch (error) {
      console.error('Error getting user statistics:', error);
      return this.callbackSystem.getStatistics();
    }
  }

  /**
   * Aggregate batch results
   */
  private aggregateBatchResults(results: BatchResult[]): BatchResult {
    const totalCommands = results.reduce((sum, result) => sum + result.total_commands, 0);
    const successfulCommands = results.reduce((sum, result) => sum + result.successful_commands, 0);
    const failedCommands = results.reduce((sum, result) => sum + result.failed_commands, 0);
    const totalExecutionTime = results.reduce((sum, result) => sum + result.execution_time_ms, 0);
    const allResults = results.flatMap(result => result.results);

    return {
      batch_id: `aggregated_${Date.now()}`,
      total_commands: totalCommands,
      successful_commands: successfulCommands,
      failed_commands: failedCommands,
      execution_time_ms: totalExecutionTime,
      results: allResults,
      overall_success: failedCommands === 0
    };
  }
}