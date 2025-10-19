# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Cash Revolution V3 is an advanced adaptive trading system with subscription management, trial limits, and revenue optimization. The system generates real-time trading signals using AI, machine learning, and technical analysis, with integrated MT5 execution and comprehensive analytics.

**Key Features**:
- **Signal Limits**: 1 signal/day for Essential plan, unlimited for Professional
- **Trial Management**: 7-day trial with expiry popup system and daily notification
- **Phone Validation**: Unique phone number required to prevent multiple trial accounts
- **Revenue Optimization**: Multi-tier pricing with upgrade prompts
- **Anti-Sharing System**: MT5 account uniqueness - one account per email only
- **Legal Compliance**: Full CONSOB disclaimer and GDPR privacy policy
- **Real-Time Analytics**: Hugging Face ML platform with OANDA integration
- **MT5 Integration**: Expert Advisor with automated execution and popup confirmation
- **Trade Execution V2**: Simplified execution panel with confirmation popup (no risk amount input)

**Architecture**:
- **Frontend** (Vercel): React + TypeScript with Supabase backend
- **Backend**: Supabase Edge Functions (46 functions) with PostgreSQL
- **ML Analytics** (Hugging Face Spaces): Professional monitoring platform
- **Trading**: MT5 Expert Advisors with signal polling

## Development Commands

### Frontend Development
```bash
# Development server (runs on port 5173 from frontend/ directory)
cd frontend
npm run dev

# Production build
cd frontend
npm run build

# Preview production build
cd frontend
npm run preview

# Code linting
cd frontend
npm run lint

# Development build with debugging
cd frontend
npm run build:dev
```

### Hugging Face ML Analytics
```bash
# Local development
cd ../ai-cash-evolution-ml
python app.py

# Test analytics endpoints
curl https://semiautotrade-ai-cash-evolution-ml.hf.space/health
curl https://semiautotrade-ai-cash-evolution-ml.hf.space/live-trades
curl https://semiautotrade-ai-cash-evolution-ml.hf.space/analytics
curl https://semiautotrade-ai-cash-evolution-ml.hf.space/ensemble-weights
```

### Database & Supabase Operations
```bash
# Deploy all edge functions
supabase functions deploy

# Deploy specific functions
supabase functions deploy generate-ai-signals
supabase functions deploy mt5-trade-signals
supabase functions deploy heartbeat

# Start local Supabase development
supabase start

# Apply database migrations
supabase db push

# Generate types
supabase gen types typescript --local > src/types/supabase.ts
```

### Alternative Deployment (when CLI fails)
```bash
# Deploy functions using custom script
deno run --allow-net --allow-read deploy-functions.js

# Deploy single function
deno run --allow-net --allow-read deploy-function.js generate-ai-signals
```

### Testing Commands
```bash
# Test signal generation API
curl -X POST \
  https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/generate-ai-signals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"EURUSD","localAnalysis":true}'

# Test MT5 signals endpoint
curl -X GET \
  "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/mt5-trade-signals?email=user@example.com" \
  -H "apikey: YOUR_API_KEY"

# Test heartbeat endpoint
curl -X POST \
  https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"client_id":"test","event_type":"test"}'
```

## Project Architecture

### Frontend Architecture
- **React 18 + TypeScript** with Vite as the build tool
- **TailwindCSS + shadcn/ui** for styling and UI components
- **Supabase Client** for database operations and authentication
- **TanStack Query** for server state management and caching
- **React Router** for client-side routing
- **TensorFlow.js** for client-side ML predictions
- **Recharts** for data visualization

### Backend Architecture
- **Supabase Edge Functions** (Deno runtime) - 46 active functions
- **PostgreSQL** database with Row Level Security (RLS)
- **Real-time WebSocket connections** for live data updates
- **Cron Jobs** for automated maintenance and optimization
- **OANDA API** integration for real-time market data and paper trading
- **Hugging Face Spaces** - ML Analytics Platform (Version 3.0.0)

### ML Analytics Platform (Hugging Face Spaces)
**URL**: https://semiautotrade-ai-cash-evolution-ml.hf.space

**Version**: 3.0.0 - Analytics Edition

**Primary Purpose**: Professional monitoring and analysis of OANDA trading performance

**Key Features**:
- 📊 **Live Trading Monitor** - Real-time OANDA trade tracking with P&L
- 📈 **Performance Analytics** - Win rates, Sharpe ratios, comprehensive metrics
- ⚖️ **Ensemble Weights Analysis** - ML vs Classic performance comparison
- 🎯 **Signal Generation** - OANDA real-time data integration with fallback to Yahoo Finance
- 💰 **Risk Management Analytics** - SL/TP effectiveness tracking
- 🔄 **Auto-Save Signals** - Every signal saved to Supabase for tracking

**Data Sources**:
- **OANDA API** via Supabase Edge Function (`oanda-market-data`) - Priority for forex/metals
- **Yahoo Finance** - Fallback for all symbols
- **Supabase Database** - Real-time trade tracking from Auto-Trader V4
- **signal_performance** table - Complete trade history
- **ensemble_weights** table - Adaptive learning weights
- **signal_performance_analytics** view - Aggregated metrics

### Core Trading System Components

