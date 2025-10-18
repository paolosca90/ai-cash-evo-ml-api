import { TradingSystemIntegration } from '../lib/TradingSystemIntegration';
import {
  MarketData,
  TechnicalIndicators,
  TimeframeData,
  SessionInfo,
  SmartMoneyConcepts,
  LLMSignals
} from '../types/market-regime-detection';
import { OHLCVData } from '../types/backtesting';

export class AdvancedMLTradingSystemExample {
  private tradingSystem: TradingSystemIntegration;

  constructor() {
    // Initialize with custom configuration
    this.tradingSystem = new TradingSystemIntegration({
      enableAdvancedML: true,
      enablePPOCPPOSelection: true,
      enableFeatureEngineering: true,
      signalGenerationInterval: 30000, // 30 seconds
      maxPositionSize: 0.05, // 5% max position
      riskPerTrade: 0.01, // 1% risk per trade
      stopLossPercentage: 0.02, // 2% stop loss
      takeProfitPercentage: 0.04, // 4% take profit
      enableBacktesting: true,
      enableRealtimeAnalysis: true
    });
  }

  /**
   * Example: Basic signal generation
   */
  public async basicSignalGenerationExample(): Promise<void> {
    console.log('🎯 Basic Signal Generation Example');
    console.log('=================================');

    // Create sample market data
    const marketData: MarketData = {
      symbol: 'BTC/USDT',
      timeframe: '1h',
      timestamp: Date.now(),
      open: 50000,
      high: 50500,
      low: 49800,
      close: 50200,
      volume: 1000000
    };

    // Create sample technical indicators
    const technicalIndicators: TechnicalIndicators = {
      atr: {
        value: 800,
        normalized: 0.016 // 1.6% of price
      },
      bollingerBands: {
        upper: 51200,
        middle: 50000,
        lower: 48800,
        position: 0.25, // Price is 25% between middle and upper band
        width: 0.048 // 4.8% width
      },
      rsi: {
        value: 65,
        divergence: 0.1
      },
      macd: {
        line: 120,
        signal: 80,
        histogram: 40
      },
      ema: {
        short: 50100,
        medium: 49900,
        long: 49500
      },
      adx: {
        value: 28,
        trend: 'uptrend'
      }
    };

    // Create multi-timeframe data
    const multiTimeframeData: TimeframeData[] = [
      {
        timeframe: '15m',
        data: this.generateHistoricalData('BTC/USDT', '15m', 100),
        indicators: technicalIndicators
      },
      {
        timeframe: '1h',
        data: this.generateHistoricalData('BTC/USDT', '1h', 200),
        indicators: technicalIndicators
      },
      {
        timeframe: '4h',
        data: this.generateHistoricalData('BTC/USDT', '4h', 50),
        indicators: technicalIndicators
      }
    ];

    // Create session info
    const sessionInfo: SessionInfo = {
      londonSession: true,
      nySession: false,
      asianSession: false,
      sessionOverlap: false,
      volatility: 0.7
    };

    // Generate trading signal
    const signal = await this.tradingSystem.generateTradingSignal(
      marketData,
      technicalIndicators,
      multiTimeframeData,
      sessionInfo
    );

    console.log('Generated Signal:');
    console.log(`- Action: ${signal.action}`);
    console.log(`- Confidence: ${signal.confidence.toFixed(1)}%`);
    console.log(`- Agent: ${signal.agent}`);
    console.log(`- Price: $${signal.price.toLocaleString()}`);
    console.log(`- Position Size: ${(signal.positionSize! * 100).toFixed(2)}%`);
    console.log(`- Stop Loss: $${signal.stopLoss?.toLocaleString()}`);
    console.log(`- Take Profit: $${signal.takeProfit?.toLocaleString()}`);
    console.log(`- Reasoning: ${signal.reasoning}`);
    console.log(`- Risk Level: ${(signal.riskLevel * 100).toFixed(1)}%`);
    console.log(`- Expected Return: ${(signal.expectedReturn * 100).toFixed(2)}%`);
  }

