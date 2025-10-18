// @ts-nocheck
import {
  TradeCommand,
  TradeAction,
  OrderType,
  RiskManagement,
  MarketData,
  BatchCommand,
  BatchResult,
  CommandResult,
  TradeCallback
} from './mt5-types';

// Import MT5InvocationSystem class
import { MT5InvocationSystem } from './mt5-invocation';

export class MT5CommandBuilder {
  private static instance: MT5CommandBuilder;
  private riskManagement: RiskManagement;

  private constructor(riskManagement?: RiskManagement) {
    this.riskManagement = riskManagement || this.getDefaultRiskManagement();
  }

  public static getInstance(riskManagement?: RiskManagement): MT5CommandBuilder {
    if (!MT5CommandBuilder.instance) {
      MT5CommandBuilder.instance = new MT5CommandBuilder(riskManagement);
    }
    return MT5CommandBuilder.instance;
  }

  /**
   * Create market buy order
   */
  createMarketBuyOrder(
    accountId: string,
    symbol: string,
    lotSize: number,
    stopLoss?: number,
    takeProfit?: number,
    comment?: string,
    magicNumber: number = 888777
  ): TradeCommand {
    return {
      id: this.generateCommandId(),
      account_id: accountId,
      symbol,
      action: 'BUY',
      lot_size: lotSize,
      order_type: 'MARKET',
      stop_loss: stopLoss,
      take_profit: takeProfit,
      comment,
      magic_number: magicNumber,
      timestamp: new Date(),
      priority: this.calculatePriority('BUY', symbol),
      request_id: this.generateRequestId()
    };
  }

  /**
   * Create market sell order
   */
  createMarketSellOrder(
    accountId: string,
    symbol: string,
    lotSize: number,
    stopLoss?: number,
    takeProfit?: number,
    comment?: string,
    magicNumber: number = 888777
  ): TradeCommand {
    return {
      id: this.generateCommandId(),
      account_id: accountId,
      symbol,
      action: 'SELL',
      lot_size: lotSize,
      order_type: 'MARKET',
      stop_loss: stopLoss,
      take_profit: takeProfit,
      comment,
      magic_number: magicNumber,
      timestamp: new Date(),
      priority: this.calculatePriority('SELL', symbol),
      request_id: this.generateRequestId()
    };
  }

  /**
   * Create buy stop order
   */
  createBuyStopOrder(
    accountId: string,
    symbol: string,
    lotSize: number,
    price: number,
    stopLoss?: number,
    takeProfit?: number,
    expiration?: Date,
    comment?: string,
    magicNumber: number = 888777
  ): TradeCommand {
    return {
      id: this.generateCommandId(),
      account_id: accountId,
      symbol,
      action: 'BUY_STOP',
      lot_size: lotSize,
      order_type: 'PENDING',
      price,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      expiration,
      comment,
      magic_number: magicNumber,
      timestamp: new Date(),
      priority: this.calculatePriority('BUY_STOP', symbol),
      request_id: this.generateRequestId()
    };
  }

  /**
   * Create sell stop order
   */
  createSellStopOrder(
    accountId: string,
    symbol: string,
    lotSize: number,
    price: number,
    stopLoss?: number,
    takeProfit?: number,
    expiration?: Date,
    comment?: string,
    magicNumber: number = 888777
  ): TradeCommand {
    return {
      id: this.generateCommandId(),
      account_id: accountId,
      symbol,
      action: 'SELL_STOP',
      lot_size: lotSize,
      order_type: 'PENDING',
      price,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      expiration,
      comment,
      magic_number: magicNumber,
      timestamp: new Date(),
      priority: this.calculatePriority('SELL_STOP', symbol),
      request_id: this.generateRequestId()
    };
  }