#### 1. Signal Generation Engine (`generate-ai-signals`)
- **Adaptive Algorithm**: ADX + Choppiness Index for market regime detection
- **Market Sessions**: London/NY open breakout strategies
- **Technical Indicators**: EMA crossovers, RSI, ATR, VWAP, Bollinger Bands
- **Risk Management**: Dynamic position sizing and SL/TP calculation
- **ML Integration**: Real-time confidence scoring with fallback

#### 2. MT5 Integration (`mt5-trade-signals`)
- **Signal Delivery**: HTTP polling every 2-10 seconds
- **Trade Execution**: Automatic order placement with risk management
- **Symbol Mapping**: Automatic broker symbol correction (26 symbols)
- **Multi-currency Support**: EUR/USD rate conversion from OANDA
- **Duplicate Prevention**: 30-second window duplicate detection

#### 3. Expert Advisor (MT5)
- **Real-time Monitoring**: Configurable polling interval (default: 2 seconds)
- **Trade Management**: Automatic SL/TP adjustments
- **Heartbeat System**: 30-second status reporting
- **Error Handling**: Comprehensive error codes and recovery
- **Multi-account Support**: Email-based user identification

### Database Schema

#### Core Tables
```sql
-- User profiles with subscription and trial management
profiles {
  id: UUID (primary key, foreign key to auth.users)
  email: TEXT UNIQUE -- User email with uniqueness constraint
  phone_number: VARCHAR(20) UNIQUE -- Anti-sharing mechanism
  subscription_plan: subscription_plan_type -- 'essenziale' | 'professional' | 'enterprise'
  subscription_status: TEXT -- 'trial' | 'active' | 'expired'
  subscription_expires_at: TIMESTAMPTZ -- Trial or subscription expiry
  trial_ends_at: TIMESTAMPTZ -- Specific trial end date
  payment_type: TEXT -- 'stripe' | 'crypto'
}

-- Subscription plans with real pricing
subscription_plans {
  id: UUID (primary key)
  plan_type: subscription_plan_type UNIQUE
  name: TEXT -- 'Essenziale' | 'Professional' | 'Enterprise'
  price_monthly: NUMERIC -- Real Stripe prices (29.99, 97.00)
  price_annual: NUMERIC -- Annual pricing with discounts
  max_signals_per_day: INTEGER -- 1 for essential, 999 for professional
  can_download_ea: BOOLEAN -- EA download permission
  can_access_premium_features: BOOLEAN -- ML features access
  description: TEXT -- Plan description
  features: JSONB -- Feature list
}

-- Daily signal usage tracking (enforces limits)
daily_signal_usage {
  id: UUID (primary key)
  user_id: UUID (foreign key to auth.users)
  date: DATE UNIQUE -- Daily tracking
  signals_used: INTEGER -- Count of signals used today
  signals_limit: INTEGER -- Plan limit (1 or 999)
}

-- MT5 account linking (prevents sharing)
mt5_accounts {
  id: UUID (primary key)
  user_id: UUID (foreign key to auth.users)
  account_number: VARCHAR(20) UNIQUE -- Anti-sharing mechanism
  account_name: TEXT
  is_active: BOOLEAN
  last_heartbeat: TIMESTAMPTZ
}

-- Primary signals table
mt5_signals {
  id: UUID (primary key)
  client_id: TEXT (NOT NULL) -- User email identifier
  user_id: UUID (foreign key to auth.users)
  symbol: TEXT (NOT NULL) -- Trading pair (EURUSD, XAUUSD)
  signal: TEXT (NOT NULL) -- BUY/SELL direction
  entry: NUMERIC (NOT NULL) -- Entry price
  stop_loss: NUMERIC -- Stop loss price
  take_profit: NUMERIC -- Take profit price
  confidence: INTEGER -- 0-100 confidence score
  timestamp: TIMESTAMPTZ -- Signal generation time
}

-- EA heartbeat monitoring with account validation
ea_heartbeats {
  id: UUID (primary key)
  client_id: TEXT
  account_number: BIGINT -- MT5 account for sharing prevention
  heartbeat_data: JSONB -- Account details and status
  created_at: TIMESTAMPTZ
}
```

### Edge Functions Architecture (46 Functions)

#### Core Trading Functions
- `generate-ai-signals` - Main signal generation with ML
- `mt5-trade-signals` - Signal delivery and execution
- `mt5-trade-signals-v2` - Enhanced MT5 integration
- `heartbeat` - EA monitoring with MT5 account validation
- `auto-oanda-trader` - OANDA API integration and paper trading
- `execute-oanda-trade` - OANDA trade execution
- `execute-trade` - Generic trade execution

#### Revenue Optimization Functions
- `create-checkout` - Stripe checkout with real pricing (€29.99/€97.00)
- `create-stripe-setup` - Stripe setup intent for subscriptions
- `create-payment-qr` - Crypto payment QR codes
- `verify-crypto-payment` - Crypto payment verification
- `customer-portal` - Stripe customer portal for upgrades
- `check-subscription` - Subscription validation with limits
- `expire-trials` - Trial expiration management

#### Anti-Sharing & Security Functions
- **`heartbeat`** - Enhanced with MT5 account uniqueness validation
- `auth-email-handler` - Email authentication with uniqueness
- `send-auth-email` - Send authentication emails
- `welcome-email` - User onboarding with trial details

