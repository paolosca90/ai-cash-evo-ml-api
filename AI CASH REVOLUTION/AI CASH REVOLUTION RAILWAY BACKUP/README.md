# AI Cash Evolution - ML LSTM API

Sistema di Machine Learning basato su LSTM per l'ottimizzazione dei pesi degli indicatori tecnici utilizzati nella generazione di segnali di trading.

## 🎯 Obiettivo del Sistema

Questo sistema è progettato per:

1. **Generare segnali casuali** per creare dati di training
2. **Eseguire paper trading** su OANDA con 0.01 lot size
3. **Analizzare performance** dei segnali generati
4. **Addestrare modelli LSTM** per ottimizzare pesi indicatori
5. **Aggiornare settimanalmente** i pesi nel database principale

## 📁 Struttura del Progetto

```
AI CASH REVOLUTION RAILWAY/
├── README.md                    # Questo file
├── app.py                      # Flask API principale
├── requirements.txt            # Dipendenze Python
├── railway.toml               # Configurazione Railway
├── Dockerfile                 # Container Docker
├── DEPLOYMENT.md              # Guida deployment dettagliata
├── ml_training_schema.sql     # Schema database ML
├── ml-random-signals/         # Edge function Supabase
│   └── index.ts              # Generatore segnali casuali
├── models/                    # Modelli ML
│   ├── __init__.py
│   ├── lstm_trainer.py       # Training LSTM
│   └── weight_optimizer.py   # Ottimizzazione pesi
├── services/                  # Servizi business logic
│   ├── __init__.py
│   ├── database.py           # Connessione Supabase
│   ├── data_processor.py     # Processing dati training
│   └── predictor.py          # Predizione segnali
└── utils/                     # Utilità
    ├── __init__.py
    ├── config.py             # Configurazioni
    └── indicators.py         # Calcolo indicatori tecnici
```

## 🚀 Architettura del Sistema

### 1. Pipeline Dati Completa

```
Random Signal Generation → OANDA Paper Trading → Performance Tracking →
Database Storage → LSTM Training → Weight Optimization →
Signal Generation Updates
```

### 2. Componenti Principali

#### **ML Random Signals Generator** (`ml-random-signals/index.ts`)
- Genera 10+ segnali per simbolo ogni ora
- Calcola 16+ indicatori tecnici per ogni segnale
- Esegue trades su conto OANDA paper trading
- Salva tutti i dati nel database Supabase

#### **LSTM Trainer** (`models/lstm_trainer.py`)
- Addestra reti neurali LSTM su dati storici
- Prepara sequenze temporali per time series analysis
- Calcola feature importance con gradienti
- Salva modelli e artifacts

#### **Weight Optimizer** (`models/weight_optimizer.py`)
- Ottimizza pesi indicatori basati su performance
- Combina feature importance LSTM e performance storica
- Applica constraints per categoria di indicatori
- Mantiene stabilità pesi nel tempo

#### **Prediction Service** (`services/predictor.py`)
- Genera predizioni con pesi ottimizzati
- Calcola score confidenza multi-fattore
- Fornisce metriche di rischio e momentum
- Supporta tutti i 26 simboli trading

### 3. Database Schema

5 tabelle principali:
- `ml_training_samples` - Segnali generati con indicatori
- `ml_model_performance` - Metriche training modelli
- `ml_generation_logs` - Logs batch generazione
- `ml_indicator_weights` - Pesi ottimizzati indicatori
- `oanda_paper_trades` - Trades eseguiti su OANDA

## 🛠️ Setup e Deployment

### Prerequisiti

1. **Account Railway** attivo
2. **Repository GitHub** per il codice
3. **Database Supabase** con schema ML applicato
4. **Account OANDA** con paper trading

### Setup Database

1. Applica lo schema nel tuo database Supabase:
   ```sql
   -- Esegui il file ml_training_schema.sql
   ```

2. Configura le environment variables in Railway:
   ```bash
   DATABASE_URL=postgresql://...
   SUPABASE_URL=https://...
   SUPABASE_KEY=...
   OANDA_API_KEY=...
   OANDA_ACCOUNT_ID=...
   ```

### Deploy su Railway

1. **Fork** questa repository su GitHub
2. **Connetti Railway** alla repository
3. **Configura environment variables**
4. **Deploy automatico** al push

Per dettagli completi, vedi `DEPLOYMENT.md`.

## 📊 Funzionalità API

### Endpoints Principali

#### **Health Check**
```bash
GET /health
```
Stato sistema e connessioni

#### **Training Model**
```bash
POST /train
Content-Type: application/json

{
  "force_retrain": false,
  "model_version": "v1.0"
}
```
Avvia training LSTM con dati recenti

#### **Prediction**
```bash
POST /predict
Content-Type: application/json

{
  "symbol": "EURUSD",
  "indicators": {
    "adx_value": 35.5,
    "rsi_value": 65.2,
    "ema_12": 1.0850,
    "ema_21": 1.0840,
    "entry_price": 1.0855
  }
}
```
Predizione segnale con pesi ottimizzati

#### **Performance Metrics**
```bash
GET /performance?days=30&model_version=v1.0
```
Metriche performance modello

#### **Current Weights**
```bash
GET /weights
```
Pesi correnti indicatori

## 🔄 Workflow Automatico