  /**
   * Create buy limit order
   */
  createBuyLimitOrder(
    accountId: string,
    symbol: string,
    lotSize: number,
    price: number,
    stopLoss?: number,
    takeProfit?: number,
    expiration?: Date,
    comment?: string,
    magicNumber: number = 888777
  ): TradeCommand {
    return {
      id: this.generateCommandId(),
      account_id: accountId,
      symbol,
      action: 'BUY_LIMIT',
      lot_size: lotSize,
      order_type: 'PENDING',
      price,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      expiration,
      comment,
      magic_number: magicNumber,
      timestamp: new Date(),
      priority: this.calculatePriority('BUY_LIMIT', symbol),
      request_id: this.generateRequestId()
    };
  }

  /**
   * Create sell limit order
   */
  createSellLimitOrder(
    accountId: string,
    symbol: string,
    lotSize: number,
    price: number,
    stopLoss?: number,
    takeProfit?: number,
    expiration?: Date,
    comment?: string,
    magicNumber: number = 888777
  ): TradeCommand {
    return {
      id: this.generateCommandId(),
      account_id: accountId,
      symbol,
      action: 'SELL_LIMIT',
      lot_size: lotSize,
      order_type: 'PENDING',
      price,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      expiration,
      comment,
      magic_number: magicNumber,
      timestamp: new Date(),
      priority: this.calculatePriority('SELL_LIMIT', symbol),
      request_id: this.generateRequestId()
    };
  }

  /**
   * Create position close command
   */
  createClosePositionCommand(
    accountId: string,
    positionTicket: number,
    symbol: string,
    volume?: number,
    comment?: string,
    magicNumber: number = 888777
  ): TradeCommand {
    return {
      id: this.generateCommandId(),
      account_id: accountId,
      symbol,
      action: 'CLOSE',
      lot_size: volume || 0, // 0 means close entire position
      order_type: 'POSITION',
      comment: comment || `Close position ${positionTicket}`,
      magic_number: magicNumber,
      timestamp: new Date(),
      priority: 'high',
      request_id: this.generateRequestId()
    };
  }

  /**
   * Create order modification command
   */
  createModifyOrderCommand(
    accountId: string,
    orderTicket: number,
    symbol: string,
    newPrice?: number,
    newStopLoss?: number,
    newTakeProfit?: number,
    newExpiration?: Date,
    comment?: string,
    magicNumber: number = 888777
  ): TradeCommand {
    return {
      id: this.generateCommandId(),
      account_id: accountId,
      symbol,
      action: 'MODIFY',
      lot_size: 0, // Not used for modification
      order_type: 'PENDING',
      price: newPrice,
      stop_loss: newStopLoss,
      take_profit: newTakeProfit,
      expiration: newExpiration,
      comment: comment || `Modify order ${orderTicket}`,
      magic_number: magicNumber,
      timestamp: new Date(),
      priority: 'medium',
      request_id: this.generateRequestId()
    };
  }

  /**
   * Create order cancellation command
   */
  createCancelOrderCommand(
    accountId: string,
    orderTicket: number,
    symbol: string,
    comment?: string,
    magicNumber: number = 888777
  ): TradeCommand {
    return {
      id: this.generateCommandId(),
      account_id: accountId,
      symbol,
      action: 'CANCEL',
      lot_size: 0,
      order_type: 'PENDING',
      comment: comment || `Cancel order ${orderTicket}`,
      magic_number: magicNumber,
      timestamp: new Date(),
      priority: 'high',
      request_id: this.generateRequestId()
    };
  }

  /**
   * Create partial position close command
   */
  createPartialCloseCommand(
    accountId: string,
    positionTicket: number,
    symbol: string,
    closeVolume: number,
    comment?: string,
    magicNumber: number = 888777
  ): TradeCommand {
    return {
      id: this.generateCommandId(),
      account_id: accountId,
      symbol,
      action: 'CLOSE',
      lot_size: closeVolume,
      order_type: 'POSITION',
      comment: comment || `Partial close position ${positionTicket}`,
      magic_number: magicNumber,
      timestamp: new Date(),
      priority: 'medium',
      request_id: this.generateRequestId()
    };
  }

