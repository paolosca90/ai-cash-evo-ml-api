# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start the development server with auto-reloading and instant preview (runs on port 8080)
- `npm run build` - Build the application for production
- `npm run build:dev` - Build the application for development mode
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview the production build locally

## Project Architecture

This is a sophisticated **AI-powered cryptocurrency trading automation platform** with MT5 integration, built with **Vite + React + TypeScript**. The system combines advanced machine learning trading signals, real-time market data, Web3 payments, and MetaTrader 5 automation.

### Core Technology Stack
- **Frontend**: React 18, TypeScript, Vite with SWC for fast builds
- **UI Framework**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React Query (@tanstack/react-query) for server state, React hooks for local state
- **Routing**: React Router v6 with comprehensive route structure
- **Web3**: Wagmi, Viem, Ethers.js for blockchain integration
- **Backend**: Supabase for database, authentication, and edge functions
- **Charts**: Recharts for financial data visualization
- **Node Polyfills**: Comprehensive polyfills for Web3 compatibility

### System Architecture Overview

The platform consists of multiple interconnected systems:

**Frontend Application** (`src/`):
- Modern React application with TypeScript
- Real-time trading interface with AI signals
- Multi-page application with authentication and payment flows
- Responsive design with dark/light theme support

**Backend Services** (`supabase/functions/`):
- Edge functions for AI signal generation
- MT5 trade signal processing and execution
- Payment processing (Stripe, crypto payments)
- Market data feeds and analysis
- User authentication and subscription management

**Trading Integration** (`mt5-expert/`):
- MetaTrader 5 Expert Advisor for automated execution
- Real-time signal polling and trade management
- Risk management and position sizing

**Database Layer** (`supabase/migrations/`):
- Comprehensive PostgreSQL schema
- Real-time subscriptions for live updates
- Trade logging and performance tracking
- User management and subscription data

### Application Structure

**Main Pages** (`src/pages/`):
- `Landing.tsx` - Marketing landing page with feature highlights
- `Dashboard.tsx` - Main trading dashboard with AI signals, charts, and portfolio overview
- `Index.tsx` - Core trading interface with signal generation and execution
- `MT5Setup.tsx` - MT5 platform integration wizard and configuration
- `Login.tsx` - User authentication with Supabase auth
- `AdminDashboard.tsx` - Administrative interface for system management
- `Profile.tsx` - User profile and settings management
- Payment pages: `PaymentSetup.tsx`, `QRPaymentPage.tsx`, `CryptoPaymentPage.tsx`
- Legal pages: `Legal.tsx`, `Privacy.tsx`

**Core Trading Components** (`src/components/`):
- `AISignals.tsx` - AI-powered trading signal generation with confidence scoring
- `TradeExecutionPanel.tsx` - Advanced trade placement and management interface
- `TradingChart.tsx` - Real-time price charts with technical indicators
- `MarketData.tsx` - Live market data feeds and analysis
- `MT5Setup.tsx` - MetaTrader 5 integration configuration
- `RiskManagementPanel.tsx` - Advanced risk management tools
- `SignalModulationPanel.tsx` - Signal optimization and filtering
- `SmartMoneyConceptsAnalyzer.tsx` - Advanced market structure analysis

**AI/ML Components** (`src/components/` and `src/lib/`):
- `RLTradingPanel.tsx` - Reinforcement learning trading interface
- `BacktestingDashboard.tsx` - Strategy backtesting and optimization
- `FeatureEngineeringDashboard.tsx` - ML feature engineering tools
- `CollectiveLearningAnalytics.tsx` - Collective learning and performance tracking

**Web3 Integration** (`src/lib/web3.ts`):
- Wagmi configuration for Ethereum mainnet
- Multi-wallet support: MetaMask, WalletConnect, Coinbase Wallet, injected wallets
- Request Network integration for payment requests
- Pre-configured token addresses for USDT and USDC on Ethereum mainnet
- Recipient wallet configuration for payment processing