#### Signal Limit Enforcement Functions
- `can_generate_signal` - Database function checking daily limits
- `increment_signal_usage` - Updates daily signal counter
- `auto-result-updater` - Trade result updates

#### OANDA Integration
- `oanda-market-data` - Real-time price feeds for Hugging Face ML
- `auto-result-updater` - Automatic trade result updates every minute

#### ML Analytics (Hugging Face)
- Auto-save signals to `signal_performance` table
- Real-time performance tracking via `signal_performance_analytics` view
- Ensemble weights optimization in `ensemble_weights` table

#### Data & Integration Functions
- `fetch-economic-calendar` - Economic events
- `update-economic-calendar` - Calendar updates
- `fetch-financial-news` - News sentiment
- `fetch-investing-news-it` - Italian news feed
- `crypto-price-feed` - Cryptocurrency data
- `historical-data-cache` - Historical data caching
- `llm-sentiment` - LLM-based sentiment analysis

#### Utility & Maintenance Functions
- `cleanup-old-signals` - Data cleanup
- `cleanup-old-signals-auto` - Automated cleanup
- `cleanup-null-entries` - Remove null data
- `notify-signal` - Signal notifications
- `realtime-trade-webhook` - Webhook handling

## Signal Flow Architecture

### 1. Signal Generation Process
```
OANDA API Data → Technical Analysis → ML Prediction → Confidence Scoring → Database Storage
```

**Steps:**
1. **Market Data Acquisition**: Real-time prices from OANDA API
2. **Regime Detection**: ADX + Choppiness Index analysis
3. **Signal Generation**: Adaptive algorithm based on market conditions
4. **ML Enhancement**: TensorFlow.js model confidence scoring
5. **Risk Calculation**: Dynamic SL/TP based on ATR and market structure
6. **Database Storage**: Signal saved with full analysis metadata

### 2. Signal Delivery Process
```
Database → MT5 Polling → Signal Validation → Trade Execution → Result Reporting
```

**Steps:**
1. **EA Polling**: MT5 requests signals every 2-10 seconds
2. **User Authentication**: Email-based user identification
3. **Signal Retrieval**: Unsent signals fetched for user
4. **Symbol Mapping**: Broker symbol compatibility check
5. **Risk Validation**: SL/TP and volume validation
6. **Trade Execution**: Order placement with risk management
7. **Status Update**: Execution result reported back to system

### 3. Real-time Monitoring
```
MT5 EA → Heartbeat → Trade Updates → ML Tracking → Performance Analytics
```

**Components:**
- **Heartbeat System**: EA status every 30 seconds
- **Trade Tracking**: Real-time P&L monitoring
- **ML Feedback**: Performance data for model improvement
- **Error Handling**: Comprehensive error reporting and recovery

## Environment Configuration

### Required Environment Variables
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://rvopmdflnecyrwrzhyfy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=rvopmdflnecyrwrzhyfy

# Trading APIs
OANDA_API_KEY=your-oanda-api-key
OANDA_ACCOUNT_ID=your-account-id

# Optional Services
STRIPE_PUBLISHABLE_KEY=your-stripe-key
NEWS_API_KEY=your-news-api-key
TRADINGVIEW_API_KEY=optional-tradingview-key