  /**
   * Apply risk management to command
   */
  applyRiskManagement(command: TradeCommand, marketData?: MarketData): TradeCommand {
    const adjustedCommand = { ...command };

    // Adjust lot size based on risk management
    if (this.riskManagement.max_lot_size && adjustedCommand.lot_size > this.riskManagement.max_lot_size) {
      adjustedCommand.lot_size = this.riskManagement.max_lot_size;
    }

    // Apply dynamic stop loss/take profit if not provided
    if (marketData && this.riskManagement.use_dynamic_risk) {
      if (!adjustedCommand.stop_loss && this.riskManagement.stop_loss_pips) {
        const pipValue = this.getPipValue(command.symbol);
        if (command.action === 'BUY') {
          adjustedCommand.stop_loss = marketData.bid - (this.riskManagement.stop_loss_pips * pipValue);
        } else {
          adjustedCommand.stop_loss = marketData.ask + (this.riskManagement.stop_loss_pips * pipValue);
        }
      }

      if (!adjustedCommand.take_profit && this.riskManagement.take_profit_pips) {
        const pipValue = this.getPipValue(command.symbol);
        if (command.action === 'BUY') {
          adjustedCommand.take_profit = marketData.ask + (this.riskManagement.take_profit_pips * pipValue);
        } else {
          adjustedCommand.take_profit = marketData.bid - (this.riskManagement.take_profit_pips * pipValue);
        }
      }
    }

    // Apply risk multiplier
    if (this.riskManagement.risk_multiplier && this.riskManagement.risk_multiplier !== 1) {
      adjustedCommand.lot_size = adjustedCommand.lot_size * this.riskManagement.risk_multiplier;
    }

    // Ensure lot size meets minimum requirements
    if (this.riskManagement.min_lot_size && adjustedCommand.lot_size < this.riskManagement.min_lot_size) {
      adjustedCommand.lot_size = this.riskManagement.min_lot_size;
    }

    return adjustedCommand;
  }

  /**
   * Create batch command
   */
  createBatchCommand(
    accountId: string,
    commands: TradeCommand[],
    executionStrategy: 'parallel' | 'sequential' | 'conditional' = 'sequential',
    timeoutMs: number = 30000,
    continueOnError: boolean = false
  ): BatchCommand {
    return {
      id: this.generateCommandId(),
      account_id: accountId,
      commands: commands.map(cmd => ({ ...cmd })),
      execution_strategy: executionStrategy,
      timeout_ms: timeoutMs,
      continue_on_error: continueOnError,
      timestamp: new Date()
    };
  }

  /**
   * Create OCO (One Cancels Other) command
   */
  createOCOCommand(
    accountId: string,
    symbol: string,
    buyStopPrice: number,
    sellStopPrice: number,
    lotSize: number,
    stopLoss?: number,
    takeProfit?: number,
    expiration?: Date,
    magicNumber: number = 888777
  ): BatchCommand {
    const buyStopOrder = this.createBuyStopOrder(
      accountId,
      symbol,
      lotSize,
      buyStopPrice,
      stopLoss,
      takeProfit,
      expiration,
      'OCO Buy Stop',
      magicNumber
    );

    const sellStopOrder = this.createSellStopOrder(
      accountId,
      symbol,
      lotSize,
      sellStopPrice,
      stopLoss,
      takeProfit,
      expiration,
      'OCO Sell Stop',
      magicNumber
    );

    return this.createBatchCommand(
      accountId,
      [buyStopOrder, sellStopOrder],
      'parallel',
      30000,
      true
    );
  }