### Advanced Trading Systems

**MT5 Integration Architecture** (`src/lib/mt5-*.ts`):
- `mt5-integration.ts` - Main MT5 integration orchestrator
- `mt5-commands.ts` - Command builder for trade operations
- `mt5-callbacks.ts` - Real-time callback system for trade updates
- `mt5-error-handling.ts` - Comprehensive error handling and recovery
- `mt5-invocation.ts` - Low-level MT5 invocation system
- `mt5-system.ts` - System-level MT5 operations
- `mt5-types.ts` - TypeScript definitions for MT5 operations

**AI/ML Trading Systems** (`src/lib/`):
- `AdvancedMLTradingSystem.ts` - Core ML trading engine
- `PPOCPPOAgentSelector.ts` - Deep reinforcement learning agent selection
- `rl-trading/` - Reinforcement learning trading system
- `signal-modulation/` - Signal optimization and modulation
- `risk-management/` - Advanced risk management algorithms
- `feature-engineering/` - ML feature engineering pipeline
- `backtesting/` - Comprehensive backtesting framework
- `retraining/` - Continuous model retraining system

### Database Schema and Architecture

**Core Tables** (from `supabase/migrations/`):
- `users` - User management and authentication
- `mt5_accounts` - MT5 account linking and management
- `trade_signals` - AI-generated trading signals
- `mt5_positions` - Real-time position tracking
- `trade_log` - Comprehensive trade execution logging
- `subscriptions` - User subscription management
- `user_statistics` - Performance analytics and statistics
- `system_health` - System monitoring and health checks

**Real-time Features**:
- Live trade signal updates via Supabase realtime
- Position tracking and P&L updates
- Market data streaming
- System health monitoring

### Backend Edge Functions

**Trading Functions** (`supabase/functions/`):
- `mt5-trade-signals/` - MT5 trade signal processing
- `advanced-ml-signals/` - AI signal generation
- `rl-inference/` - Reinforcement learning inference
- `ml-trading-optimizer/` - ML-based trading optimization
- `smart-money-concepts-analyzer/` - Market structure analysis
- `trading-auto-optimizer/` - Automatic trading optimization

**Payment Functions**:
- `create-checkout/` - Stripe checkout creation
- `verify-crypto-payment/` - Cryptocurrency payment verification
- `create-payment-qr/` - QR code payment generation
- `customer-portal/` - Stripe customer portal

**Data Functions**:
- `tradingview-market-data/` - TradingView data integration
- `fetch-financial-news/` - Financial news aggregation
- `fetch-economic-calendar/` - Economic calendar data
- `llm-sentiment/` - LLM-based sentiment analysis

### Web3 and Payment Integration

**Cryptocurrency Payments**:
- USDT and USDC support on Ethereum mainnet
- Request Network integration for payment requests
- QR code generation for crypto payments
- Real-time payment verification

**Wallet Support**:
- MetaMask (primary)
- WalletConnect (mobile support)
- Coinbase Wallet
- Generic injected wallets

### Configuration Files

**Build Configuration**:
- `vite.config.ts` - Vite configuration with Node.js polyfills
- `tailwind.config.ts` - Tailwind CSS configuration
- `eslint.config.js` - ESLint configuration
- `tsconfig.json` - TypeScript configuration (strict mode)

**Deployment**:
- `vercel.json` - Vercel deployment configuration
- `netlify.toml` - Netlify deployment configuration
- Security headers and caching rules configured

### Development Workflow

**Local Development**:
1. Install dependencies: `npm install --legacy-peer-deps`
2. Start development server: `npm run dev`
3. Application runs on `http://localhost:8080`
4. Hot reload enabled for rapid development

**Environment Variables**:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- Additional environment variables for third-party integrations

### Security and Best Practices

**Security Measures**:
- Row-level security (RLS) in Supabase
- Input validation and sanitization
- CORS configuration for edge functions
- Web3 wallet security with proper signing
- Environment variable protection