# Development
VITE_NODE_ENV=development
```

### Supabase Function Secrets
```bash
# Set via Supabase CLI
supabase secrets set OANDA_API_KEY=your-key
supabase secrets set OANDA_ACCOUNT_ID=your-account
supabase secrets set STRIPE_SECRET_KEY=your-stripe-secret
```

### Hugging Face ML Analytics Environment
```bash
# ML Analytics Platform uses direct Supabase connection
SUPABASE_URL=https://rvopmdflnecyrwrzhyfy.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# These are embedded in app.py for the analytics platform
# The platform reads from:
# - signal_performance table (trade tracking)
# - ensemble_weights table (ML vs Classic weights)
# - signal_performance_analytics view (aggregated metrics)
```

## MT5 Expert Advisor Setup

### Client Distribution
**File for Download**: `AI_Cash_Revolution_EA_DISTRIBUTION.ex5`

**Location**:
- **Master Copy**: `tools/mt5-expert/AI_Cash_Revolution_EA_DISTRIBUTION.ex5`
- **Frontend Public**: `frontend/public/AI_Cash_Revolution_EA_DISTRIBUTION.ex5` (served to clients)

**Download Process**:
1. Users navigate to MT5 Setup page in the application
2. Click "Download Expert Advisor"
3. File is downloaded from `/AI_Cash_Revolution_EA_DISTRIBUTION.ex5`
4. Double-click the .ex5 file to auto-install in MT5

### Installation & Configuration
1. **Download EA**: Users download `AI_Cash_Revolution_EA_DISTRIBUTION.ex5` from the web app
2. **Simple Install**: Double-click the .ex5 file - MT5 auto-installs it
3. **Configure Parameters**:
   - `UserEmail`: Your registered email address (REQUIRED)
   - `VolumeManagementMode`: PERCENTAGE (recommended)
   - `RiskPercentage`: Risk per trade (default: 2%)
   - `MagicNumber`: Unique identifier (default: 888777)
   - `AutoExecuteTrades`: Enable automatic execution
   - `PollingInterval`: Signal check frequency (default: 2 seconds)

### EA Behavior & Features
- **Polling Interval**: Checks for signals every 2-10 seconds (configurable)
- **Heartbeat**: Reports status every 30 seconds
- **Symbol Mapping**: Supports 26 symbols including majors, minors, and crosses
- **Risk Management**: Dynamic position sizing with user-defined risk
- **Error Recovery**: Comprehensive error handling and logging

### Key EA Functions
- `CheckForNewTrades()` - Retrieves signals from server
- `ExecuteSignal()` - Validates and executes trades
- `GetCorrectSymbol()` - Symbol mapping and validation
- `CalculateVolume()` - Risk-based position sizing
- `CalculateTakeProfitRR1To1()` - RR 1:1 calculation for specific symbols
- `IsSymbolSuitable()` - Symbol suitability validation
- `SendHeartbeat()` - Status reporting

## Frontend Components Structure

### Core Components
- **AISignals.tsx** - Main AI signal display and generation
- **AISignalsWrapper.tsx** - Error boundary wrapper
- **MLSignalsPanel.tsx** - Advanced ML signal analysis
- **TradingDashboard.tsx** - Main trading interface
- **MarketData.tsx** - Real-time market data display
- **EconomicCalendar.tsx** - Economic events calendar
- **FinancialNews.tsx** - News sentiment analysis

### Page Structure
```
src/pages/
├── Landing.tsx           # Landing page
├── Index.tsx            # Main trading page
├── Dashboard.tsx        # User dashboard
├── MT5Setup.tsx         # MT5 setup guide
├── Profile.tsx          # User profile
├── AdminDashboard.tsx   # Admin interface
├── Login.tsx            # Authentication
├── PaymentSetup.tsx     # Subscription management
└── MLTest.tsx           # ML testing interface
```

## Hugging Face ML Analytics API

### API Endpoints

The Hugging Face ML Analytics platform provides comprehensive REST API endpoints:

#### Health & Status
```bash
GET https://semiautotrade-ai-cash-evolution-ml.hf.space/health
# Returns: { "status": "healthy", "platform": "huggingface_spaces", "timestamp": "..." }
```

#### Live Trading Monitor
```bash
GET https://semiautotrade-ai-cash-evolution-ml.hf.space/live-trades
# Returns: Latest 100 trades with OANDA execution status, P&L, win/loss tracking
# Response includes:
# - success: boolean
# - data: array of trade objects
# - count: number of trades
# - timestamp: ISO timestamp
```

#### Performance Analytics
```bash
GET https://semiautotrade-ai-cash-evolution-ml.hf.space/analytics
# Returns: Comprehensive performance metrics by symbol and signal type
# Metrics include:
# - Win rate %
# - Total signals, wins, losses
# - Average confidence
# - Total P&L and average P&L
# - Sharpe ratio
# - P&L standard deviation
```

#### Ensemble Weights
```bash
GET https://semiautotrade-ai-cash-evolution-ml.hf.space/ensemble-weights
# Returns: ML vs Classic performance weights per symbol
# Data includes:
# - classic_weight, ml_weight (0-1 range)
# - classic_win_rate, ml_win_rate
# - classic_sharpe, ml_sharpe
# - sample_size (trades used for calculation)
# - last_recalculated timestamp
```

#### Legacy Signal Generation
```bash
# Single symbol analysis
GET https://semiautotrade-ai-cash-evolution-ml.hf.space/predict?symbol=EURUSD=X

# Batch analysis (max 50 symbols)
POST https://semiautotrade-ai-cash-evolution-ml.hf.space/predict/batch
Content-Type: application/json
{
  "symbols": ["EURUSD=X", "GBPUSD=X", "USDJPY=X"]
}
```

#### Available Symbols
```bash
GET https://semiautotrade-ai-cash-evolution-ml.hf.space/symbols
# Returns categorized list: forex, commodities, crypto, indices
```

### OANDA Real-Time Integration

The ML platform prioritizes OANDA real-time data for forex and metals:

```python
# Priority symbols for OANDA (via oanda-market-data Edge Function):
- All forex majors: EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD, NZDUSD
- All forex minors: EURGBP, EURJPY, GBPJPY, etc.
- Metals: XAUUSD, XAGUSD

# Process:
1. Check if symbol is forex/metal
2. Call Supabase oanda-market-data function
3. Get 100 M5 candles (real-time OANDA data)
4. If OANDA fails, fallback to Yahoo Finance
5. Generate signal with retrieved data
6. Auto-save signal to signal_performance table
```

### Auto-Save Signal Feature

Every signal generated on Hugging Face is automatically saved to Supabase:

```python
# Saved data:
- symbol, signal_type, predicted_direction
- confidence, entry_price, stop_loss, take_profit
- ml_action, ml_confidence, agreement
- indicators (RSI, MACD, BB, Stochastic)
- source: "huggingface_spaces"
- mode: "huggingface_oanda_integrated"
- timestamp
```

## Deployment Guide

### Frontend Deployment (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production (from project root)
vercel --prod

# Set environment variables in Vercel dashboard
# VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, etc.

# Note: Build command configured in vercel.json:
# "buildCommand": "cd frontend && npm run build"
# "outputDirectory": "frontend/dist"
```

