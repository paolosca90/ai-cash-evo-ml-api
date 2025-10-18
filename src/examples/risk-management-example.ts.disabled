/**
 * Risk Management System Examples
 *
 * Comprehensive examples demonstrating the risk management system
 * integration with trading operations.
 */

import {
  riskManagementService,
  calculateQuickRisk,
  mt5RiskIntegration,
  validateRiskParameters,
  calculateSimplePositionSize,
  calculateRiskRewardRatio,
  generateRiskSummary,
  DEFAULT_RISK_CONFIG,
  DEFAULT_ATR_CONFIG
} from '@/lib/risk-management';

// Example 1: Basic Risk Calculation
export async function exampleBasicRiskCalculation() {
  console.log('=== Basic Risk Calculation Example ===');

  try {
    const result = await calculateQuickRisk(
      'EURUSD',
      'BUY',
      1.1000,
      10000,
      0.0010,
      2.0 // 2% risk
    );

    console.log('Risk Calculation Result:', {
      symbol: result.symbol,
      direction: result.direction,
      entryPrice: result.entryPrice,
      stopLoss: result.stopLoss.price,
      takeProfit: result.takeProfit.primaryTP,
      lotSize: result.positionSize.lotSize,
      riskAmount: result.riskMetrics.riskAmount,
      riskPercentage: result.riskMetrics.riskPercentage,
      riskRewardRatio: result.riskMetrics.riskRewardRatio,
      validation: result.validation
    });

    const summary = generateRiskSummary(result);
    console.log('Risk Summary:', summary);

  } catch (error) {
    console.error('Risk calculation failed:', error);
  }
}

// Example 2: Advanced Risk Management
export async function exampleAdvancedRiskManagement() {
  console.log('=== Advanced Risk Management Example ===');

  const accountInfo = {
    balance: 25000,
    equity: 25200,
    margin: 5000,
    freeMargin: 20200,
    marginLevel: 504,
    currency: 'EUR',
    leverage: 100,
    hedgingAllowed: false
  };

  const symbolSpecs = {
    symbol: 'GBPUSD',
    digits: 4,
    point: 0.0001,
    tickSize: 0.0001,
    tickValue: 10,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    contractSize: 100000,
    currency: 'USD',
    profitCurrency: 'EUR',
    marginCurrency: 'EUR'
  };

  const marketData = {
    symbol: 'GBPUSD',
    bid: 1.2500,
    ask: 1.2502,
    spread: 0.0002,
    volume: 1500,
    timeframe: 'H1',
    timestamp: new Date(),
    atrData: [
      { timeframe: 'M15', value: 0.0015, timestamp: new Date() },
      { timeframe: 'H1', value: 0.0020, timestamp: new Date() },
      { timeframe: 'H4', value: 0.0030, timestamp: new Date() }
    ],
    marketStructure: {
      supportLevels: [1.2400, 1.2350, 1.2300],
      resistanceLevels: [1.2550, 1.2600, 1.2650],
      trend: 'uptrend',
      volatility: 'medium'
    }
  };

  try {
    const result = await riskManagementService.calculateTradeRisk({
      symbol: 'GBPUSD',
      direction: 'SELL',
      entryPrice: 1.2500,
      accountInfo,
      symbolSpecs,
      marketData,
      riskAmount: 500, // €500 risk
      customParameters: {
        stopLossATRMultiplier: 1.5,
        takeProfitRiskRewardRatio: 2.5,
        usePartialExits: true
      }
    });

    console.log('Advanced Risk Management Result:', {
      symbol: result.symbol,
      direction: result.direction,
      entryPrice: result.entryPrice,
      stopLoss: {
        price: result.stopLoss.price,
        pips: result.stopLoss.pips,
        atrMultiplier: result.stopLoss.atrMultiplier,
        timeframe: result.stopLoss.timeframe,
        reasoning: result.stopLoss.reasoning
      },
      takeProfit: {
        primaryTP: result.takeProfit.primaryTP,
        averageRiskReward: result.takeProfit.averageRiskReward,
        partialExitStrategy: result.takeProfit.partialExitStrategy,
        levels: result.takeProfit.levels
      },
      positionSize: {
        lotSize: result.positionSize.lotSize,
        riskAmount: result.positionSize.riskAmount,
        maxLotSize: result.positionSize.maxLotSize,
        minLotSize: result.positionSize.minLotSize
      },
      riskMetrics: {
        riskPercentage: result.riskMetrics.riskPercentage,
        riskRewardRatio: result.riskMetrics.riskRewardRatio,
        expectedValue: result.riskMetrics.expectedValue,
        kellyCriterion: result.riskMetrics.kellyCriterion
      },
      validation: result.validation,
      recommendations: result.recommendations
    });

    // Check if trade is allowed
    const tradeAllowed = riskManagementService.isTradeAllowed(
      'GBPUSD',
      accountInfo,
      [],
      riskManagementService.updatePortfolioRisk([])
    );

    console.log('Trade Allowed:', tradeAllowed);

  } catch (error) {
    console.error('Advanced risk management failed:', error);
  }
}

