# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Cash Revolution V3 is an advanced adaptive trading system that generates real-time trading signals using AI, machine learning, and technical analysis. The system integrates with MetaTrader 5 for automated trade execution and features a comprehensive web dashboard for signal management and analysis.

## Development Commands

### Frontend Development
```bash
# Development server (runs on port 8080)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Code linting
npm run lint

# Development build with debugging
npm run build:dev
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
- **Supabase Edge Functions** (Deno runtime) - 51 total functions
- **PostgreSQL** database with Row Level Security (RLS)
- **Real-time WebSocket connections** for live data updates
- **Cron Jobs** for automated maintenance and optimization
- **OANDA API** integration for real-time market data

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
  risk_amount: NUMERIC -- Risk amount in EUR
  eurusd_rate: NUMERIC -- EUR/USD exchange rate
  timestamp: TIMESTAMPTZ -- Signal generation time
  ai_analysis: JSON -- AI analysis data
  sent: BOOLEAN -- Delivered to EA?
  processed: BOOLEAN -- Processed by EA?
  status: TEXT -- Signal status
}

-- Trade execution tracking
trades {
  id: UUID (primary key)
  signal_id: UUID (foreign key)
  ticket: BIGINT -- MT5 ticket number
  symbol: TEXT
  type: TEXT -- BUY/SELL
  volume: NUMERIC
  open_price: NUMERIC
  sl: NUMERIC
  tp: NUMERIC
  open_time: TIMESTAMPTZ
  close_time: TIMESTAMPTZ
  profit: NUMERIC
  commission: NUMERIC
  swap: NUMERIC
  status: TEXT -- OPEN/CLOSED/CANCELLED
}

-- Performance tracking
signal_performance {
  id: UUID (primary key)
  signal_id: UUID (foreign key)
  symbol: TEXT
  accuracy: NUMERIC -- Win rate percentage
  profit_factor: NUMERIC -- Total profit / total loss
  max_drawdown: NUMERIC
  sharpe_ratio: NUMERIC
  duration_avg: NUMERIC -- Average trade duration
  updated_at: TIMESTAMPTZ
}

-- EA heartbeat monitoring
ea_heartbeats {
  id: UUID (primary key)
  client_id: TEXT
  user_email: TEXT
  account_number: BIGINT
  balance: NUMERIC
  equity: NUMERIC
  margin_level: NUMERIC
  active_trades: INTEGER
  is_active: BOOLEAN
  timestamp: TIMESTAMPTZ
}
```

### Edge Functions Architecture

#### Core Trading Functions (15)
- `generate-ai-signals` - Main signal generation with ML
- `mt5-trade-signals` - Signal delivery and execution
- `trade-update` - Trade status updates
- `heartbeat` - EA monitoring
- `auto-oanda-trader` - OANDA API integration

#### ML Pipeline Functions (12)
- `ml-advanced-neural` - Neural network predictions
- `ml-auto-retrain` - Model retraining automation
- `ml-performance-tracker` - Performance monitoring
- `ml-signal-optimizer` - Signal optimization
- `ml-weight-optimizer` - Model weight optimization

#### Authentication & User Management (8)
- `auth-email-handler` - Email authentication
- `password-reset-email` - Password reset
- `welcome-email` - User onboarding
- `user-api-keys` - API key management

#### Data & Integration Functions (20)
- `oanda-market-data` - Real-time price feeds
- `fetch-economic-calendar` - Economic events
- `fetch-financial-news` - News sentiment
- `technical-indicators` - Technical analysis
- `crypto-price-feed` - Cryptocurrency data

#### Utility & Maintenance Functions (10)
- `cleanup-old-signals` - Data cleanup
- `expire-trials` - Subscription management
- `price-tick-cron` - Price monitoring
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

## MT5 Expert Advisor Setup

### Installation & Configuration
1. **Copy EA File**: Place `AI_Cash_Revolution_EA_DISTRIBUTION.mq5` in MT5 experts folder
2. **Compile EA**: Use MetaEditor to compile the .mq5 file
3. **Configure Parameters**:
   - `UserEmail`: Your registered email address
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

## Deployment Guide

### Frontend Deployment (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
# VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, etc.
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

### Configuration Files
- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - TailwindCSS configuration
- `vercel.json` - Vercel deployment configuration
- `components.json` - shadcn/ui component configuration

### Key Source Files
- `src/App.tsx` - Main application component with routing
- `src/components/AISignals.tsx` - AI signal generation and display
- `supabase/functions/generate-ai-signals/index.ts` - Core signal generation
- `supabase/functions/mt5-trade-signals/index.ts` - MT5 integration
- `mt5-expert/AI_Cash_Revolution_EA_DISTRIBUTION.mq5` - MetaTrader EA

### Database Files
- `database/MANUAL_DB_SETUP.sql` - Complete database schema
- `database/mt5-schema.sql` - MT5-specific tables
- `database/FIXED_DB_SETUP.sql` - Fixed database setup

### Deployment Files
- `deploy-functions.js` - Custom deployment script
- `deploy-function.js` - Single function deployment
- `DEPLOYMENT_GUIDE.md` - Deployment instructions

## Important Notes

### Rate Limiting & Quotas
- Daily signal generation limits per user
- API rate limiting for OANDA integration
- Function execution timeouts (25 seconds)
- Database connection pooling limits

### Symbol Support
- **26 symbols supported**: majors, minors, crosses, and metals
- **Automatic symbol mapping** for different brokers
- **Dynamic symbol validation** and suitability checks
- **RR 1:1 application** for XAUUSD, ETHUSD, BTCUSD

### Risk Management
- **Dynamic position sizing** based on account balance
- **Percentage-based risk** (default 2% per trade)
- **ATR-based stop losses** with minimum distances
- **1:1 risk-reward ratios** with spread compensation

---

**Last Updated**: 2025-10-18
**Version**: 3.0
**Maintainer**: AI Cash Revolution Team