### Hugging Face ML Analytics Deployment
```bash
# Platform: Hugging Face Spaces (https://huggingface.co/spaces)
# Repository: https://huggingface.co/spaces/semiautotrade/ai-cash-evolution-ml

# Deployment is automatic on git push:
cd ../ai-cash-evolution-ml
git add .
git commit -m "Update analytics platform"
git push

# Files required:
# - app.py (main Gradio + Flask application)
# - requirements.txt (Python dependencies)
# - README.md (Hugging Face Space description)

# The platform automatically:
# 1. Detects Gradio app in app.py
# 2. Installs requirements from requirements.txt
# 3. Launches on port 7860
# 4. Serves both Gradio UI and Flask API
```

### Supabase Functions Deployment
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy generate-ai-signals --no-verify-jwt

# Set function secrets
supabase secrets set OANDA_API_KEY=your-key
```

### Custom Deployment Script
```bash
# When Supabase CLI fails, use custom script
deno run --allow-net --allow-read deploy-functions.js

# Priority deployment order
1. generate-ai-signals
2. mt5-trade-signals
3. heartbeat
4. oanda-market-data
5. trade-update
```

## Testing & Debugging

### Database Testing
```sql
-- Check recent signals
SELECT * FROM mt5_signals
WHERE symbol = 'EURUSD'
ORDER BY timestamp DESC
LIMIT 10;

-- Verify trade execution
SELECT * FROM trades
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check EA heartbeat status
SELECT * FROM ea_heartbeats
WHERE timestamp > NOW() - INTERVAL '5 minutes'
ORDER BY timestamp DESC;

-- Check signal performance
SELECT
  symbol,
  COUNT(*) as total_signals,
  AVG(confidence) as avg_confidence,
  COUNT(CASE WHEN signal = 'BUY' THEN 1 END) as buy_signals,
  COUNT(CASE WHEN signal = 'SELL' THEN 1 END) as sell_signals
FROM mt5_signals
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY symbol;
```

### Performance Monitoring
```sql
-- Trade success rate
SELECT
  COUNT(*) as total_trades,
  COUNT(CASE WHEN profit > 0 THEN 1 END) as winning_trades,
  ROUND(COUNT(CASE WHEN profit > 0 THEN 1 END) * 100.0 / COUNT(*), 2) as win_rate,
  SUM(profit) as total_profit
FROM trades
WHERE status = 'CLOSED';

-- System performance metrics
SELECT
  signal_type,
  COUNT(*) as signal_count,
  AVG(confidence) as avg_confidence,
  AVG(CASE WHEN status = 'TP_HIT' THEN 1 ELSE 0 END) * 100 as success_rate