  /**
   * Create trailing stop command
   */
  createTrailingStopCommand(
    accountId: string,
    positionTicket: number,
    symbol: string,
    trailingPips: number,
    magicNumber: number = 888777
  ): TradeCommand {
    return {
      id: this.generateCommandId(),
      account_id: accountId,
      symbol,
      action: 'MODIFY',
      lot_size: 0,
      order_type: 'POSITION',
      comment: `Set trailing stop ${trailingPips} pips for position ${positionTicket}`,
      magic_number: magicNumber,
      timestamp: new Date(),
      priority: 'medium',
      request_id: this.generateRequestId()
    };
  }

  /**
   * Validate command before execution
   */
  validateCommand(command: TradeCommand, marketData?: MarketData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!command.symbol || command.symbol.trim() === '') {
      errors.push('Symbol is required');
    }

    if (command.lot_size < 0) {
      errors.push('Lot size cannot be negative');
    }

    if (command.lot_size > 0 && command.lot_size < this.riskManagement.min_lot_size) {
      errors.push(`Lot size must be at least ${this.riskManagement.min_lot_size}`);
    }

    if (command.lot_size > this.riskManagement.max_lot_size) {
      errors.push(`Lot size cannot exceed ${this.riskManagement.max_lot_size}`);
    }

    // Market data validation for pending orders
    if (command.order_type === 'PENDING' && marketData) {
      if (!command.price || command.price <= 0) {
        errors.push('Price is required for pending orders');
      }

      // Validate price levels
      if (command.action === 'BUY_STOP' && command.price <= marketData.ask) {
        errors.push('Buy stop price must be above current ask price');
      }

      if (command.action === 'SELL_STOP' && command.price >= marketData.bid) {
        errors.push('Sell stop price must be below current bid price');
      }

      if (command.action === 'BUY_LIMIT' && command.price >= marketData.ask) {
        errors.push('Buy limit price must be below current ask price');
      }

      if (command.action === 'SELL_LIMIT' && command.price <= marketData.bid) {
        errors.push('Sell limit price must be above current bid price');
      }
    }

