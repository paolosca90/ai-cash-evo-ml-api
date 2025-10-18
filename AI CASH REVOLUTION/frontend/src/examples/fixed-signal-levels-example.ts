/**
 * Esempio di correzione dei livelli di segnale
 *
 * Mostra come integrare il sistema di calcolo migliorato
 * per correggere i problemi identificati nel generate-ai-signals
 */

import ImprovedLevelCalculator from '../lib/trading/ImprovedLevelCalculator';

// Dati di esempio (simulati come dal generate-ai-signals)
const sampleMarketData = {
  symbol: 'EURUSD',
  currentPrice: 1.0850,      // Mid-price dal feed
  m5High: 1.0860,
  m5Low: 1.0840,
  m15High: 1.0870,
  m15Low: 1.0830,
  h1High: 1.0890,
  h1Low: 1.0810,
  atr: 0.0015,               // ATR calcolato dal sistema
  signalType: 'BUY' as const,
  confidence: 75
};

function demonstrateProblemComparison() {
  console.log('🔍 CONFRONTO: Sistema Attuale vs Sistema Migliorato\n');

  console.log('=== DATI INPUT ===');
  console.log(`Symbol: ${sampleMarketData.symbol}`);
  console.log(`Current Price: ${sampleMarketData.currentPrice}`);
  console.log(`Signal: ${sampleMarketData.signalType}`);
  console.log(`ATR: ${sampleMarketData.atr}`);
  console.log(`M5 Range: ${sampleMarketData.m5Low} - ${sampleMarketData.m5High}`);
  console.log('');

  // === SISTEMA ATTUALE (CON PROBLEMI) ===
  console.log('❌ SISTEMA ATTUALE (con problemi):');

  const currentSystemEntry = sampleMarketData.currentPrice; // ❌ Nessuno spread
  const currentSystemStop = sampleMarketData.m5Low - (sampleMarketData.atr * 0.4); // ❌ Troppo lontano
  const currentSystemTP = currentSystemEntry + (sampleMarketData.atr * 1.0); // ❌ Solo ATR
  const currentRR = Math.abs((currentSystemTP - currentSystemEntry) / (currentSystemEntry - currentSystemStop));

  console.log(`Entry: ${currentSystemEntry.toFixed(5)} (no spread consideration)`);
  console.log(`Stop Loss: ${currentSystemStop.toFixed(5)} (sotto M5 low - troppo lontano)`);
  console.log(`Take Profit: ${currentSystemTP.toFixed(5)} (ATR solo)`);
  console.log(`R:R: ${currentRR.toFixed(2)}:1`);
  console.log(`Stop Distance: ${((currentSystemEntry - currentSystemStop) * 10000).toFixed(1)} pips`);
  console.log('');

  // === SISTEMA MIGLIORATO ===
  console.log('✅ SISTEMA MIGLIORATO (con correzioni):');

  const improvedLevels = ImprovedLevelCalculator.calculateImprovedLevels(
    sampleMarketData.currentPrice,
    sampleMarketData.signalType,
    sampleMarketData.symbol,
    {
      m5High: sampleMarketData.m5High,
      m5Low: sampleMarketData.m5Low,
      m15High: sampleMarketData.m15High,
      m15Low: sampleMarketData.m15Low,
      h1High: sampleMarketData.h1High,
      h1Low: sampleMarketData.h1Low
    },
    sampleMarketData.atr,
    2.0 // Target RR
  );

  console.log(`Entry: ${improvedLevels.entryPrice.toFixed(5)} (con spread)`);
  console.log(`Stop Loss: ${improvedLevels.stopLoss.toFixed(5)} (smart structure)`);
  console.log(`Take Profit: ${improvedLevels.takeProfit.toFixed(5)} (structure/RR)`);
  console.log(`R:R: ${improvedLevels.riskReward.toFixed(2)}:1`);
  console.log(`Stop Distance: ${improvedLevels.riskMetrics.stopDistancePips.toFixed(1)} pips`);
  console.log(`Reward Potential: ${improvedLevels.riskMetrics.potentialRewardPips.toFixed(1)} pips`);
  console.log('');

  // === VALIDAZIONE ===
  console.log('📋 VALIDAZIONE RISULTATI:');
  const validation = ImprovedLevelCalculator.validateLevels(improvedLevels);

  if (validation.isValid) {
    console.log('✅ Livelli validati correttamente');
  } else {
    console.log('⚠️ Problemi nei livelli:');
    validation.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  console.log('');

  // === DETTAGLI RAGIONAMENTO ===
  console.log('🧠 RAGIONAMENTO SISTEMA MIGLIORATO:');
  improvedLevels.reasoning.forEach(reason => console.log(`   • ${reason}`));
  console.log('');

  // === METRICHE DI RISCHIO ===
  console.log('📊 METRICHE DI RISCHIO:');
  console.log(`   Stop Distance: ${improvedLevels.riskMetrics.stopDistancePercent.toFixed(3)}%`);
  console.log(`   Max Drawdown: ${improvedLevels.riskMetrics.maxDrawdownPercent.toFixed(3)}%`);
  console.log(`   Risk/Reward: ${improvedLevels.riskReward.toFixed(2)}:1`);
  console.log('');
}

function demonstrateMultipleScenarios() {
  console.log('🎯 SCENARII MULTIPLI - EUR/USD\n');

  const scenarios = [
    {
      price: 1.0850,
      signal: 'BUY' as const,
      m5Low: 1.0842,
      m5High: 1.0858,
      m15Low: 1.0830,
      m15High: 1.0870,
      atr: 0.0012
    },
    {
      price: 1.0850,
      signal: 'SELL' as const,
      m5Low: 1.0842,
      m5High: 1.0858,
      m15Low: 1.0830,
      m15High: 1.0870,
      atr: 0.0012
    },
    {
      price: 2000.50,
      signal: 'BUY' as const,
      symbol: 'XAUUSD',
      m5Low: 1998.00,
      m5High: 2001.50,
      m15Low: 1995.00,
      m15High: 2005.00,
      atr: 5.2
    }
  ];

  scenarios.forEach((scenario, index) => {
    console.log(`--- Scenario ${index + 1}: ${scenario.signal} ${scenario.symbol || 'EURUSD'} @ ${scenario.price} ---`);

    const levels = ImprovedLevelCalculator.calculateImprovedLevels(
      scenario.price,
      scenario.signal,
      scenario.symbol || 'EURUSD',
      {
        m5High: scenario.m5High,
        m5Low: scenario.m5Low,
        m15High: scenario.m15High,
        m15Low: scenario.m15Low,
        h1High: scenario.m15High * 1.01,
        h1Low: scenario.m15Low * 0.99
      },
      scenario.atr
    );

    console.log(`Entry: ${levels.entryPrice.toFixed(scenario.symbol?.includes('XAU') ? 2 : 5)}`);
    console.log(`SL: ${levels.stopLoss.toFixed(scenario.symbol?.includes('XAU') ? 2 : 5)} (${levels.riskMetrics.stopDistancePips.toFixed(1)} pips)`);
    console.log(`TP: ${levels.takeProfit.toFixed(scenario.symbol?.includes('XAU') ? 2 : 5)} (${levels.riskMetrics.potentialRewardPips.toFixed(1)} pips)`);
    console.log(`R:R: ${levels.riskReward.toFixed(2)}:1`);

    const validation = ImprovedLevelCalculator.validateLevels(levels);
    console.log(`Validazione: ${validation.isValid ? '✅ OK' : '❌ Issues'}`);

    if (!validation.isValid) {
      console.log(`Warnings: ${validation.warnings.join(', ')}`);
    }
    console.log('');
  });
}

function demonstrateIntegrationExample() {
  console.log('🔧 ESEMPIO DI INTEGRAZIONE\n');

  // Esempio di come modificare il generate-ai-signals
  console.log('Come integrare nel generate-ai-signals/index.ts:');
  console.log('');

  console.log('// SOSTITUIRE IL CODICE ATTUALE:');
  console.log('// Vecchio codice (righe ~1673-1693):');
  console.log('```typescript');
  console.log('if (signal === "BUY") {');
  console.log('  stopLoss = m5Low - stopBuffer;  // ❌ PROBLEMA');
  console.log('  takeProfit = price + tpBuffer; // ❌ PROBLEMA');
  console.log('  entry_price: price,            // ❌ PROBLEMA');
  console.log('}');
  console.log('```');
  console.log('');

  console.log('// NUOVO CODICE CORRETTO:');
  console.log('```typescript');
  console.log('// 1. Calcola livelli corretti');
  console.log('const levels = ImprovedLevelCalculator.calculateImprovedLevels(');
  console.log('  marketData.price,');
  console.log('  signal,');
  console.log('  symbol,');
  console.log('  { m5High, m5Low, m15High, m15Low, h1High, h1Low },');
  console.log('  atr,');
  console.log('  2.0 // Target RR');
  console.log(');');
  console.log('');
  console.log('// 2. Validazione');
  console.log('const validation = ImprovedLevelCalculator.validateLevels(levels);');
  console.log('if (!validation.isValid) {');
  console.log('  console.warn("Level calculation issues:", validation.warnings);');
  console.log('  // Potrebbe generare HOLD invece di BUY/SELL');
  console.log('}');
  console.log('');
  console.log('// 3. Usa i livelli corretti');
  console.log('return {');
  console.log('  signal,');
  console.log('  entry_price: levels.entryPrice,     // ✅ Con spread');
  console.log('  stopLoss: levels.stopLoss,          // ✅ Smart structure');
  console.log('  takeProfit: levels.takeProfit,      // ✅ Structure/RR based');
  console.log('  riskReward: levels.riskReward,');
  console.log('  reasoning: levels.reasoning,');
  console.log('  riskMetrics: levels.riskMetrics');
  console.log('};');
  console.log('```');
  console.log('');

  console.log('BENEFICI DEL NUOVO SISTEMA:');
  console.log('✅ Entry prices realistici con spread');
  console.log('✅ Stop loss basati su market structure');
  console.log('✅ Take profit considerando resistenze/supporti');
  console.log('✅ Risk/Reward ottimizzato e validato');
  console.log('✅ Metriche di rischio complete');
  console.log('✅ Protezione da stop hunting');
  console.log('✅ Validazione automatica dei livelli');
}

// Esegui le demo
if (require.main === module) {
  demonstrateProblemComparison();
  console.log('='.repeat(80));
  console.log('');

  demonstrateMultipleScenarios();
  console.log('='.repeat(80));
  console.log('');

  demonstrateIntegrationExample();
}

export {
  demonstrateProblemComparison,
  demonstrateMultipleScenarios,
  demonstrateIntegrationExample
};