FROM collective_signals
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY signal_type;
```

### ML Analytics Platform Monitoring
```sql
-- Check signal_performance table (used by Hugging Face ML)
SELECT
  symbol,
  signal_type,
  COUNT(*) as total_signals,
  COUNT(CASE WHEN win = true THEN 1 END) as wins,
  COUNT(CASE WHEN win = false THEN 1 END) as losses,
  ROUND(COUNT(CASE WHEN win = true THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as win_rate_percent,
  AVG(confidence) as avg_confidence,
  AVG(actual_result) as avg_pnl,
  SUM(actual_result) as total_pnl
FROM signal_performance
WHERE created_at > NOW() - INTERVAL '7 days'
  AND win IS NOT NULL  -- Only completed trades
GROUP BY symbol, signal_type
ORDER BY total_signals DESC;

-- Check ensemble weights (ML vs Classic)
SELECT
  symbol,
  classic_weight,
  ml_weight,
  classic_win_rate,
  ml_win_rate,
  classic_sharpe,
  ml_sharpe,
  sample_size,
  last_recalculated
FROM ensemble_weights
ORDER BY symbol;

-- Monitor OANDA trade execution
SELECT
  symbol,
  predicted_direction,
  confidence,
  entry_price,
  actual_result,
  win,
  external_trade_id,  -- OANDA trade ID
  created_at
FROM signal_performance
WHERE external_trade_id IS NOT NULL  -- Only OANDA executed trades
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Performance analytics view (aggregated)
SELECT * FROM signal_performance_analytics
ORDER BY total_signals DESC;
```

## Common Issues & Solutions

### Signal Generation Problems
1. **OANDA API Issues**: Verify API keys and account permissions
2. **Market Data Delays**: Check network connectivity and API rate limits
3. **ML Model Errors**: Ensure TensorFlow.js compatibility and model availability
4. **Low Confidence**: Adjust market regime thresholds or risk parameters

### MT5 Integration Issues
1. **Connection Errors**: Verify WebRequest permissions in MT5 tools/options
2. **Symbol Not Found**: Check broker symbol mapping in EA's `GetCorrectSymbol()` function
3. **Invalid Volume**: Verify account balance and margin requirements
4. **Trade Disabled**: Enable AutoTrading in MT5

### Database Issues
1. **Migration Failures**: Check SQL syntax and dependencies
2. **RLS Policy Errors**: Verify Row Level Security policies
3. **Performance Issues**: Add indexes on frequently queried columns
4. **Connection Timeouts**: Check Supabase database size and load

### Frontend Issues
1. **API Errors**: Verify environment variables and CORS settings
2. **Authentication Problems**: Check Supabase auth configuration
3. **Real-time Updates**: Ensure WebSocket connections are properly configured
4. **Build Failures**: Verify TypeScript types and dependencies

## Signal Generation Algorithm

### Market Regime Detection
```typescript
// ADX Trend Strength
if (adx > 25 && choppiness < 50) {
  regime = 'TREND'
} else if (choppiness > 61.8) {
  regime = 'RANGE'
} else {
  regime = 'UNCERTAIN'
}
```

### Signal Generation Logic
1. **Trend Following Strategy** (Regime: TREND)
   - EMA crossovers (12/21, 50 alignment)
   - VWAP confirmation
   - Session breakout trading
   - Pullback entries

2. **Mean Reversion Strategy** (Regime: RANGE)
   - Initial Balance bounces
   - Oversold/Overbought conditions
   - Key level reversions
   - VWAP targeting

3. **Fallback Strategy**
   - Multi-timeframe alignment
   - Momentum-based entries
   - Dynamic risk management

### Risk Management
- **Stop Loss**: ATR-based (2.0x) with minimum distance
- **Take Profit**: 1:1 risk-reward ratio + spread compensation
- **Position Sizing**: Risk percentage, fixed volume, or currency amount
- **RR 1:1 Special**: Applied to XAUUSD, ETHUSD, BTCUSD

## AI & Machine Learning Integration

### ML Pipeline
1. **Feature Engineering**: 20+ technical indicators
2. **Model Training**: Neural networks with backtesting
3. **Real-time Prediction**: TensorFlow.js client-side
4. **Confidence Scoring**: Dynamic calibration
5. **Performance Tracking**: Continuous model improvement

### ML Features
- Price action indicators (EMA, RSI, ATR, ADX)
- Market session features
- Volatility measurements
- Pattern recognition
- Sentiment analysis
- Multi-timeframe alignment

## Security Best Practices

### Authentication & Authorization
- Use Supabase Auth for user management
- Implement Row Level Security (RLS) on all tables
- Validate all API inputs and sanitize data
- Use service role keys only on server-side functions
- Implement rate limiting for API endpoints

### API Security
- CORS restrictions for production domains
- Input validation and parameter sanitization
- Never commit API keys or sensitive data to repository
- Use environment variables for all configuration
- Implement proper error handling without information disclosure

### Data Protection
- Encrypt sensitive data in database
- Use HTTPS for all API communications
- Implement proper backup and recovery procedures
- Regular security audits and dependency updates
- Monitor for unusual trading patterns or API usage

## Anti-Abuse & Compliance Systems

### Phone Number Validation System
**Purpose**: Prevent users from creating multiple trial accounts

**Implementation**:
- Database: `profiles.phone_number` (VARCHAR(20) UNIQUE)
- Validation: International format regex `^\+?[1-9]\d{1,14}$`
- UI: Required field in registration form (`frontend/src/pages/Login.tsx`)
- Check: Pre-registration uniqueness validation via Supabase query

**Migration**: `database/migrations/ADD_PHONE_NUMBER_AND_TRIAL_SYSTEM.sql`

**Functions**:
```sql
-- Check phone availability
SELECT is_phone_number_available('+39 333 1234567');

-- Returns: true (available) or false (already used)
```

**Benefits**:
- ✅ Prevents trial abuse with different emails
- ✅ No SMS verification costs (constraint-based)
- ✅ International format support

---

### Trial Notification System
**Purpose**: Notify users of remaining trial days and prompt upgrades

**Components**:
- **TrialExpiryPopup**: `frontend/src/components/TrialExpiryPopup.tsx`
- **useTrialExpiry Hook**: `frontend/src/hooks/useTrialExpiry.ts`
- **Database View**: `trial_users_monitor` (admin monitoring)

**Behavior**:
- Appears **3 days before** trial expiration
- Shows progress bar with remaining days
- Suppression: 24 hours after dismissal
- Auto-check: Every hour
- Professional plan recommended

**Database Function**:
```sql
-- Get remaining trial days
SELECT get_trial_days_remaining(auth.uid());

-- Returns:
-- -1: No trial set
-- 0: Trial expired
-- N: Days remaining
```

**Popup Triggers**:
```javascript
// Show popup if:
1. subscription_status === 'trial' AND days_left <= 3
2. subscription_status === 'expired'
3. trial_ends_at < NOW()
4. NOT already 'professional' or 'enterprise' plan
```

**Documentation**: `docs/TRIAL_EXPIRY_POPUP.md`

---

### MT5 Account Validation System
**Purpose**: Prevent account sharing - one MT5 account per user email

**Implementation**:
- Database: `mt5_accounts.account_number` (UNIQUE constraint)
- Validation: In `heartbeat` Edge Function
- Check: On every EA heartbeat (every 30 seconds)

**Logic**:
```typescript
// On heartbeat:
1. Extract account_number from EA request
2. Query mt5_accounts for existing account_number
3. If exists:
   - Check if user_id matches current email
   - If different → BLOCK with 403
4. If not exists → Allow and register
```

**Response Codes**:
- **200 OK**: Account validated for user
- **403 FORBIDDEN**: Account already linked to another email

```json
// Error response:
{
  "success": false,
  "error": "ACCOUNT_ALREADY_LINKED",
  "message": "MT5 account 12345678 is already linked to another email",
  "account_number": "12345678"
}
```

**Benefits**:
- ✅ Prevents trial hopping with same MT5 account
- ✅ Blocks account sharing between users
- ✅ Enforces subscription limits

**Documentation**: `docs/MT5_ACCOUNT_VALIDATION.md`

---

### Legal Compliance Documentation
**Purpose**: Full CONSOB and GDPR compliance for Italian market

**Documents Created**:
1. **CONSOB Disclaimer** (`frontend/public/legal/consob-disclaimer.html`)
   - Clarifies: NOT financial intermediary
   - Clarifies: NOT promoting financial products
   - MiFID II risk warnings
   - Exclusion of 14-day right of withdrawal (digital content)

2. **GDPR Privacy Policy** (`frontend/public/legal/privacy-policy.html`)
   - Complete Reg. UE 2016/679 compliance
   - All user rights (Articles 15-22)
   - Data retention periods
   - Cookie policy
   - International data transfers (SCC)

**Integration**:
- Links in `PaymentModal.tsx` footer
- Accessible at `/legal/consob-disclaimer.html` and `/legal/privacy-policy.html`
- React Router page: `frontend/src/pages/PrivacyPolicy.tsx`

**Key Legal Points**:
- ❌ NO diritto di recesso (art. 59 Codice Consumo)
- ✅ Software tecnologico (NOT financial products)
- ✅ GDPR compliant data processing
- ✅ CONSOB disclaimer (NOT consultation)

---

### Trade Execution Panel V2
**Purpose**: Simplified trade execution with popup confirmation

**Component**: `frontend/src/components/TradeExecutionPanel_V2_CLEAN.tsx`

**Key Changes from V1**:
- ❌ **REMOVED**: Risk amount input field
- ✅ **ADDED**: Confirmation popup before execution
- ✅ **ADDED**: Execution success popup with animation
- ✅ **SIMPLIFIED**: Single "Execute on MT5" button

**Flow**:
```
1. User clicks "Execute on MT5"
2. Confirmation dialog appears
3. User confirms → Signal saved to database (sent=false)
4. Success popup shows
5. EA picks up signal on next poll
6. EA executes trade automatically
```

**Benefits**:
- ✅ Prevents accidental executions
- ✅ Cleaner UX without technical jargon
- ✅ Clear visual feedback
- ✅ Matches modern trading apps

**Usage in Dashboard**:
```tsx
// frontend/src/pages/Index.tsx
<TradeExecutionPanelV2
  symbol={selectedSymbol}
  signal={latestSignal || analysisSignal}
/>
```

---

## Performance Optimization

### Database Optimization
- Primary indexes on `user_id`, `symbol`, `timestamp`
- Composite indexes for common query patterns
- Regular table maintenance (VACUUM, ANALYZE)
- Connection pooling and query optimization
- Archive old trade data to separate tables

### Function Optimization
- Implement caching for expensive calculations
- Batch database operations where possible
- Use efficient data structures and algorithms
- Proper error handling and logging
- Monitor function execution times and memory usage

### Real-time Updates
- WebSocket connections for live data
- Efficient polling intervals (2-10 seconds for signals)
- Implement data compression for large payloads
- Use CDN for static asset delivery
- Optimize frontend bundle size with code splitting

## Monitoring & Analytics

### Key Performance Metrics
- **Signal Generation Latency**: Target < 5 seconds
- **Trade Execution Success Rate**: Target > 95%
- **Win Rate**: Target 65-70%
- **Risk:Reward Ratio**: Target 1:1.5+
- **Maximum Drawdown**: Target < 10%
- **System Uptime**: Target 99.9%

### Error Handling & Recovery
- Comprehensive logging in all Edge Functions
- Automated alert systems for critical failures
- Performance monitoring with real-time dashboards
- Circuit breakers for API failures
- Graceful degradation during high load

## File Structure & Key Files

### Project Structure
```
AI CASH REVOLUTION/
├── frontend/                 # React + TypeScript application
│   ├── src/
│   │   ├── App.tsx          # Main app with routing
│   │   ├── components/      # React components
│   │   │   ├── AISignals.tsx
│   │   │   ├── TradingDashboard.tsx
│   │   │   └── ...
│   │   ├── pages/           # Page components
│   │   └── lib/             # Utilities
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── backend/
│   └── supabase/
│       └── functions/       # 46 Edge Functions
│           ├── generate-ai-signals/
│           ├── mt5-trade-signals/
│           ├── oanda-market-data/
│           ├── auto-oanda-trader/
│           └── ...
│
├── database/                # Database schemas and migrations
│   ├── MANUAL_DB_SETUP.sql
│   ├── mt5-schema.sql
│   └── schemas/
│
├── huggingface-deployment/  # Local HF deployment files (legacy)
│   ├── app.py
│   └── requirements.txt
│
├── config/                  # Configuration files
├── docs/                    # Documentation
├── vercel.json             # Vercel deployment config
├── CLAUDE.md               # This file
└── README.md               # Project README
```

### External Repositories

#### ML Analytics Platform
**Location**: `C:\Users\USER\Desktop\ai-cash-evolution-ml\`
**Deployment**: Hugging Face Spaces
**URL**: https://huggingface.co/spaces/semiautotrade/ai-cash-evolution-ml

**Key Files**:
- `app.py` (1090 lines) - Gradio + Flask hybrid application
  - Live Trading Monitor (line 486-552)
  - Performance Analytics (line 611-674)
  - Ensemble Weights (line 554-609)
  - OANDA Integration (line 28-76, 169-192)
  - Auto-Save to Supabase (line 194-241)
- `requirements.txt` - Python dependencies (Gradio, Flask, yfinance, pandas, plotly)
- `README.md` - Platform documentation

### Configuration Files
- `frontend/vite.config.ts` - Vite build configuration
- `frontend/tsconfig.json` - TypeScript configuration
- `frontend/tailwind.config.ts` - TailwindCSS configuration
- `vercel.json` - Vercel deployment configuration (points to frontend/)
- `frontend/components.json` - shadcn/ui component configuration
- `mcp-config.json` - MCP server configuration for Supabase database

### Key Source Files
- `frontend/src/App.tsx` - Main application component with routing
- `frontend/src/components/AISignals.tsx` - AI signal generation and display
- `frontend/src/pages/MT5Setup.tsx` - MT5 setup wizard with EA download
- `frontend/public/AI_Cash_Revolution_EA_DISTRIBUTION.ex5` - Compiled EA for client distribution
- `backend/supabase/functions/generate-ai-signals/index.ts` - Core signal generation
- `backend/supabase/functions/mt5-trade-signals/index.ts` - MT5 integration
- `backend/supabase/functions/oanda-market-data/index.ts` - OANDA real-time data
- `backend/supabase/functions/auto-oanda-trader/index.ts` - OANDA trade execution
- `tools/mt5-expert/AI_Cash_Revolution_EA_DISTRIBUTION.mq5` - EA source code
- `tools/mt5-expert/AI_Cash_Revolution_EA_DISTRIBUTION.ex5` - EA compiled (master copy)

### Database Files
- `database/MANUAL_DB_SETUP.sql` - Complete database schema
- `database/mt5-schema.sql` - MT5-specific tables
- `database/FIXED_DB_SETUP.sql` - Fixed database setup
- `database/schemas/` - Individual schema files

### Deployment Files
- `vercel.json` - Vercel configuration (frontend deployment)
- `deploy-functions.js` - Custom Supabase deployment script
- `deploy-function.js` - Single function deployment

## Revenue & Subscription Management

### Signal Limit System
- **Essential Plan**: 1 signal per day with real-time tracking
- **Professional Plan**: 999 signals per day (effectively unlimited)
- **Database Enforcement**: `daily_signal_usage` table prevents overages
- **Real-time UI**: Progress bars and upgrade prompts when limit reached

### Trial Management
- **7-Day Trial**: Automatic expiry with popup system
- **Trial Expiry Popup**: Appears 3 days before expiry with upgrade prompts
- **Pricing Display**: Real Stripe prices (Essential: €29.99, Professional: €97.00)
- **Conversion Optimization**: Clear value proposition and upgrade urgency

### Anti-Sharing Security
- **Email Uniqueness**: Prevents multiple accounts per email
- **Phone Number Unique**: Additional deterrent for trial abuse
- **MT5 Account Unique**: Prevents account sharing between users
- **Heartbeat Validation**: Real-time account sharing detection

### Pricing Strategy
- **Essential**: €29.99/month (€0.99 per signal at 1/day limit)
- **Professional**: €97.00/month (€0.03 per signal at unlimited)
- **Annual Discounts**: €59.89 savings on Essential, €194.00 on Professional
- **Revenue Optimization**: 223% uplift per conversion to Professional

## Signal Generation Limits

### Database Functions
```sql
-- Check if user can generate signal
SELECT can_generate_signal(user_id) -- Returns BOOLEAN

-- Increment daily usage after signal generation
SELECT increment_signal_usage(user_id) -- Updates counter
```

### Frontend Integration
- **AISignals.tsx**: Real-time usage display and limit enforcement
- **SubscriptionLimits.tsx**: Usage tracking component
- **TrialExpiryPopup.tsx**: Trial expiry with upgrade prompts
- **PaymentSetup.tsx**: Checkout with plan preselection

### Limit Enforcement Flow
1. User requests signal → `can_generate_signal()` check
2. If limit reached → Show upgrade prompt with real pricing
3. If under limit → Generate signal → `increment_signal_usage()`
4. Update UI in real-time with remaining signals

---

**Last Updated**: 2025-10-19
**Version**: 3.1.0 Compliance & Anti-Abuse Edition
**Key Features**: Phone validation, trial notifications, MT5 account validation, CONSOB/GDPR compliance, Trade Execution V2
**New Security**: Phone number uniqueness, MT5 account-per-user enforcement
**Legal Compliance**: Full CONSOB disclaimer, GDPR privacy policy, no 14-day withdrawal
**UX Improvements**: Trade Execution Panel V2 with confirmation popups
**Maintainer**: AI Cash Revolution Team
**ML Platform Version**: 3.0.0 (Hugging Face Spaces)
**Active Edge Functions**: 46
**Hugging Face Platform**: https://semiautotrade-ai-cash-evolution-ml.hf.space
**Production URL**: https://cash-revolution.com
**Pricing**: Essential €29.99/mo, Professional €97.00/mo