# AI Cash Evolution

AI-powered trading platform with ML-based signal generation, automated trading, and comprehensive risk management.

## 🎯 Overview

AI Cash Evolution is a sophisticated trading platform that combines:
- **AI-powered signal generation** using LSTM neural networks
- **Real-time trading** via MetaTrader 5 integration
- **Automated risk management** with dynamic SL/TP
- **Paper trading** for strategy validation
- **Performance analytics** and backtesting

## 🏗️ Architecture

The platform consists of two separate repositories:

### 1. Main Application (This Repository)
- **Frontend**: React + TypeScript (Vercel)
- **Backend**: Supabase Edge Functions
- **Database**: Supabase PostgreSQL
- **Trading**: MT5 Expert Advisors

### 2. ML Service (Separate Repository)
- **Repository**: [ai-cash-evo-ml-api](https://github.com/paolosca90/ai-cash-evo-ml-api)
- **Platform**: Railway
- **Tech**: Python + Flask + TensorFlow/Keras
- **Purpose**: ML model training, predictions, weight optimization

## 📁 Project Structure

```
ai-cash-evo/
├── frontend/           # React frontend application
├── backend/
│   ├── supabase/      # Supabase Edge Functions
│   └── api/           # Vercel serverless APIs
├── scripts/
│   ├── ml/            # ML training & optimization scripts
│   ├── database/      # Database maintenance scripts
│   └── deployment/    # Deployment utilities
├── database/
│   ├── schemas/       # Database schemas
│   ├── migrations/    # SQL migrations
│   └── setup/         # Setup scripts
├── docs/              # Documentation
├── config/            # Configuration files
└── tools/
    └── mt5-expert/    # MT5 Expert Advisors
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- Supabase account
- OANDA account (for trading)
- Railway account (for ML service)

### 1. Clone the Repository

```bash
git clone https://github.com/paolosca90/ai-cash-evo.git
cd ai-cash-evo
```

### 2. Setup Environment Variables

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `OANDA_API_KEY` - OANDA API key
- `OANDA_ACCOUNT_ID` - OANDA account ID

### 3. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# ML Scripts (if running locally)
pip install -r ../railway-ml-service/requirements.txt
```

### 4. Database Setup

```bash
# Apply database schemas
cd database/schemas
# Run SQL files in Supabase SQL Editor or:
supabase db push
```

### 5. Run Development Server

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173`

## 🔧 Development

### Frontend Development

```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Database Migrations

```bash
# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db push
```

### Edge Functions

```bash
# Deploy function
supabase functions deploy function-name

# Test locally
supabase functions serve function-name
```

## 📊 Features

### Trading Features
- **26+ Trading Pairs**: Forex majors/minors, metals, crypto
- **AI Signal Generation**: LSTM-based predictions
- **Automated Trading**: MT5 integration
- **Risk Management**: Dynamic SL/TP with ATR
- **Paper Trading**: OANDA practice accounts

### ML Features
- **LSTM Models**: Time series prediction
- **Weight Optimization**: Indicator weight tuning
- **Backtesting**: Historical performance analysis
- **Auto-Retraining**: Weekly model updates

### Analytics
- **Real-time Dashboard**: Live performance metrics
- **Trade History**: Detailed trade records
- **Performance Reports**: Win rate, profit factor, Sharpe ratio
- **Signal Analytics**: Confidence scores, risk levels

## 🗄️ Database Schema

Main tables:
- `trading_signals` - Generated trading signals
- `trades` - Executed trades
- `ml_training_samples` - ML training data
- `ml_indicator_weights` - Optimized indicator weights
- `oanda_paper_trades` - Paper trading records

See `database/schemas/` for complete schema definitions.

## 📈 Supported Trading Pairs

### Forex Majors (7)
EURUSD, GBPUSD, USDJPY, USDCHF, USDCAD, AUDUSD, NZDUSD

### Forex Minors (19)
EURGBP, EURJPY, EURCHF, EURCAD, EURAUD, EURNZD, GBPJPY, GBPCHF, GBPCAD, GBPAUD, GBPNZD, CHFJPY, CADJPY, AUDJPY, NZDJPY, CADCHF, AUDCHF, NZDCHF, AUDCAD, NZDCAD, AUDNZD

### Metals (1)
XAUUSD (Gold)

### Crypto (2)
BTCUSD, ETHUSD

## 🚢 Deployment

### Vercel (Frontend + Serverless APIs)

```bash
npm i -g vercel
vercel --prod
```

Or connect GitHub repository to Vercel for automatic deployments.

### Supabase (Database + Edge Functions)

```bash
# Link project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy

# Push database changes
supabase db push
```

### Railway (ML Service)

See [ai-cash-evo-ml-api](https://github.com/paolosca90/ai-cash-evo-ml-api) repository.

## 📚 Documentation

- [Project Structure](PROJECT_STRUCTURE.md) - Detailed project organization
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [API Documentation](docs/api/) - API endpoints reference
- [Database Schema](database/README.md) - Database structure
- [Scripts Guide](scripts/README.md) - Utility scripts documentation

## 🔐 Security

- Environment variables for sensitive data
- Row Level Security (RLS) on database
- API key authentication
- Service role keys for backend only
- Regular security audits

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/paolosca90/ai-cash-evo/issues)
- **Documentation**: Check `/docs` directory
- **Discussions**: [GitHub Discussions](https://github.com/paolosca90/ai-cash-evo/discussions)

## 🔗 Related Repositories

- [ML API Service](https://github.com/paolosca90/ai-cash-evo-ml-api) - Railway ML service

## ⚠️ Disclaimer

This software is for educational purposes only. Trading involves significant risk. Past performance does not guarantee future results. Always do your own research and never invest more than you can afford to lose.

---

**Built with ❤️ by the AI Cash Evolution Team**

*Last updated: October 18, 2025*