### 1. Generazione Segnali (Ogni ora)
- Edge function genera segnali casuali
- Calcola indicatori tecnici completi
- Esegue trades paper su OANDA
- Salva dati in database

### 2. Training LSTM (Settimanale)
- Recupera 90 giorni di dati storici
- Addestra modello LSTM
- Calcola feature importance
- Ottimizza pesi indicatori

### 3. Aggiornamento Pesi
- Salva pesi ottimizzati nel database
- Aggiorna sistema principale generate-ai-signals
- Mantiene versionamento modelli

## 📈 Indicatori Tecnici Supportati

### Trend Indicators
- **ADX** - Average Directional Index
- **EMA 12/21/50** - Exponential Moving Averages
- **VWAP** - Volume Weighted Average Price

### Momentum Indicators
- **RSI** - Relative Strength Index
- **Stochastic** - Stochastic Oscillator
- **MACD** - Moving Average Convergence Divergence
- **Price Change %** - Variazione percentuale prezzo

### Volatility Indicators
- **ATR** - Average True Range
- **Bollinger Bands** - Upper/Lower bands
- **Volatility %** - Volatilità percentuale

### Volume Indicators
- **Volume MA** - Media mobile volume

## 🎯 Simboli Supportati (26)

### Forex Major (7)
`EURUSD`, `GBPUSD`, `USDJPY`, `USDCHF`, `USDCAD`, `AUDUSD`, `NZDUSD`

### Forex Minor (18)
`EURGBP`, `EURJPY`, `EURCHF`, `EURCAD`, `EURAUD`, `EURNZD`,
`GBPJPY`, `GBPCHF`, `GBPCAD`, `GBPAUD`, `GBPNZD`, `CHFJPY`,
`CADJPY`, `AUDJPY`, `NZDJPY`, `CADCHF`, `AUDCHF`, `NZDCHF`,
`AUDCAD`, `NZDCAD`, `AUDNZD`

### Metalli (1)
`XAUUSD` - Gold

### Criptovalute (2)
`BTCUSD` - Bitcoin
`ETHUSD` - Ethereum

## 📊 Metriche di Performance

### Trading Metrics
- **Win Rate** - Percentuale trade proficui
- **Profit Factor** - Ratio profitti/perdite
- **Sharpe Ratio** - Risk-adjusted returns
- **Max Drawdown** - Perdita massima

### Model Metrics
- **Accuracy** - Accuratezza predizioni
- **Precision/Recall** - Per classe BUY/SELL
- **F1 Score** - Media armonica precision/recall
- **Feature Importance** - Importanza indicatori

### Financial Metrics
- **Avg Profit/Trade** - Profitto medio per trade
- **Success Rate** - Tasso successo segnali
- **Confidence Score** - Confidenza media predizioni

## 🛡️ Gestione del Rischio

### Parametri di Risk Management
- **Lot Size**: 0.01 (fisso per paper trading)
- **Risk/Reward**: 1:1 (ATR-based)
- **Stop Loss**: 0.8-1.2x ATR
- **Take Profit**: 1:1 ratio
- **Min Confidence**: 55% per esecuzione

### Classificazione Rischio
- **LOW**: Score < 40%, volatilità bassa
- **MEDIUM**: Score 40-70%, condizioni normali
- **HIGH**: Score > 70% o volatilità alta

## 📝 Logs e Monitoring

### Log Levels
- **INFO**: Operazioni normali
- **WARN**: Performance degradation
- **ERROR**: Fallimenti critici

### Monitoring Metrics
- **Training Status** - Stato corrente training
- **Model Performance** - Metriche modello
- **Signal Generation** - Statistiche generazione
- **API Health** - Stato endpoint

## 🐛 Troubleshooting

### Common Issues

#### **Database Connection**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

#### **Memory Issues**
Riduci batch size in railway.toml:
```toml
LSTM_BATCH_SIZE = "16"
```

#### **Training Timeout**
Aumenta timeout gunicorn:
```bash
gunicorn app:app --timeout 300
```

#### **OANDA API Limits**
- Rate limit: 100 requests/second
- Paper trading: 5000 requests/day

### Debug Mode
Abilita DEBUG environment variable:
```bash
DEBUG = "true"
LOG_LEVEL = "DEBUG"
```

## 🤝 Integrazione con Sistema Principale

### 1. Database Condivisione
- Usa stesso database Supabase
- Tabelle separate per evitare conflitti
- Views per dati condivisi

### 2. Weight Updates
- LSTM API aggiorna pesi in `ml_indicator_weights`
- Sistema principale legge pesi ottimizzati
- Update automatico ogni settimana

### 3. Signal Flow
- Random signals → Paper trades → Performance data
- Training LSTM → Optimized weights → Better signals
- Continuous improvement loop

## 📋 TODO List

- [ ] Dashboard monitoring real-time
- [ ] Email/Slack notifications per training
- [ ] Support per additional timeframes
- [ ] Ensemble models per predictions
- [ ] Backtesting framework avanzato
- [ ] Mobile app per monitoring

## 📄 Licenza

MIT License - Vedi file LICENSE per dettagli

## 📞 Support

- **Issues**: GitHub repository issues
- **Documentation**: `DEPLOYMENT.md`
- **Email**: support@aicashrevolution.com
- **Discord**: [Server Discord]

---

**Sviluppato con ❤️ da AI Cash Revolution Team**

*Ultimo aggiornamento: 18 Ottobre 2025*