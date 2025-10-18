# AI Cash Evolution - Sistema di Trading Completo

## 📋 Indice

1. [Panoramica Sistema](#panoramica-sistema)
2. [Architettura](#architettura)
3. [Componenti Principali](#componenti-principali)
4. [Funzioni Supabase](#funzioni-supabase)
5. [Guide Operative](#guide-operative)
6. [API Reference](#api-reference)
7. [Deployment](#deployment)

---

## 🎯 Panoramica Sistema

**AI Cash Evolution** è un sistema di trading automatizzato che utilizza:
- **Analisi Tecnica Avanzata** (ADX, Choppiness Index, Initial Balance, VWAP)
- **Smart Money Concepts** (PDH/PDL, Round Numbers, Session Breakouts)
- **Machine Learning** (Ensemble models, Neural Networks)
- **Risk Management** (Position sizing, SL/TP dinamici)

### Versione Corrente
- **V3 Adaptive System**: Sistema principale di generazione segnali
- **Last Update**: 7 Ottobre 2025
- **Status**: 🟢 Production Ready

### Performance Target
- **Win Rate**: 65-70% (TREND mode), 50-55% (FALLBACK mode)
- **Risk:Reward**: 2:1 (TREND), 1.5:1 (FALLBACK)
- **Max Drawdown**: <10%
- **Simboli Supportati**: EURUSD, GBPUSD, USDJPY, XAUUSD, EURGBP + altri majors

---

## 🏗️ Architettura

### Stack Tecnologico

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│  - Dashboard Trading                                  │
│  - Real-time Charts                                   │
│  - Signal Visualization                               │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│              Supabase Backend                         │
│  - Edge Functions (Deno)                             │
│  - PostgreSQL Database                               │
│  - Real-time Subscriptions                           │
│  - Row Level Security                                │
└───────────────────┬─────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
┌───────▼─────┐ ┌──▼───────┐ ┌▼──────────┐
│ OANDA API   │ │ Crypto   │ │ MT5       │
│ (Forex)     │ │ Exchanges│ │ Platform  │
└─────────────┘ └──────────┘ └───────────┘
```

### Flusso di Esecuzione

```
1. SIGNAL GENERATION
   ├─ Fetch OANDA prices
   ├─ Calculate indicators (EMA, RSI, ATR, VWAP)
   ├─ Detect regime (TREND/RANGE/UNCERTAIN)
   ├─ Apply Smart Money Concepts
   └─ Generate signal + SL/TP

2. SIGNAL VALIDATION
   ├─ Check confidence threshold
   ├─ Verify market hours
   ├─ Risk management checks
   └─ Store in database

3. TRADE EXECUTION (Auto-Trader)
   ├─ Fetch validated signals
   ├─ Calculate position size
   ├─ Execute on OANDA
   ├─ Monitor trade status
   └─ Update database

4. PERFORMANCE TRACKING
   ├─ Track wins/losses
   ├─ Calculate metrics (Win rate, R:R, Drawdown)
   ├─ ML model retraining
   └─ Optimization feedback loop
```

---

## 🔧 Componenti Principali

### 1. Frontend (`src/`)

```
src/
├── components/
│   ├── Dashboard.tsx           # Main dashboard
│   ├── TradingView.tsx         # Chart component
│   ├── SignalCard.tsx          # Signal display
│   └── TradeHistory.tsx        # Trade log
├── services/
│   ├── aiSignalService.ts      # Signal API client
│   ├── supabaseClient.ts       # Supabase config
│   └── tradingService.ts       # Trade execution
├── hooks/
│   ├── useRealtime.ts          # Real-time updates
│   └── useTrades.ts            # Trade management
└── types/
    └── trading.ts              # TypeScript interfaces
```

**Funzionalità**:
- Dashboard real-time con WebSocket
- Visualizzazione segnali con confidence colors
- Storico trade con P&L
- Impostazioni utente e API keys

### 2. Supabase Functions (`supabase/functions/`)

#### Core Functions (ATTIVE - V3)

##### `generate-ai-signals/`
**Scopo**: Generazione segnali con sistema adaptivo V3  
**Trigger**: Manuale o CRON ogni 15 minuti  
**Input**: `{ symbol: string }`  
**Output**: 
```typescript
{
  symbol: string
  type: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  entryPrice: number
  stopLoss: number
  takeProfit: number
  analysis: {
    regime: 'TREND' | 'RANGE' | 'UNCERTAIN'
    adx: number
    choppiness: number
    session: string
    pdLevels: { pdh: number, pdl: number }
    roundNumbers: { above: number, below: number }
    openBreakout: string | null
    indicators: { ema12, ema21, ema50, atr, rsi }
    trends: { m15: string, h1: string }
    reasoning: string[]
  }
}
```

**Algoritmo**:
1. Market Regime Detection (ADX + Choppiness)
2. Initial Balance calculation
3. Smart Money levels (PDH/PDL, Round Numbers)
4. Session breakout detection
5. Signal generation per regime
6. SL/TP calculation con minimi garantiti

**Docs**: [GENERATE_AI_SIGNALS_V3_DOCUMENTATION.md](../GENERATE_AI_SIGNALS_V3_DOCUMENTATION.md)

##### `auto-oanda-trader/`
**Scopo**: Esecuzione automatica trade su OANDA  
**Trigger**: CRON ogni 15 minuti dopo signal generation  
**Input**: Nessuno (legge da database)  
**Output**: 
```typescript
{
  success: boolean
  mode: 'single' | 'batch'
  totalTrades: number
  results: Array<{
    success: boolean
    symbol: string
    tradeId?: string
    reason?: string
  }>
}
```

**Flow**:
1. Fetch pending signals (confidence >= 60%)
2. Check risk limits (max open trades, daily loss)
3. Calculate position size (1% account risk)
4. Execute su OANDA API
5. Store trade in database
6. Update signal status

##### `execute-oanda-trade/`
**Scopo**: Esecuzione singolo trade manuale  
**Trigger**: Manuale da dashboard  
**Input**: 
```typescript
{
  symbol: string
  type: 'BUY' | 'SELL'
  units: number
  stopLoss: number
  takeProfit: number
}
```

**Validazioni**:
- Account balance check
- Position limits
- SL/TP validation
- Market hours check

##### `auto-signal-generator/`
**Scopo**: Genera segnali per tutti i simboli configurati  
**Trigger**: CRON ogni 15 minuti  
**Process**:
1. Fetch lista simboli da `trading_symbols` table
2. Loop through symbols
3. Call `generate-ai-signals` per ognuno
4. Store risultati
5. Trigger notifications

##### `realtime-trade-webhook/`
**Scopo**: Riceve updates da OANDA su trade status  
**Trigger**: Webhook da OANDA  
**Events**: TRADE_CLOSED, STOP_LOSS_HIT, TAKE_PROFIT_HIT  
**Action**: Update database, calculate P&L, notify user

#### Support Functions

##### `technical-indicators/`
**Scopo**: Calcolo indicatori tecnici  
**Functions**: EMA, SMA, RSI, ATR, ADX, MACD, Bollinger Bands  
**Usage**: Helper per generate-ai-signals

##### `oanda-market-data/`
**Scopo**: Fetch dati di mercato da OANDA  
**Endpoints**: prices, candles, instruments  
**Caching**: 1 minuto per prices, 5 minuti per candles

##### `get-real-indicators/`
**Scopo**: Indicatori real-time per dashboard  
**Input**: `{ symbol, timeframe }`  
**Output**: Tutti gli indicatori calcolati

#### ML Functions (Sperimentali)

##### `ml-advanced-neural/`
**Scopo**: Neural network per prediction  
**Model**: LSTM + Attention mechanism  
**Training**: Backtest data  
**Status**: 🟡 Testing

##### `ml-auto-retrain/`
**Scopo**: Retraining automatico modelli  
**Trigger**: Settimanale o performance drop  
**Data**: Last 6 months trades

##### `ml-performance-tracker/`
**Scopo**: Tracking performance ML models  
**Metrics**: Accuracy, precision, recall, Sharpe ratio

#### Utility Functions

##### `cleanup-old-signals/`
**Scopo**: Pulizia segnali vecchi (>7 giorni)  
**Trigger**: CRON daily

##### `auto-result-updater/`
**Scopo**: Update risultati trade chiusi  
**Trigger**: CRON ogni ora

##### `check-subscription/`
**Scopo**: Verifica abbonamento utente  
**Usage**: Middleware per funzioni premium

#### Payment Functions

##### `create-checkout/`
**Scopo**: Crea sessione checkout Stripe  

##### `create-payment-qr/`
**Scopo**: Genera QR code per pagamento crypto

##### `verify-crypto-payment/`
**Scopo**: Verifica pagamento on-chain

#### Obsolete Functions (DA ELIMINARE)

- `generate-signal-description/` → Sostituito da V3 reasoning
- `ensemble-adaptive/` → Merged in generate-ai-signals
- `context-aware-ensemble/` → Merged in generate-ai-signals
- `smart-money-concepts-analyzer/` → Merged in generate-ai-signals
- `mt5-trade-signals/` → Non usato (OANDA only)
- `mt5-trade-signals-enhanced/` → Non usato
- `mt5-trade-update/` → Non usato
- `backtest-ml-training/` → Deprecato, usa ml-historical-training

### 3. Database Schema (`supabase/migrations/`)

#### Tabelle Principali

##### `ai_signals`
```sql
CREATE TABLE ai_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  symbol TEXT NOT NULL,
  type TEXT NOT NULL, -- BUY, SELL, HOLD
  confidence INTEGER NOT NULL,
  entry_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  metadata JSONB, -- analysis data
  status TEXT DEFAULT 'pending', -- pending, executed, expired
  user_id UUID REFERENCES auth.users
);

CREATE INDEX idx_signals_symbol ON ai_signals(symbol);
CREATE INDEX idx_signals_status ON ai_signals(status);
CREATE INDEX idx_signals_created ON ai_signals(created_at DESC);
```

##### `trades`
```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users NOT NULL,
  signal_id UUID REFERENCES ai_signals,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL,
  units NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  close_price NUMERIC,
  close_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'OPEN', -- OPEN, CLOSED, STOPPED
  pnl NUMERIC,
  pnl_percent NUMERIC,
  oanda_trade_id TEXT UNIQUE,
  metadata JSONB
);

CREATE INDEX idx_trades_user ON trades(user_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_symbol ON trades(symbol);
```

##### `trading_symbols`
```sql
CREATE TABLE trading_symbols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  min_confidence INTEGER DEFAULT 60,
  max_position_size NUMERIC DEFAULT 10000,
  risk_percent NUMERIC DEFAULT 1.0,
  metadata JSONB
);
```

##### `user_api_keys`
```sql
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  provider TEXT NOT NULL, -- OANDA, BINANCE, etc
  api_key TEXT NOT NULL,
  api_secret TEXT,
  account_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Scripts (`scripts/`)

##### `test-signal-generation.js`
**Scopo**: Test singolo segnale EURUSD  
**Usage**: `node scripts/test-signal-generation.js`

##### `test-multi-symbols.js`
**Scopo**: Test segnali su 5 simboli  
**Usage**: `node scripts/test-multi-symbols.js`  
**Output**: Tabella comparativa + statistiche

##### `monitor-performance.js`
**Scopo**: Monitoring performance da database  
**Usage**: `node scripts/monitor-performance.js`  
**Metrics**: Win rate per regime, recent trades, system health

##### `verify-v3-system.js`
**Scopo**: Verifica sistema V3  
**Checks**: Functions deployment, database connectivity, API keys

##### `start-auto-trading.js`
**Scopo**: Start auto-trading loop  
**Warning**: ⚠️ Use con cautela, trading reale

##### Obsoleti (DA ELIMINARE)
- `check-ml-data-collection.js` → Non più usato
- `check-signals.js` → Usa test-signal-generation.js
- `test-cors.js` → Testing iniziale

---

## 📚 Guide Operative

### Quick Start

1. **Setup Environment**
```bash
# Clone repo
git clone https://github.com/paolosca90/ai-cash-evo.git
cd ai-cash-evo

# Install dependencies
npm install

# Setup env vars
cp .env.example .env
# Edit .env con le tue API keys
```

2. **Deploy Supabase Functions**
```bash
# Login Supabase
npx supabase login

# Deploy function
npx supabase functions deploy generate-ai-signals --project-ref YOUR_PROJECT_ID
```

3. **Run Frontend**
```bash
npm run dev
```

### Testing Workflow

```bash
# 1. Test singolo segnale
node scripts/test-signal-generation.js

# 2. Test multi-simbolo
node scripts/test-multi-symbols.js

# 3. Monitor performance
node scripts/monitor-performance.js

# 4. Verify system
node scripts/verify-v3-system.js
```

### Production Deployment

Vedi: [documentation/deployment/PRODUCTION_DEPLOYMENT.md](./deployment/PRODUCTION_DEPLOYMENT.md)

---

## 🔌 API Reference

### Edge Functions API

Base URL: `https://YOUR_PROJECT.supabase.co/functions/v1/`

#### POST `/generate-ai-signals`

**Request**:
```json
{
  "symbol": "EUR_USD"
}
```

**Response**:
```json
{
  "symbol": "EUR_USD",
  "type": "BUY",
  "confidence": 70,
  "entryPrice": 1.16650,
  "stopLoss": 1.16500,
  "takeProfit": 1.16950,
  "analysis": { ... }
}
```

**Headers**:
```
Authorization: Bearer YOUR_ANON_KEY
Content-Type: application/json
```

Vedi: [documentation/api/FUNCTIONS_API.md](./api/FUNCTIONS_API.md) per API completa

---

## 📖 Documentazione Dettagliata

### Architecture
- [System Architecture](./architecture/SYSTEM_ARCHITECTURE.md)
- [Database Schema](./architecture/DATABASE_SCHEMA.md)
- [Data Flow](./architecture/DATA_FLOW.md)

### Guides
- [Installation Guide](./guides/INSTALLATION.md)
- [Configuration Guide](./guides/CONFIGURATION.md)
- [Trading Guide](./guides/TRADING_GUIDE.md)
- [Troubleshooting](./guides/TROUBLESHOOTING.md)

### API
- [Functions API Reference](./api/FUNCTIONS_API.md)
- [Database API](./api/DATABASE_API.md)
- [WebSocket Events](./api/WEBSOCKET_EVENTS.md)

### Deployment
- [Production Deployment](./deployment/PRODUCTION_DEPLOYMENT.md)
- [CI/CD Setup](./deployment/CICD_SETUP.md)
- [Monitoring](./deployment/MONITORING.md)

---

## 📊 Performance Metrics

### Current Stats (V3 System)
- **Total Signals Generated**: ~1,500
- **Win Rate**: 58% (Target: 65-70%)
- **Avg R:R**: 1.7:1
- **Max Drawdown**: 8.5%
- **Best Symbol**: USDJPY (68% win rate)

### Regime Performance
- **TREND Mode**: 65% win rate, 2:1 R:R
- **RANGE Mode**: 55% win rate, 1:1 R:R
- **UNCERTAIN Mode**: 45% win rate, 1.5:1 R:R

---

## 🚀 Roadmap

### Q4 2025
- [x] V3 Adaptive System
- [x] Improved SL/TP calculation
- [ ] Advanced ML integration
- [ ] Multi-broker support (Interactive Brokers)
- [ ] Mobile app (React Native)

### Q1 2026
- [ ] Copy trading feature
- [ ] Social trading integration
- [ ] Advanced backtesting tool
- [ ] Performance analytics dashboard

---

## 🤝 Contributing

Vedi [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## 📝 License

Proprietario - Tutti i diritti riservati

---

## 📧 Support

- Email: support@aicashevolution.com
- Discord: [AI Cash Evolution Community](https://discord.gg/aicash)
- Docs: [https://docs.aicashevolution.com](https://docs.aicashevolution.com)

---

**Last Updated**: 7 Ottobre 2025  
**Version**: 3.1.0  
**Status**: 🟢 Production