**Code Quality**:
- TypeScript strict mode enabled
- Comprehensive ESLint configuration
- Component composition patterns
- Error boundaries and handling
- Comprehensive type definitions

### Trading System Features

**AI Signal Generation**:
- Multiple AI models and algorithms
- Confidence scoring and risk assessment
- Real-time market analysis
- Smart money concepts integration
- Pattern recognition and technical analysis

**Risk Management**:
- Position sizing algorithms
- Stop loss and take profit calculation
- Maximum drawdown protection
- Correlation analysis
- Volatility-adjusted risk

**Performance Analytics**:
- Real-time P&L tracking
- Trade execution analytics
- Win rate and profit factor calculation
- Sharpe ratio and risk-adjusted returns
- Comprehensive backtesting framework

### Critical Integration Points

**MT5 Integration Flow**:
1. AI signal generation in frontend
2. Signal storage in Supabase database
3. MT5 EA polls for new signals every 5 seconds
4. Signal validation and risk management
5. Trade execution in MT5
6. Result feedback to database
7. Real-time updates in frontend

**Web3 Payment Flow**:
1. User selects payment method
2. Wallet connection via Wagmi
3. Payment request generation (Request Network)
4. QR code display or wallet payment
5. Payment verification on blockchain
6. Subscription activation

This is a production-grade trading system with enterprise-level architecture, comprehensive error handling, and advanced AI/ML capabilities. The system handles real financial transactions and requires careful testing and validation.

### Auto-Trading System (24/7 Automated Trading)

**Architecture Overview**:
The system features a fully automated 24/7 trading daemon that continuously generates and executes trades on OANDA demo account. This creates a high-frequency data pipeline for machine learning model training and continuous improvement.

**Core Components**:

1. **Trading Daemon** (`scripts/start-auto-trading.js`):
   - Node.js background process for continuous trading
   - Random interval execution: 10-30 minutes between trades
   - Trades 12 symbols: Major pairs (EURUSD, GBPUSD, USDJPY, USDCHF), Minor pairs (AUDUSD, USDCAD, NZDUSD, EURGBP, EURJPY, GBPJPY), Metals (XAUUSD, XAGUSD)
   - Graceful shutdown with statistics reporting
   - Start command: `node scripts/start-auto-trading.js`

2. **Auto OANDA Trader** (`supabase/functions/auto-oanda-trader/index.ts`):
   - Edge function for automated trade execution
   - Modes: 'single' (one trade) or 'continuous' (time-based loop)
   - Complete workflow: Generate signal → Execute on OANDA → Save to DB → Track performance
   - Automatic ensemble weight recalculation every 10 trades per symbol
   - OANDA demo API integration with full SL/TP support

3. **Intraday Risk Manager** (`supabase/functions/generate-ai-signals/intraday-risk-manager.ts`):
   - High win rate optimization (target 60-70%+ win rate)
   - **SL Strategy**: Wide stop losses (0.6-1.5%) with 5 pips spread buffer to avoid premature stop-outs
   - **TP Strategy**: Small, realistic targets (0.5:1 - 1.2:1 R:R) for higher probability wins
   - **Overnight Prevention**: No trades Friday 20:00+ UTC, weekend trading blocked
   - **Max Trade Duration**: 4h major pairs, 3h minor pairs, 2h metals (XAU/XAG)
   - ATR-based dynamic SL/TP calculation
   - Market hours validation and position closure logic

**Ensemble ML System with Continuous Learning**:

1. **Signal Generation Strategy**:
   - **Primary**: Classic Technical Analysis (trend, momentum, volume, support/resistance)
   - **Validation**: Machine Learning confidence score
   - **Ensemble Weighting**: Adaptive weights based on recent performance (last 50 trades)
   - **Context-Aware**: Market regime (trending/ranging), session type (London/NY/Asian), volatility level

