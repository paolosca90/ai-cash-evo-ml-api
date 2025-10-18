# Scripts Directory

Utility scripts for AI Cash Revolution project, organized by category.

## Directory Structure

```
scripts/
├── ml/                 # Machine Learning scripts
├── database/          # Database maintenance scripts
└── deployment/        # Deployment utilities
```

## ML Scripts (`ml/`)

Machine learning training, optimization, and analysis scripts.

### Training Scripts
- `train_ml_model.py` - Main ML model training
- `train_compatible_model.py` - Train model compatible with production
- `auto_retrain.py` - Automatic retraining scheduler
- `monthly_retrain.py` - Monthly retraining workflow
- `enrich_and_train.py` - Data enrichment + training pipeline

### Optimization Scripts
- `optimize_signal_weights.py` - Optimize signal indicator weights
- `optimize_signal_weights_v2.py` - Enhanced weight optimization
- `optimize_sl_tp.py` - Stop loss / take profit optimization
- `optimize_atr_multipliers.py` - ATR multiplier optimization
- `optimize_symbols.py` - Symbol-specific optimization
- `optimize_from_real_trades.py` - Optimize based on real trade data

### Backtesting Scripts
- `backtest_with_weights.py` - Backtest with optimized weights
- `professional_backtesting.py` - Professional backtesting framework

### Signal Scripts
- `auto_signal_generator.py` - Automatic signal generation
- `calculate_signal_weights.py` - Calculate signal weights
- `calculate_dynamic_sl_tp.py` - Dynamic SL/TP calculation
- `enrich_signals_auto.py` - Auto signal enrichment
- `enrich_signals_ultra_fast.py` - Fast signal enrichment
- `enrich_signals_with_weights.py` - Enrich with weight data

### Data Scripts
- `download_oanda_data.py` - Download historical data from OANDA
- `convert_model_compatible.py` - Convert models to compatible format
- `validate_model.py` - Model validation

## Database Scripts (`database/`)

Database maintenance, analysis, and migration scripts.

### Analysis Scripts
- `analyze_trades.py` - Analyze trading performance
- `analyze_trade_movements.py` - Analyze trade movement patterns
- `analyze-trade-history.sql` - SQL analysis of trade history
- `show_current_stats.py` - Display current statistics

### Migration Scripts
- `apply_signal_weights_migration.py` - Apply signal weights migration
- `populate_initial_optimization.py` - Populate initial optimization data

## Deployment Scripts (`deployment/`)

Deployment automation and utilities.

### Deployment Tools
- `deploy_auto_trading.py` - Deploy auto trading system
- `cleanup-functions.bat` - Cleanup functions (Windows)
- `ea_mt5_integration_test.bat` - MT5 EA integration test (Windows)

## Usage Examples

### Train ML Model
```bash
cd scripts/ml
python train_ml_model.py --days 90 --force-retrain
```

### Optimize Signals
```bash
cd scripts/ml
python optimize_signal_weights_v2.py --symbol EURUSD
```

### Backtest Strategy
```bash
cd scripts/ml
python professional_backtesting.py --start-date 2024-01-01 --end-date 2024-12-31
```

### Analyze Trades
```bash
cd scripts/database
python analyze_trades.py --days 30
```

### Download Historical Data
```bash
cd scripts/ml
python download_oanda_data.py --symbol EURUSD --days 365
```

## Environment Variables

Most scripts require these environment variables:

```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=...
OANDA_API_KEY=...
OANDA_ACCOUNT_ID=...
```

Set them in your `.env` file or Railway/Vercel environment.

## Dependencies

Each category may have specific dependencies. Install with:

```bash
# ML dependencies
pip install -r ../railway-ml-service/requirements.txt

# Additional ML tools
pip install pandas numpy scikit-learn tensorflow keras
```

## Scheduling

### Railway Cron Jobs
Configure in `railway.toml` for automated execution:

```toml
[[crons]]
schedule = "0 0 * * 0"
command = "python scripts/ml/monthly_retrain.py"
```

### Supabase Cron
Use `pg_cron` extension for database-level scheduling:

```sql
SELECT cron.schedule('weekly-training', '0 0 * * 0', $$
  -- Call training function
$$);
```

## Best Practices

1. **Always test scripts locally first**
2. **Use logging for production scripts**
3. **Handle errors gracefully**
4. **Document parameters and outputs**
5. **Version control your configs**

## Monitoring

- Check logs in Railway dashboard
- Monitor script execution in Supabase logs
- Set up alerts for critical failures

## Related Documentation

- ML models: `../railway-ml-service/README.md`
- Database schema: `../database/schemas/`
- Deployment guide: `../DEPLOYMENT_GUIDE.md`