// Example 3: MT5 Integration
export async function exampleMT5Integration() {
  console.log('=== MT5 Integration Example ===');

  const accountInfo = {
    balance: 50000,
    equity: 50800,
    margin: 8000,
    freeMargin: 42800,
    marginLevel: 635,
    currency: 'EUR',
    leverage: 100,
    hedgingAllowed: false
  };

  const symbolSpecs = {
    symbol: 'USDJPY',
    digits: 3,
    point: 0.001,
    tickSize: 0.001,
    tickValue: 9.2,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    contractSize: 100000,
    currency: 'USD',
    profitCurrency: 'EUR',
    marginCurrency: 'EUR'
  };

  const marketData = {
    symbol: 'USDJPY',
    bid: 110.500,
    ask: 110.505,
    spread: 0.005,
    volume: 2000,
    timeframe: 'H1',
    timestamp: new Date(),
    atrData: [
      { timeframe: 'M15', value: 0.150, timestamp: new Date() },
      { timeframe: 'H1', value: 0.200, timestamp: new Date() },
      { timeframe: 'H4', value: 0.300, timestamp: new Date() }
    ],
    marketStructure: {
      supportLevels: [110.200, 110.000, 109.800],
      resistanceLevels: [110.800, 111.000, 111.200],
      trend: 'downtrend',
      volatility: 'high'
    }
  };

  try {
    // Process trade signal with risk management
    const signal = {
      symbol: 'USDJPY',
      direction: 'SELL' as const,
      entryPrice: 110.500,
      confidence: 85,
      accountInfo,
      symbolSpecs,
      marketData,
      riskAmount: 750,
      aiAnalysis: {
        reasoning: 'Strong bearish momentum with high volume',
        marketBias: 'STRONG_SELL_BIAS',
        keyFactors: [
          'Technical indicators aligned for short entry',
          'High volatility increases profit potential',
          'Market structure shows clear downtrend'
        ]
      }
    };

    const processed = await mt5RiskIntegration.processTradeSignal(signal);

    console.log('MT5 Signal Processing Result:', {
      success: processed.success,
      error: processed.error,
      enhancedSignal: processed.enhancedSignal,
      riskResult: processed.riskResult
    });

    if (processed.success && processed.enhancedSignal) {
      // Generate MT5 trade request
      const tradeRequest = mt5RiskIntegration.generateTradeRequest(processed.enhancedSignal);
      console.log('MT5 Trade Request:', tradeRequest);

      // Validate trade request
      const validation = mt5RiskIntegration.validateTradeRequest(tradeRequest, accountInfo);
      console.log('Trade Request Validation:', validation);

      if (validation.isValid) {
        console.log('✅ Trade request is valid and ready for MT5 execution');
      } else {
        console.log('❌ Trade request validation failed:', validation.errors);
      }
    }

  } catch (error) {
    console.error('MT5 integration failed:', error);
  }
}