2. **Continuous Learning Pipeline**:
   - Auto-triggered weight recalculation every 10 completed trades per symbol
   - Performance tracking with ML metadata: `ml_action`, `ml_confidence`, `agreement`, `ml_recommendation`
   - Database trigger: `update_ensemble_weights_trigger` on signal_performance updates
   - Context preservation: Market regime, session, volatility stored with each trade

3. **Database Schema** (Key Tables):
   ```sql
   -- Signal performance tracking with ML metadata
   signal_performance (
     id, symbol, signal_type, predicted_direction, confidence,
     entry_price, stop_loss, take_profit,
     ml_action, ml_confidence, agreement, ml_recommendation,
     market_regime, session_type, volatility_level,
     external_trade_id (OANDA trade ID),
     win (boolean), actual_result (P&L),
     created_at
   )

   -- Adaptive ensemble weights
   ensemble_weights (
     symbol, classic_weight, ml_weight,
     last_50_classic_wins, last_50_ml_wins,
     updated_at
   )
   ```

4. **Performance Monitoring**:
   ```sql
   -- Compare original vs optimized strategy
   SELECT
     'Original' as version,
     COUNT(*) as trades,
     AVG(actual_result) as avg_pnl,
     COUNT(*) FILTER (WHERE win = true)::FLOAT / COUNT(*) as win_rate
   FROM signal_performance
   WHERE created_at > NOW() - INTERVAL '7 days'
     AND external_trade_id IS NULL

   UNION ALL

   SELECT
     'Intraday Optimized' as version,
     COUNT(*) as trades,
     AVG(actual_result) as avg_pnl,
     COUNT(*) FILTER (WHERE win = true)::FLOAT / COUNT(*) as win_rate
   FROM signal_performance
   WHERE created_at > NOW() - INTERVAL '7 days'
     AND external_trade_id IS NOT NULL
   ```

**High Win Rate Strategy Parameters**:

```typescript
// Stop Loss (WIDE with spread buffer)
MIN_SL_PERCENT: 0.006       // 0.6% (60 pips EURUSD)
MAX_SL_PERCENT: 0.015       // 1.5% (150 pips EURUSD)
SL_ATR_MULTIPLIER: 1.8      // SL = ATR × 1.8 (wide)
SPREAD_BUFFER_PIPS: 5       // +5 pips buffer to prevent spread stop-outs

// Take Profit (SMALL for high probability)
MIN_RR_RATIO: 0.5           // Minimum 0.5:1 (TP half of SL)
TARGET_RR_RATIO: 0.8        // Target 0.8:1 (TP 80% of SL)
MAX_RR_RATIO: 1.2           // Maximum 1.2:1
TP_ATR_MULTIPLIER: 1.2      // TP = ATR × 1.2 (realistic targets)

// Trading Hours
FOREX_NO_TRADE_START: 20    // UTC - No trade Friday from 20:00
FOREX_NO_TRADE_END: 23      // UTC - No trade until Sunday 23:00
```

**Key Advantages**:
- **High Win Rate**: 60-70%+ target (profit from volume, not big wins)
- **Zero Swap Costs**: Pure intraday, no overnight positions
- **Spread Protection**: 5 pips buffer prevents premature stop-outs
- **ML-Friendly**: High frequency trades = more training data
- **Continuous Learning**: System improves automatically with each trade

**Operational Commands**:
- Start auto-trading: `node scripts/start-auto-trading.js`
- Monitor running daemon: Check console output or query `signal_performance` table
- Check OANDA trades: Query `external_trade_id IS NOT NULL` in signal_performance
- View ensemble weights: `SELECT * FROM ensemble_weights ORDER BY updated_at DESC`
- Manually trigger weight recalc: `SELECT recalculate_ensemble_weights('EURUSD')`

**Integration Notes**:
- Auto-trading daemon currently runs separately from MT5 integration
- OANDA demo account used for risk-free real market execution
- Future: Integrate intraday-risk-manager into generate-ai-signals for production deployment
- Alternative: Create separate `intraday-optimizer` Edge Function between signal generation and execution