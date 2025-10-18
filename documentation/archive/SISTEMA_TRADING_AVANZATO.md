# 🚀 AI Cash Evolution - Sistema di Trading Avanzato

## 📋 Indice

1. [Panoramica del Sistema](#panoramica-del-sistema)
2. [Architettura Generale](#architettura-generale)
3. [Componenti Principali](#componenti-principali)
4. [Flusso Operativo](#flusso-operativo)
5. [Integrazione con MT5](#integrazione-con-mt5)
6. [Machine Learning e AI](#machine-learning-e-ai)
7. [Risk Management](#risk-management)
8. [Performance e Monitoraggio](#performance-e-monitoraggio)
9. [Installazione e Configurazione](#installazione-e-configurazione)
10. [Utilizzo](#utilizzo)

---

## 🎯 Panoramica del Sistema

AI Cash Evolution è una piattaforma di trading automatizzato di livello istituzionale che combina:

- **Intelligenza Artificiale Avanzata**: Modelli PPO/CPPO con continuous learning
- **Analisi Multi-Fattore**: Smart Money Concepts, LLM sentiment, indicatori tecnici
- **Risk Management Professionale**: Position sizing dinamico e protezione del capitale
- **Integrazione MT5**: Comunicazione diretta con MetaTrader 5
- **Backtesting Completo**: Analisi FinRL-style con metriche quantitative
- **Miglioramento Continuo**: Retraining automatico settimanale dei modelli

---

## 🏗️ Architettura Generale

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   MT5 EA        │
│   (React/Vite)  │◄──►│  (Database/     │◄──►│   (Trading)      │
│                 │    │   Functions)    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ AI Analysis    │    │ Feature         │    │ Risk Management │
│ Engine         │    │ Engineering    │    │ System          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Stack Tecnologico

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL), Edge Functions
- **AI/ML**: TensorFlow.js, PPO/CPPO, DeepSeek-V3 LLM
- **Trading**: MetaTrader 5, TradingView Integration
- **Architettura**: Microservizi, Event-Driven, Serverless

---

## 🔧 Componenti Principali

### 1. 🧠 Smart Money Concepts Advanced Analyzer
**File**: `supabase/functions/smart-money-concepts-analyzer/index.ts`

Detects patterns istituzionali:
- **Order Blocks**: Zone di acquisto/vendita istituzionale
- **Fair Value Gaps (FVG)**: Gap di valore equo tra 3 candele
- **Liquidity Pools**: Aree di concentrazione di stop loss
- **Multi-Timeframe Analysis**: M1, M5, M15, H1 per confluencza

```typescript
// Esempio di utilizzo
const smartMoneyAnalysis = await analyzeSmartMoneyConcepts('EURUSD', {
  orderBlocks: true,
  fvgDetection: true,
  liquidityPools: true,
  timeframe: 'M15'
});
```

### 2. 🤖 LLM Sentiment & Risk Analysis
**File**: `supabase/functions/llm-sentiment/index.ts`

Analisi di sentiment basata su DeepSeek-V3:
- **News Analysis**: Processa fino a 5 articoli recenti
- **Risk Assessment**: Valutazione del rischio 1-5
- **Sentiment Scoring**: Punteggio di sentiment 1-5
- **Reasoning**: Spiegazione dettagliata delle decisioni

```typescript
const sentimentAnalysis = await analyzeLLMSentiment({
  articles: newsArticles,
  symbol: 'BTCUSD',
  context: 'market_analysis'
});
// Returns: { sentiment: 4, risk: 3, reasoning: "...", confidence: 0.85 }
```

### 3. 📊 Unified Feature Engineering
**File**: `src/lib/feature-engineering/UnifiedFeatureEngineer.ts`

Combina 29 feature in un unico vettore ML:
- **Indicatori Tecnici** (8): RSI, MACD, ATR, Bollinger Bands
- **Session Info** (4): Londra, NY, Asia, overlap
- **Smart Money** (4): Order blocks, FVG, liquidity pools
- **LLM Signals** (4): Sentiment, rischio, confidence
- **Market Regime** (4): Trend, volatilità, momentum
- **Market Context** (5): Prezzo, volume, sessione

```typescript
const featureVector = await unifiedFeatureEngineer.generateFeatureVector({
  marketData,
  technicalIndicators,
  sessionInfo,
  smartMoneyConcepts,
  llmSignals,
  marketRegime
});
```

### 4. 🎯 Market Regime Detection & Agent Selection
**File**: `src/lib/AdvancedMLTradingSystem.ts`

Rileva le condizioni di mercato e seleziona l'agente ottimale:
- **Trend Detection**: rialzista/ribassista/sideways
- **Volatility Regime**: LOW/MEDIUM/HIGH/EXTREME
- **Agent Selection**: PPO vs CPPO basato sulle condizioni
- **Multi-Timeframe**: Analisi da M1 a D1

```typescript
const marketRegime = await detectMarketRegime('EURUSD');
const selectedAgent = await selectOptimalAgent(marketRegime);
// Returns: { regime: 'BULLISH_VOLATILE', agent: 'CPPO', confidence: 0.92 }
```

### 5. 🧮 Real RL Inference System
**File**: `src/lib/rl-trading/RLTradingService.ts`

Inference con modelli PPO/CPPO pretrained:
- **Model Loading**: Caricamento da Supabase Storage
- **Real-time Prediction**: <100ms latency
- **Uncertainty Quantification**: Stima dell'incertezza
- **Action Space**: { direction, intensity, confidence }

```typescript
const rlPrediction = await rlTradingService.predictTradingAction({
  featureVector,
  marketRegime,
  riskParameters
});
// Returns: { direction: 'BUY', intensity: 1.2, confidence: 0.88 }
```

### 6. 🎛️ Signal Modulation System
**File**: `src/lib/signal-modulation/SignalModulationService.ts`

Modula i segnali basandosi su fattori multipli:
- **Sentiment Multiplier**: `(sentiment-3)*0.1`
- **Risk Penalty**: `risk>3?-0.15:0`
- **Confidence Bonus**: `confidence>70?0.05:0`
- **Final Intensity**: Clampato a [0.1, 2.0]

```typescript
const modulatedSignal = await modulateSignal(baseSignal, {
  sentiment: 4,
  risk: 2,
  confidence: 85
});
// Applica le formule esatte per la modulazione
```

### 7. 🛡️ Risk Management System
**File**: `src/lib/risk-management/RiskManagementService.ts`

Risk management di livello professionale:
- **Stop Loss**: Basato su ATR multi-timeframe
- **Take Profit**: Ratio rischio/rendimento 1.5:1
- **Position Sizing**: Kelly Criterion con limiti
- **Portfolio Protection**: Max 2% rischio per trade

```typescript
const riskParams = await calculateRiskParameters({
  symbol: 'EURUSD',
  accountSize: 10000,
  atr: 0.0012,
  marketRegime: 'VOLATILE'
});
// Returns: { stopLoss: 1.0800, takeProfit: 1.1200, lotSize: 0.1 }
```

### 8. 🔄 MT5 Integration System
**File**: `src/lib/mt5-integration/MT5Integration.ts`

Comunicazione bidirezionale con MT5:
- **Command Structure**: { symbol, action, lot, stopLoss, takeProfit }
- **Callbacks**: Riceve esecuzioni e PnL reali
- **Error Handling**: Retry logic e circuit breaker
- **Position Tracking**: Monitoraggio posizioni in tempo reale

```typescript
const tradeResult = await mt5Integration.executeTrade({
  symbol: 'EURUSD',
  action: 'BUY',
  lot: 0.1,
  stopLoss: 1.0800,
  takeProfit: 1.1200,
  comment: 'AI_Signal_12345'
});
```

### 9. 📈 Enhanced Trade Logging
**File**: `src/integrations/enhanced-trade-logging.ts`

Logging completo con metadata avanzati:
- **Signal Chain Tracking**: Da generazione a esecuzione
- **Market Context**: Regime e condizioni al momento del trade
- **Performance Metrics**: Sharpe ratio, drawdown, win rate
- **Agent Performance**: Tracciamento performance agenti RL

```typescript
await logEnhancedTrade({
  tradeData,
  signalMetadata,
  marketContext,
  executionDetails,
  performanceMetrics
});
```

### 10. 📊 Backtesting Framework
**File**: `src/lib/backtesting/BacktestEngine.ts`

Backtesting stile FinRL con metriche avanzate:
- **Walk-Forward Validation**: Rolling window validation
- **Performance Metrics**: Sharpe, CVaR, Rachev ratio
- **Strategy Comparison**: Analisi multi-strategia
- **Market Regime Analysis**: Performance per regime

```typescript
const backtestResult = await runBacktest(strategy, {
  symbols: ['EURUSD', 'GBPUSD'],
  timeframe: 'H1',
  initialCapital: 10000,
  startDate: '2022-01-01',
  endDate: '2023-12-31'
});
```

### 11. 🔄 Continuous Retraining System
**File**: `src/lib/retraining/RetrainingService.ts`

Miglioramento continuo dei modelli:
- **Weekly Batch Job**: Processa i trade della settimana
- **Model Retraining**: Aggiorna PPO/CPPO con nuovi dati
- **A/B Testing**: Testa nuovi modelli vs esistenti
- **Automated Deployment**: Deploy automatico con rollback

```typescript
await runWeeklyRetraining({
  lookbackDays: 7,
  retrainPPO: true,
  retrainCPPO: true,
  abTestThreshold: 0.05
});
```

---

## 🔄 Flusso Operativo

### 1. Generazione Segnale
```
Market Data → Feature Engineering → Market Regime Detection → RL Inference → Signal Modulation
```

### 2. Risk Management
```
Signal → Risk Parameters → Position Sizing → MT5 Execution → Trade Logging
```

### 3. Monitoraggio e Miglioramento
```
Trade Performance → Data Collection → Model Retraining → Performance Analysis
```

---

## 💹 Integrazione con MT5

### Setup EA
1. **Compilazione EA**: Usare `AI_Cash_Revolution_EA.mq5`
2. **Configurazione**: Impostare URL del webhook e API key
3. **Testing**: Verificare connessione con trade demo

### Comandi Supportati
- **Market Orders**: BUY/SELL istantanei
- **Pending Orders**: LIMIT/STOP con scadenza
- **Position Management**: Modify/Close parziale
- **Risk Management**: Stop loss e take profit dinamici

### Callback System
- **Execution Confirmations**: Prezzi di esecuzione reali
- **Position Updates**: Aggiornamenti posizioni in tempo reale
- **Error Notifications**: Notifiche errori esecuzione
- **Performance Data**: PnL e statistiche performance

---

## 🤖 Machine Learning e AI

### Architettura RL
- **PPO (Proximal Policy Optimization)**: Ottimale per trend stabili
- **CPPO (Constrained PPO)**: Per mercati volatili con risk constraints
- **State Representation**: 29-dimensional feature vectors
- **Action Space**: Direzione, intensità, confidence

### Training Process
1. **Data Collection**: Trade storici con feature complete
2. **Feature Engineering**: Normalizzazione e selezione feature
3. **Model Training**: PPO/CPPO con reward shaping
4. **Validation**: Out-of-sample testing con walk-forward
5. **Deployment**: A/B testing con rollback capability

### Continuous Improvement
- **Weekly Retraining**: Aggiornamento modelli con nuovi dati
- **Performance Monitoring**: Tracciamento metriche in tempo reale
- **Model Selection**: Automatic selection basato su performance
- **Version Control**: Gestione versioni con rollback capability

---

## 🛡️ Risk Management

### Position Sizing
- **Kelly Criterion**: Sizing ottimale basato su win rate
- **Risk Limits**: Max 2% per trade, 6% portfolio totale
- **Correlation Analysis**: Considera correlazione tra posizioni
- **Account Scaling**: Adatta sizing al bilancio account

### Stop Loss & Take Profit
- **ATR-Based**: Stop loss basato su volatilità attuale
- **Multi-Timeframe**: Conferma su M15, H1, H4
- **Structure-Based**: Considera supporti/resistenze
- **Dynamic Adjustment**: Adatta basato su condizioni mercato

### Portfolio Protection
- **Maximum Drawdown**: Protection a 15% drawdown massimo
- **Daily Limits**: Limite perdite giornaliere
- **Correlation Limits**: Limite esposizione correlata
- **Volatility Adjustments**: Adatta sizing basato su volatilità

---

## 📊 Performance e Monitoraggio

### Metriche Chiave
- **Sharpe Ratio**: Risk-adjusted returns
- **CVaR**: Conditional Value at Risk (95%)
- **Rachev Ratio**: Asimmetria upside/downside
- **Win Rate**: Percentuale trade profitable
- **Profit Factor**: Ratio gross profits/gross losses

### Dashboard di Monitoraggio
- **Real-time Performance**: Metriche in tempo reale
- **System Health**: Status componenti sistema
- **Agent Performance**: Performance agenti RL
- **Risk Metrics**: Exposure e drawdown monitoring
- **Alert System**: Notifiche soglie critiche

### Reporting
- **Daily Reports**: Riepilogo performance giornaliera
- **Weekly Analysis**: Analisi settimanale e insights
- **Monthly Performance**: Report performance mensile
- **Strategy Analytics**: Analisi performance strategie

---

## ⚙️ Installazione e Configurazione

### Prerequisiti
- Node.js 18+
- Supabase account
- MetaTrader 5
- DeepInfra API key

### Setup Database
```bash
# Applica le migration
cd supabase
supabase db push
```

### Configurazione Variabili d'Ambiente
```bash
# Supabase
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key

# API Keys
DEEPINFRA_API_KEY=your_deepinfra_key
NEWS_API_KEY=your_news_key

# MT5 Configuration
MT5_EA_ENDPOINT=your_ea_url
MT5_API_KEY=your_mt5_key
```

### Deploy Functions
```bash
# Deploy tutte le funzioni
supabase functions deploy --all
```

---

## 🎮 Utilizzo

### Generazione Segnali
```typescript
import { generateTradingSignal } from '@/lib/trading-system';

const signal = await generateTradingSignal({
  symbol: 'EURUSD',
  timeframe: 'M15',
  useRL: true,
  includeRiskManagement: true
});
```

### Backtesting
```typescript
import { runBacktest } from '@/lib/backtesting';

const result = await runBacktest(strategy, {
  initialCapital: 10000,
  startDate: '2023-01-01',
  endDate: '2024-01-01'
});
```

### Monitoraggio Performance
```typescript
import { getPerformanceMetrics } from '@/lib/analytics';

const metrics = await getPerformanceMetrics({
  timeframe: '1M',
  includeRiskMetrics: true
});
```

### Controllo Manuale MT5
```typescript
import { mt5Integration } from '@/lib/mt5-integration';

// Esegui trade manuale
const result = await mt5Integration.executeTrade({
  symbol: 'EURUSD',
  action: 'BUY',
  lot: 0.1,
  stopLoss: 1.0800,
  takeProfit: 1.1200
});
```

---

## 🔧 Manutenzione e Troubleshooting

### Issues Comuni
- **Connessione MT5**: Verificare firewall e configurazione EA
- **Performance Modelli**: Monitorare metriche e ritrainare se necessario
- **Database Issues**: Controllare connection pool e query optimization
- **API Limits**: Monitorare utilizzo API e implementare rate limiting

### Backup e Recovery
- **Database Backup**: Backup giornaliero automatico
- **Model Versioning**: Versionamento automatico modelli
- **Configuration Backup**: Backup configurazioni critiche
- **Recovery Procedures**: Procedure di recovery documentate

### Scaling
- **Horizontal Scaling**: Load balancing su multiple istanze
- **Database Scaling**: Read replicas e connection pooling
- **Cache Strategy**: Redis caching per feature comuni
- **Queue System**: Message queue per operazioni asincrone

---

## 📞 Supporto e Contatti

Per supporto tecnico:
- **GitHub Issues**: Segnalare bug e richieste feature
- **Documentation**: Consultare la documentazione dettagliata
- **Community**: Partecipare alle discussioni della community
- **Email Support**: supporto@ai-cash-evolution.com

---

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT. Vedere il file LICENSE per i dettagli.

---

*Ultimo aggiornamento: Settembre 2024*