  /**
   * Example: Real-time trading system operation
   */
  public async realtimeOperationExample(): Promise<void> {
    console.log('\n🔄 Real-time Trading System Example');
    console.log('====================================');

    try {
      // Start the trading system
      await this.tradingSystem.start('BTC/USDT');

      // Monitor system status
      const checkStatus = () => {
        const status = this.tradingSystem.getSystemStatus();
        console.log(`System Status: ${status.systemHealth}`);
        console.log(`Active Agent: ${status.activeAgent}`);
        console.log(`Signals Generated: ${status.signalsGenerated}`);
        console.log(`Uptime: ${Math.round((Date.now() - status.uptime) / 1000)}s`);
      };

      // Check status every 10 seconds
      const statusInterval = setInterval(checkStatus, 10000);

      // Run for 2 minutes
      setTimeout(async () => {
        clearInterval(statusInterval);
        await this.tradingSystem.stop();
        console.log('Real-time example completed');
      }, 120000);

    } catch (error) {
      console.error('Real-time operation failed:', error);
    }
  }

  /**
   * Example: Backtesting
   */
  public async backtestingExample(): Promise<void> {
    console.log('\n🔍 Backtesting Example');
    console.log('======================');

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');

    try {
      const results = await this.tradingSystem.runBacktest(
        'BTC/USDT',
        startDate,
        endDate,
        10000 // $10,000 initial balance
      );

      console.log('Backtest Results:');
      console.log(`- Initial Balance: $10,000`);
      console.log(`- Final Balance: $${results.finalBalance.toLocaleString()}`);
      console.log(`- Total Return: ${(results.totalReturn * 100).toFixed(2)}%`);
      console.log(`- Sharpe Ratio: ${results.sharpeRatio.toFixed(2)}`);
      console.log(`- Max Drawdown: ${(results.maxDrawdown * 100).toFixed(2)}%`);
      console.log(`- Win Rate: ${(results.winRate * 100).toFixed(1)}%`);
      console.log(`- Total Trades: ${results.totalTrades}`);

    } catch (error) {
      console.error('Backtesting failed:', error);
    }
  }

  /**
   * Example: Market regime analysis
   */
  public async marketRegimeAnalysisExample(): Promise<void> {
    console.log('\n📊 Market Regime Analysis Example');
    console.log('==================================');

    const mlSystem = this.tradingSystem.getMLSystem();

    // Get current regime information
    const currentRegime = mlSystem.getCurrentRegime();
    if (currentRegime) {
      console.log('Current Market Regime:');
      console.log(`- Trend Direction: ${currentRegime.trendDirection}`);
      console.log(`- Volatility State: ${currentRegime.volatilityState}`);
      console.log(`- Momentum State: ${currentRegime.momentumState}`);
      console.log(`- Market Phase: ${currentRegime.marketPhase}`);
      console.log(`- Confidence: ${(currentRegime.confidence * 100).toFixed(1)}%`);
      console.log(`- Stability: ${(currentRegime.stability * 100).toFixed(1)}%`);
    }

    // Get system metrics
    const metrics = mlSystem.getSystemMetrics();
    console.log('\nSystem Metrics:');
    console.log(`- Total Signals Generated: ${metrics.totalSignalsGenerated}`);
    console.log(`- Average Confidence: ${(metrics.averageSignalConfidence * 100).toFixed(1)}%`);
    console.log(`- Regime Transitions: ${metrics.regimeTransitions}`);
    console.log(`- Agent Switches: ${metrics.agentSwitches}`);
    console.log(`- System Health: ${metrics.systemHealth}`);

    // Get available agents
    const agents = mlSystem.getAgents();
    console.log('\nAvailable Agents:');
    agents.forEach(agent => {
      const performance = mlSystem.getAgentPerformance(agent.id);
      console.log(`- ${agent.name} (${agent.id}):`);
      console.log(`  Risk Profile: ${agent.riskProfile}`);
      console.log(`  Specialties: ${agent.specialties.join(', ')}`);
      if (performance) {
        console.log(`  Sharpe Ratio: ${performance.sharpeRatio.toFixed(2)}`);
        console.log(`  Win Rate: ${(performance.winRate * 100).toFixed(1)}%`);
        console.log(`  Stability: ${(performance.stabilityScore * 100).toFixed(1)}%`);
      }
    });
  }

