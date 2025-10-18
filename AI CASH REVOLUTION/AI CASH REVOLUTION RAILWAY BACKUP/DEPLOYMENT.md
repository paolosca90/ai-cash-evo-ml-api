# Deployment Guide - AI Cash Evolution ML LSTM API

## Prerequisiti

1. **Account Railway** attivo
2. **Repository GitHub** per il codice
3. **Database Supabase** configurato
4. **Environment Variables** disponibili

## Setup Database Supabase

1. Applica la migration del database:
   ```sql
   -- Esegui il file ml_training_schema.sql nel tuo database Supabase
   ```

2. Ottieni le credenziali:
   - Supabase URL
   - Supabase Service Role Key
   - Database Connection String

## Setup Repository GitHub

1. Fork/Clona la repository: `https://github.com/paolosca90/ai-cash-evo-ml-api`

2. Push del codice:
   ```bash
   git add .
   git commit -m "Initial LSTM API implementation"
   git push origin main
   ```

## Deploy su Railway

### 1. Connetti Railway a GitHub

1. Vai su [Railway Dashboard](https://railway.app/dashboard)
2. Clicca "New Project" → "Deploy from GitHub repo"
3. Seleziona la repository `ai-cash-evo-ml-api`
4. Railway rileverà automaticamente il `Dockerfile`

### 2. Configura Environment Variables

Nella configurazione del progetto Railway, aggiungi:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
SUPABASE_URL=https://[PROJECT_ID].supabase.co
SUPABASE_KEY=[SUPABASE_SERVICE_ROLE_KEY]

# Model Configuration
MODEL_VERSION=v1.0
TRAINING_SCHEDULE="0 2 * * 0"  # Ogni domenica alle 02:00 UTC

# Performance
LSTM_EPOCHS=100
LSTM_BATCH_SIZE=32
LSTM_SEQUENCE_LENGTH=20

# Thresholds
MIN_TRAINING_SAMPLES=100
MIN_ACCURACY=0.55
MIN_WIN_RATE=0.45

# Technical Analysis
ADX_THRESHOLD=25.0
RSI_OVERSOLD=30.0
RSI_OVERBOUGHT=70.0

# Risk Management
DEFAULT_LOT_SIZE=0.01
RISK_REWARD_RATIO=1.0

# API Configuration
DEBUG=false
PORT=8080
LOG_LEVEL=INFO
```

### 3. Deploy Automatico

Railway automaticamente:
- Builda il container Docker
- Deploya l'applicazione
- Assegna un URL pubblico

## Testing Deploy

1. **Health Check**:
   ```bash
   curl https://[YOUR_APP_URL].railway.app/health
   ```

2. **Test Training**:
   ```bash
   curl -X POST https://[YOUR_APP_URL].railway.app/train \
     -H "Content-Type: application/json" \
     -d '{"force_retrain": true}'
   ```

3. **Test Prediction**:
   ```bash
   curl -X POST https://[YOUR_APP_URL].railway.app/predict \
     -H "Content-Type: application/json" \
     -d '{
       "symbol": "EURUSD",
       "indicators": {
         "adx_value": 35.5,
         "rsi_value": 65.2,
         "ema_12": 1.0850,
         "ema_21": 1.0840,
         "entry_price": 1.0855
       }
     }'
   ```

## Configurazione Cron Job Settimanale

### Opzione 1: Railway Cron (Raccomandato)

Nel `railway.toml`, imposta:
```toml
[deploy]
startCommand = "gunicorn app:app --bind 0.0.0.0:$PORT & python scheduler.py"
```

Crea `scheduler.py`:
```python
from apscheduler.schedulers.background import BackgroundScheduler
import requests
import time

def weekly_training():
    try:
        response = requests.post('http://localhost:8080/train',
                              json={'force_retrain': True})
        print(f"Training triggered: {response.status_code}")
    except Exception as e:
        print(f"Training error: {e}")

if __name__ == "__main__":
    scheduler = BackgroundScheduler()
    scheduler.add_job(weekly_training, 'cron', day_of_week='sun', hour=2)
    scheduler.start()

    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        scheduler.shutdown()
```

### Opzione 2: External Cron Service

Usa servizi come:
- **EasyCron**: https://www.easycron.com/
- **Cron-job.org**: https://cron-job.org/
- **GitHub Actions** (se preferisci)

Endpoint da chiamare:
```
POST https://[YOUR_APP_URL].railway.app/train
Content-Type: application/json
{"force_retrain": true}
```

## Monitoring

### 1. Railway Dashboard

- **Metrics**: CPU, Memory, Request counts
- **Logs**: Real-time application logs
- **Builds**: Deploy history

### 2. Health Monitoring

Imposta alert su:
- Health check failures
- Error rates > 5%
- Response time > 2s

### 3. Custom Metrics

L'API espone metriche su:
- `/performance` - Performance modello
- `/training-status` - Stato training

## Troubleshooting

### Database Connection Issues

```bash
# Test connection string
psql $DATABASE_URL -c "SELECT 1;"
```

### Memory Issues

Riduci batch size nel `railway.toml`:
```toml
[env]
LSTM_BATCH_SIZE = "16"
```

### Training Timeout

Aumenta timeout:
```toml
[deploy]
startCommand = "gunicorn app:app --bind 0.0.0.0:$PORT --timeout 300"
```

### Errori Dipendenze

Rebuild con environment variables:
```bash
# In Railway settings
PYTHON_VERSION = "3.11"
```

## Scaling

### Horizontal Scaling

1. Vai su Railway project settings
2. Increase "Instances" a 2-3
3. Abilita "Autoscaling"

### Performance Optimization

1. **Cache pesi indicatori**:
   ```python
   # In weight_optimizer.py
   @lru_cache(maxsize=128)
   def get_cached_weights(self, model_version):
       return self.db_service.get_current_weights()
   ```

2. **Connection pooling**:
   ```python
   # In database.py
   connection_pool = psycopg2.pool.ThreadedConnectionPool(...)
   ```

## Security

1. **HTTPS**: Railway fornisce automaticamente SSL
2. **API Keys**: Usa Railway secrets per environment variables
3. **CORS**: Configurato per domini specifici
4. **Rate Limiting**: Implementare se necessario

## Backup e Recovery

1. **Database**: Supabase ha backup automatici
2. **Model Artifacts**: Salva su Supabase storage o AWS S3
3. **Code**: GitHub version control

## Aggiornamenti

### Rolling Updates

Railway supporta rolling updates:
1. Push nuovo codice a GitHub
2. Railway automaticamente deploya
3. Zero downtime durante deploy

### Model Updates

1. Nuovo training genera nuova versione modello
2. Vecchia versione rimane attiva finché nuova non è validata
3. Rollback automatico se performance degradano

## Costs

### Railway

- **Hobby**: $5/month (sufficiente per development)
- **Pro**: $20/month (production con scaling)

### Supabase

- **Free tier**: 500MB database, 50k requests/month
- **Pro**: $25/month (10GB database, higher limits)

### Costo Totale Stimato

- **Development**: $5/month
- **Production**: $45-50/month

## Support

- **Railway Docs**: https://docs.railway.app/
- **Supabase Docs**: https://supabase.com/docs
- **Issues**: GitHub repository issues
- **Logging**: Controlla Railway logs per debug