    // Stop loss and take profit validation
    if (command.stop_loss && command.take_profit) {
      const isValidSLTP = this.validateStopLossTakeProfit(command);
      if (!isValidSLTP) {
        errors.push('Invalid stop loss and take profit levels');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate stop loss and take profit levels
   */
  private validateStopLossTakeProfit(command: TradeCommand): boolean {
    if (!command.price || !command.stop_loss || !command.take_profit) {
      return true;
    }

    switch (command.action) {
      case 'BUY':
      case 'BUY_STOP':
      case 'BUY_LIMIT':
        return command.stop_loss < command.price && command.take_profit > command.price;
      case 'SELL':
      case 'SELL_STOP':
      case 'SELL_LIMIT':
        return command.stop_loss > command.price && command.take_profit < command.price;
      default:
        return true;
    }
  }

  /**
   * Calculate command priority based on action and symbol
   */
  private calculatePriority(action: TradeAction, symbol: string): 'low' | 'medium' | 'high' | 'critical' {
    const highPriorityActions: TradeAction[] = ['CLOSE', 'CANCEL'];
    const criticalSymbols = ['XAUUSD', 'GBPJPY', 'EURJPY']; // Volatile symbols

    if (highPriorityActions.includes(action)) {
      return 'high';
    }

    if (criticalSymbols.includes(symbol)) {
      return 'critical';
    }

    if (action.includes('LIMIT') || action.includes('STOP')) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get pip value for symbol
   */
  private getPipValue(symbol: string): number {
    // Standard forex pairs
    if (symbol.includes('JPY')) {
      return 0.01;
    }
    return 0.0001;
  }

  /**
   * Generate unique command ID
   */
  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default risk management settings
   */
  private getDefaultRiskManagement(): RiskManagement {
    return {
      max_risk_per_trade: 2.0,
      max_daily_risk: 10.0,
      max_concurrent_trades: 10,
      max_positions_per_symbol: 3,
      max_lot_size: 10.0,
      min_lot_size: 0.01,
      lot_step: 0.01,
      risk_multiplier: 1.0,
      use_dynamic_risk: true
    };
  }

  /**
   * Update risk management settings
   */
  updateRiskManagement(newSettings: Partial<RiskManagement>): void {
    this.riskManagement = { ...this.riskManagement, ...newSettings };
  }

  /**
   * Get current risk management settings
   */
  getRiskManagement(): RiskManagement {
    return { ...this.riskManagement };
  }
}

export class MT5BatchProcessor {
  private invocationSystem: MT5InvocationSystem;

  constructor(invocationSystem: MT5InvocationSystem) {
    this.invocationSystem = invocationSystem;
  }

  /**
   * Execute batch command
   */
  async executeBatch(batchCommand: BatchCommand): Promise<BatchResult> {
    const startTime = Date.now();
    const results: CommandResult[] = [];

    switch (batchCommand.execution_strategy) {
      case 'parallel':
        results.push(...await this.executeParallel(batchCommand));
        break;
      case 'sequential':
        results.push(...await this.executeSequential(batchCommand));
        break;
      case 'conditional':
        results.push(...await this.executeConditional(batchCommand));
        break;
    }

    const executionTime = Date.now() - startTime;

    return {
      batch_id: batchCommand.id,
      total_commands: batchCommand.commands.length,
      successful_commands: results.filter(r => r.success).length,
      failed_commands: results.filter(r => !r.success).length,
      execution_time_ms: executionTime,
      results,
      overall_success: results.every(r => r.success || batchCommand.continue_on_error)
    };
  }

  /**
   * Execute commands in parallel
   */
  private async executeParallel(batchCommand: BatchCommand): Promise<CommandResult[]> {
    const promises = batchCommand.commands.map(async (command) => {
      try {
        return await this.invocationSystem.sendCommand(command);
      } catch (error) {
        if (!batchCommand.continue_on_error) {
          throw error;
        }
        return {
          success: false,
          command_id: command.id,
          execution_time_ms: 0,
          error: {
            code: 500,
            message: error.message,
            timestamp: new Date(),
            retryable: false,
            severity: 'error'
          },
          callback_received: false
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Execute commands sequentially
   */
  private async executeSequential(batchCommand: BatchCommand): Promise<CommandResult[]> {
    const results: CommandResult[] = [];

    for (const command of batchCommand.commands) {
      try {
        const result = await this.invocationSystem.sendCommand(command);
        results.push(result);

        // If command failed and we're not continuing on error, stop execution
        if (!result.success && !batchCommand.continue_on_error) {
          break;
        }
      } catch (error) {
        const errorResult: CommandResult = {
          success: false,
          command_id: command.id,
          execution_time_ms: 0,
          error: {
            code: 500,
            message: error.message,
            timestamp: new Date(),
            retryable: false,
            severity: 'error'
          },
          callback_received: false
        };

        results.push(errorResult);

        if (!batchCommand.continue_on_error) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Execute commands with conditional logic
   */
  private async executeConditional(batchCommand: BatchCommand): Promise<CommandResult[]> {
    const results: CommandResult[] = [];
    let previousSuccess = true;

    for (const command of batchCommand.commands) {
      // Only execute if previous command was successful
      if (!previousSuccess && !batchCommand.continue_on_error) {
        break;
      }

      try {
        const result = await this.invocationSystem.sendCommand(command);
        results.push(result);
        previousSuccess = result.success;
      } catch (error) {
        const errorResult: CommandResult = {
          success: false,
          command_id: command.id,
          execution_time_ms: 0,
          error: {
            code: 500,
            message: error.message,
            timestamp: new Date(),
            retryable: false,
            severity: 'error'
          },
          callback_received: false
        };

        results.push(errorResult);
        previousSuccess = false;

        if (!batchCommand.continue_on_error) {
          break;
        }
      }
    }

    return results;
  }
}