  /**
   * Example: PPO vs CPPO agent selection
   */
  public async ppoCppoSelectionExample(): Promise<void> {
    console.log('\n🤖 PPO vs CPPO Selection Example');
    console.log('=================================');

    const selector = this.tradingSystem.getPPOCPPOSelector();

    // Get decision history
    const decisions = selector.getDecisionHistory();
    console.log(`Total Decisions Made: ${decisions.length}`);

    if (decisions.length > 0) {
      const recentDecisions = decisions.slice(-5);
      console.log('\nRecent Decisions:');
      recentDecisions.forEach((decision, index) => {
        console.log(`${index + 1}. Agent: ${decision.agent}, Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
        console.log(`   Reasoning: ${decision.reasoning}`);
      });
    }

    // Get selection frequency
    const frequency = selector.getAgentSelectionFrequency();
    console.log('\nSelection Frequency:');
    console.log(`- PPO: ${(frequency.PPO * 100).toFixed(1)}%`);
    console.log(`- CPPO: ${(frequency.CPPO * 100).toFixed(1)}%`);

    // Get performance comparison
    const comparison = selector.getPerformanceComparison();
    if (comparison) {
      console.log('\nPerformance Comparison:');
      console.log(`- PPO Advantage: ${comparison.advantagePPO.toFixed(3)}`);
      console.log(`- CPPO Advantage: ${comparison.advantageCPPO.toFixed(3)}`);
      console.log('Market Conditions Favoring PPO:', comparison.marketConditions.favorPPO.join(', '));
      console.log('Market Conditions Favoring CPPO:', comparison.marketConditions.favorCPPO.join(', '));
    }
  }

  /**
   * Example: System health monitoring
   */
  public systemHealthExample(): void {
    console.log('\n🏥 System Health Monitoring Example');
    console.log('=====================================');

    const health = this.tradingSystem.getSystemHealth();

    console.log('Overall System Health:', health.overall.toUpperCase());
    console.log('\nComponent Health:');
    console.log(`- ML System: ${health.components.mlSystem}`);
    console.log(`- PPO-CPPO Selector: ${health.components.ppoCppoSelector}`);
    console.log(`- Feature Engineer: ${health.components.featureEngineer}`);

    if (health.issues.length > 0) {
      console.log('\nIssues Detected:');
      health.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ No issues detected');
    }
  }

  /**
   * Example: Configuration management
   */
  public configurationExample(): void {
    console.log('\n⚙️ Configuration Management Example');
    console.log('====================================');

    // Update configuration
    this.tradingSystem.updateConfig({
      maxPositionSize: 0.03, // Reduce to 3%
      riskPerTrade: 0.005, // Reduce to 0.5%
      signalGenerationInterval: 60000 // Increase to 1 minute
    });

    console.log('Configuration updated successfully');

    // Export system state
    const state = this.tradingSystem.exportSystemState();
    console.log(`System state exported (${state.length} characters)`);

    // Import system state (in a real scenario, this would be from a file)
    const importSuccess = this.tradingSystem.importSystemState(state);
    console.log(`System state import: ${importSuccess ? '✅ Success' : '❌ Failed'}`);
  }

  /**
   * Helper methods
   */
  private generateHistoricalData(symbol: string, timeframe: string, count: number): OHLCVData[] {
    const data = [];
    let basePrice = 50000;

    for (let i = 0; i < count; i++) {
      const variation = (Math.random() - 0.5) * 0.02;
      basePrice = basePrice * (1 + variation);

      data.push({
        symbol,
        timeframe,
        timestamp: Date.now() - (count - i) * 60000,
        open: basePrice,
        high: basePrice * (1 + Math.abs(variation)),
        low: basePrice * (1 - Math.abs(variation)),
        close: basePrice,
        volume: Math.random() * 1000000
      });
    }

    return data;
  }

  /**
   * Run all examples
   */
  public async runAllExamples(): Promise<void> {
    console.log('🚀 Advanced ML Trading System Examples');
    console.log('=====================================');

    try {
      await this.basicSignalGenerationExample();
      await this.marketRegimeAnalysisExample();
      await this.ppoCppoSelectionExample();
      this.systemHealthExample();
      this.configurationExample();
      await this.backtestingExample();

      console.log('\n✅ All examples completed successfully!');

    } catch (error) {
      console.error('❌ Example execution failed:', error);
    }
  }
}

// Example usage
export async function runAdvancedMLTradingSystemExamples() {
  const example = new AdvancedMLTradingSystemExample();
  await example.runAllExamples();
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAdvancedMLTradingSystemExamples().catch(console.error);
}