// Example 4: Risk Validation and Parameters
export function exampleRiskValidation() {
  console.log('=== Risk Validation Example ===');

  // Test different risk scenarios
  const testCases = [
    {
      name: 'Normal Risk',
      riskAmount: 200,
      accountBalance: 10000,
      stopLossPips: 20,
      maxRiskPercentage: 2.0
    },
    {
      name: 'High Risk',
      riskAmount: 500,
      accountBalance: 10000,
      stopLossPips: 15,
      maxRiskPercentage: 2.0
    },
    {
      name: 'Very High Risk',
      riskAmount: 1000,
      accountBalance: 10000,
      stopLossPips: 10,
      maxRiskPercentage: 2.0
    }
  ];

  testCases.forEach(testCase => {
    console.log(`\nTesting: ${testCase.name}`);
    const validation = validateRiskParameters(
      testCase.riskAmount,
      testCase.accountBalance,
      testCase.stopLossPips,
      testCase.maxRiskPercentage
    );

    console.log('Validation Result:', validation);

    // Calculate simple position size
    const positionSize = calculateSimplePositionSize(
      testCase.accountBalance,
      testCase.maxRiskPercentage,
      testCase.stopLossPips
    );

    console.log('Calculated Position Size:', positionSize, 'lots');
  });
}

// Example 5: Risk-Reward Analysis
export function exampleRiskRewardAnalysis() {
  console.log('=== Risk-Reward Analysis Example ===');

  const tradeSetups = [
    {
      name: 'Conservative Setup',
      entry: 1.1000,
      stopLoss: 1.0950,
      takeProfit: 1.1100,
      direction: 'BUY' as const
    },
    {
      name: 'Moderate Setup',
      entry: 1.1000,
      stopLoss: 1.0980,
      takeProfit: 1.1120,
      direction: 'BUY' as const
    },
    {
      name: 'Aggressive Setup',
      entry: 1.1000,
      stopLoss: 1.0990,
      takeProfit: 1.1080,
      direction: 'BUY' as const
    }
  ];

  tradeSetups.forEach(setup => {
    console.log(`\nAnalyzing: ${setup.name}`);

    const rrRatio = calculateRiskRewardRatio(
      setup.entry,
      setup.stopLoss,
      setup.takeProfit,
      setup.direction
    );

    const riskPips = Math.abs(setup.entry - setup.stopLoss) * 10000;
    const rewardPips = Math.abs(setup.takeProfit - setup.entry) * 10000;

    console.log({
      entry: setup.entry,
      stopLoss: setup.stopLoss,
      takeProfit: setup.takeProfit,
      riskPips: riskPips.toFixed(1),
      rewardPips: rewardPips.toFixed(1),
      riskRewardRatio: rrRatio.toFixed(2),
      winRateRequired: ((1 / (1 + rrRatio)) * 100).toFixed(1) + '%'
    });

    // Validate against minimum requirements
    const meetsMinimum = rrRatio >= DEFAULT_RISK_CONFIG.minRiskRewardRatio;
    console.log(`Meets minimum RR ratio (${DEFAULT_RISK_CONFIG.minRiskRewardRatio}:1): ${meetsMinimum}`);
  });
}

// Example 6: Portfolio Risk Management
export function examplePortfolioRiskManagement() {
  console.log('=== Portfolio Risk Management Example ===');

  // Simulate multiple positions
  const positions = [
    { symbol: 'EURUSD', volume: 0.5, riskAmount: 250, unrealizedPL: 150 },
    { symbol: 'GBPUSD', volume: 0.3, riskAmount: 150, unrealizedPL: -75 },
    { symbol: 'USDJPY', volume: 0.4, riskAmount: 200, unrealizedPL: 200 }
  ];

  const accountInfo = {
    balance: 50000,
    equity: 50275,
    margin: 12000,
    freeMargin: 38275,
    marginLevel: 419,
    currency: 'EUR',
    leverage: 100,
    hedgingAllowed: false
  };

  // Calculate portfolio risk
  const portfolioRisk = riskManagementService.updatePortfolioRisk(positions.map(pos => ({
    id: 'temp_' + pos.symbol,
    symbol: pos.symbol,
    type: 'BUY' as const,
    volume: pos.volume,
    openPrice: 1.0,
    currentPrice: 1.0,
    stopLoss: 1.0,
    takeProfit: 1.0,
    unrealizedPL: pos.unrealizedPL,
    realizedPL: 0,
    openTime: new Date(),
    closeTime: null,
    duration: 0,
    riskAmount: pos.riskAmount,
    maxRisk: pos.riskAmount,
    trailingStop: null,
    margin: 0,
    commission: 0,
    swap: 0,
    comment: ''
  })));

  console.log('Portfolio Risk Summary:', {
    totalExposure: portfolioRisk.totalExposure,
    totalRisk: portfolioRisk.totalRisk,
    portfolioHeat: portfolioRisk.portfolioHeat,
    riskBudgetUsed: portfolioRisk.riskBudgetUsed,
    dailyLoss: portfolioRisk.dailyLoss,
    maxDrawdown: portfolioRisk.maxDrawdown
  });

  // Check if new trade is allowed
  const newTradeAllowed = riskManagementService.isTradeAllowed(
    'AUDUSD',
    accountInfo,
    positions.map(pos => ({
      id: 'temp_' + pos.symbol,
      symbol: pos.symbol,
      type: 'BUY' as const,
      volume: pos.volume,
      openPrice: 1.0,
      currentPrice: 1.0,
      stopLoss: 1.0,
      takeProfit: 1.0,
      unrealizedPL: pos.unrealizedPL,
      realizedPL: 0,
      openTime: new Date(),
      closeTime: null,
      duration: 0,
      riskAmount: pos.riskAmount,
      maxRisk: pos.riskAmount,
      trailingStop: null,
      margin: 0,
      commission: 0,
      swap: 0,
      comment: ''
    })),
    portfolioRisk
  );

  console.log('New Trade Allowed:', newTradeAllowed);
}

// Example 7: Configuration Management
export function exampleConfigurationManagement() {
  console.log('=== Configuration Management Example ===');

  // Show default configurations
  console.log('Default Risk Config:', DEFAULT_RISK_CONFIG);
  console.log('Default ATR Config:', DEFAULT_ATR_CONFIG);

  // Update risk management settings
  const newSettings = {
    maxRiskPerTrade: 1.5, // More conservative
    riskRewardRatio: 2.5, // Higher RR target
    trailingStop: true, // Enable trailing stops
    alertsEnabled: true
  };

  riskManagementService.updateSettings(newSettings);
  console.log('Updated Settings:', riskManagementService.getSettings());

  // Check current alerts
  const alerts = riskManagementService.getAlerts();
  console.log('Current Alerts:', alerts.length);

  // Show statistics
  const stats = riskManagementService.getStatistics();
  console.log('Risk Management Statistics:', stats);
}

// Run all examples
export async function runAllRiskManagementExamples() {
  console.log('🚀 Running Risk Management Examples\n');

  try {
    await exampleBasicRiskCalculation();
    console.log('\n' + '='.repeat(50) + '\n');

    await exampleAdvancedRiskManagement();
    console.log('\n' + '='.repeat(50) + '\n');

    await exampleMT5Integration();
    console.log('\n' + '='.repeat(50) + '\n');

    exampleRiskValidation();
    console.log('\n' + '='.repeat(50) + '\n');

    exampleRiskRewardAnalysis();
    console.log('\n' + '='.repeat(50) + '\n');

    examplePortfolioRiskManagement();
    console.log('\n' + '='.repeat(50) + '\n');

    exampleConfigurationManagement();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('✅ All Risk Management Examples Completed Successfully!');

  } catch (error) {
    console.error('❌ Examples failed:', error);
  }
}

// Export individual examples
export {
  exampleBasicRiskCalculation,
  exampleAdvancedRiskManagement,
  exampleMT5Integration,
  exampleRiskValidation,
  exampleRiskRewardAnalysis,
  examplePortfolioRiskManagement,
  exampleConfigurationManagement
};