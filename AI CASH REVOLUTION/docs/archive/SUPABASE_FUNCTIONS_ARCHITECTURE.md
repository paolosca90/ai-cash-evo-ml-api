# 🏗️ Architettura Funzioni Supabase - AI Cash Evolution

## 📋 Panoramica Sistema

Il sistema AI Cash Evolution utilizza **48 Edge Functions** Supabase divise in categorie funzionali.

---

## 🎯 FUNZIONI CORE - PRODUZIONE

### 1. **generate-ai-signals** ⭐ PRINCIPALE
- **Path**: `supabase/functions/generate-ai-signals/`
- **Dimensione**: 3634 righe
- **Scopo**: Generatore principale di segnali AI con analisi multi-timeframe completa
- **Tecnologie**: 
  - TradingView API per dati reali
  - Analisi tecnica avanzata (RSI, MACD, EMA, Bollinger Bands)
  - Smart Money Concepts (CHoCH, BOS, Order Blocks)
  - Market regime detection (Trend/Range)
  - News sentiment integration
  - Session-based volatility adjustments
- **Features**:
  - Multi-timeframe analysis (M1, M5, M15, H1)
  - Dynamic ATR calculation
  - Intelligent SL/TP placement
  - Confidence scoring (40-95%)
  - Risk management (0.5-1.5% per trade)
- **Utilizzo**: Chiamata principale dal frontend per generare segnali professionali
- **Status**: ✅ **ATTIVO E IN USO**

### 2. **mt5-trade-signals**
- **Path**: `supabase/functions/mt5-trade-signals/`
- **Scopo**: Crea segnali nella tabella `mt5_signals` per l'Expert Advisor MT5
- **Workflow**:
  1. Riceve segnale AI generato
  2. Formatta per MT5 (symbol, direction, entry, SL, TP)
  3. Inserisce in `mt5_signals` con `sent=false`
  4. EA MT5 fa polling e esegue
- **Status**: ✅ **ATTIVO E IN USO**

### 3. **mt5-trade-signals-enhanced**
- **Path**: `supabase/functions/mt5-trade-signals-enhanced/`
- **Scopo**: Versione migliorata con validazione avanzata
- **Features aggiuntive**:
  - Validazione spread
  - Check orari di trading
  - Risk percentage validation
  - Duplicate signal prevention
- **Status**: ✅ **ATTIVO E IN USO**

### 4. **mt5-trade-update**
- **Path**: `supabase/functions/mt5-trade-update/`
- **Scopo**: Webhook per aggiornamenti da MT5 EA
- **Dati ricevuti**:
  - Trade ID
  - Status (opened, closed, cancelled)
  - P&L finale
  - Timestamp esecuzione
- **Azioni**: Aggiorna tabella `mt5_signals` con risultati reali
- **Status**: ✅ **ATTIVO E IN USO**

### 5. **realtime-trade-webhook**
- **Path**: `supabase/functions/realtime-trade-webhook/`
- **Scopo**: Webhook real-time per notifiche istantanee da MT5
- **Features**:
  - Notifiche push al frontend
  - Aggiornamento dashboard live
  - Performance tracking real-time
- **Status**: ✅ **ATTIVO E IN USO**

---

## 📊 FUNZIONI DATA & MARKET

### 6. **tradingview-market-data**
- **Scopo**: Fetch dati di mercato da TradingView API
- **Dati**:
  - OHLCV multi-timeframe
  - Indicatori tecnici (RSI, MACD, Stochastic)
  - Volume profile
- **Status**: ✅ **ATTIVO E IN USO**

### 7. **fetch-economic-calendar**
- **Scopo**: Recupera calendario economico da Investing.com
- **Dati**: Eventi macro (NFP, CPI, GDP, FOMC)
- **Impact filtering**: High/Medium/Low
- **Status**: ✅ **ATTIVO E IN USO**

### 8. **fetch-financial-news**
- **Scopo**: Scarica notizie finanziarie da NewsAPI
- **Categorie**: Forex, Commodities, Crypto
- **Status**: ✅ **ATTIVO E IN USO**

### 9. **fetch-investing-news-it**
- **Scopo**: Notizie italiane da Investing.com
- **Lingua**: Italiano
- **Status**: ✅ **ATTIVO E IN USO**

### 10. **historical-data-cache**
- **Scopo**: Cache dati storici per ML training
- **Time range**: 90 giorni di OHLCV
- **Symbols**: Tutti i major pairs + metalli
- **Status**: ✅ **ATTIVO E IN USO**

### 11. **crypto-price-feed**
- **Scopo**: Feed prezzi crypto real-time
- **Assets**: BTC, ETH, XRP, ADA, SOL
- **Update frequency**: 30 secondi
- **Status**: ✅ **ATTIVO SE CRYPTO ABILITATO**

---

## 🤖 FUNZIONI MACHINE LEARNING

### 12. **advanced-ml-signals**
- **Scopo**: Segnali ML avanzati con ensemble models
- **Models**: XGBoost + LightGBM + Neural Network
- **Features**: 50+ feature engineering
- **Status**: ✅ **ATTIVO E IN USO**

### 13. **ml-auto-retrain**
- **Scopo**: Retrain automatico modelli ML
- **Trigger**: Ogni 7 giorni o performance degradation
- **Data**: Ultimi 90 giorni di segnali
- **Status**: ✅ **ATTIVO E IN USO**

### 14. **ml-performance-tracker**
- **Scopo**: Tracking performance modelli ML
- **Metriche**: 
  - Accuracy
  - Precision/Recall
  - Win rate
  - Average R:R
  - Sharpe ratio
- **Status**: ✅ **ATTIVO E IN USO**

### 15. **ml-signal-optimizer**
- **Scopo**: Ottimizzazione parametri segnali ML
- **Ottimizza**:
  - Entry timing
  - SL/TP distances
  - Confidence thresholds
- **Status**: ✅ **ATTIVO E IN USO**

### 16. **ml-weight-optimizer**
- **Scopo**: Ottimizzazione pesi features ML
- **Algoritmo**: Bayesian Optimization
- **Status**: ✅ **ATTIVO E IN USO**

### 17. **ml-trading-optimizer**
- **Scopo**: Ottimizzazione strategia trading complessiva
- **Parameters**: 
  - Risk per trade
  - Max drawdown
  - Position sizing
- **Status**: ✅ **ATTIVO E IN USO**

### 18. **trade-optimization-trigger**
- **Scopo**: Trigger per ottimizzazioni automatiche
- **Schedule**: Ogni lunedì 00:00 UTC
- **Status**: ✅ **ATTIVO E IN USO**

### 19. **trading-auto-optimizer**
- **Scopo**: Ottimizzatore completo con A/B testing
- **Status**: ✅ **ATTIVO E IN USO**

---

## 🧠 REINFORCEMENT LEARNING

### 20. **rl-inference**
- **Scopo**: Inference model RL per decisioni trading
- **Algorithm**: PPO (Proximal Policy Optimization)
- **Actions**: BUY, SELL, HOLD, CLOSE
- **Status**: ✅ **ATTIVO E IN USO**

### 21. **finrl-deepseek-relay**
- **Scopo**: Relay per modello FinRL + DeepSeek AI
- **Features**: Deep reinforcement learning + LLM reasoning
- **Status**: ✅ **ATTIVO E IN USO**

---

## 💡 ANALISI AVANZATA

### 22. **smart-money-concepts-analyzer**
- **Scopo**: Analisi Smart Money Concepts (SMC)
- **Concepts**:
  - Change of Character (CHoCH)
  - Break of Structure (BOS)
  - Order Blocks (OB)
  - Fair Value Gaps (FVG)
  - Liquidity sweeps
- **Status**: ✅ **ATTIVO E IN USO**

### 23. **llm-sentiment**
- **Scopo**: Sentiment analysis con LLM (GPT-4/Claude)
- **Input**: News + social media + calendar events
- **Output**: Bullish/Bearish/Neutral score
- **Status**: ✅ **ATTIVO E IN USO**

---

## 🔐 AUTENTICAZIONE & UTENTI

### 24. **auth-webhook**
- **Scopo**: Webhook per eventi auth Supabase
- **Eventi**: signup, signin, password_reset
- **Azioni**: Crea profili utente, invia email
- **Status**: ✅ **ATTIVO E IN USO**

### 25. **auth-email-handler**
- **Scopo**: Handler email personalizzate auth
- **Templates**: Welcome, reset password, verify email
- **Status**: ✅ **ATTIVO E IN USO**

### 26. **send-auth-email**
- **Scopo**: Invio email autenticazione
- **Provider**: Resend.com API
- **Status**: ✅ **ATTIVO E IN USO**

### 27. **send-reset-email**
- **Scopo**: Email reset password
- **Status**: ✅ **ATTIVO E IN USO**

### 28. **password-reset-email**
- **Scopo**: Template email reset password
- **Status**: ✅ **ATTIVO E IN USO**

### 29. **welcome-email**
- **Scopo**: Email benvenuto nuovi utenti
- **Content**: Guida iniziale, features, link dashboard
- **Status**: ✅ **ATTIVO E IN USO**

### 30. **user-api-keys**
- **Scopo**: Gestione API keys utenti
- **Operations**: Create, Read, Revoke
- **Security**: Hashed storage, rate limiting
- **Status**: ✅ **ATTIVO E IN USO**

---

## 💳 PAGAMENTI & SUBSCRIPTIONS

### 31. **create-checkout**
- **Scopo**: Crea sessione checkout Stripe
- **Plans**: Basic, Pro, Premium
- **Status**: ✅ **ATTIVO E IN USO**

### 32. **create-stripe-setup**
- **Scopo**: Setup metodo pagamento Stripe
- **Status**: ✅ **ATTIVO E IN USO**

### 33. **customer-portal**
- **Scopo**: Portale cliente Stripe
- **Features**: Cancel subscription, update payment method
- **Status**: ✅ **ATTIVO E IN USO**

### 34. **check-subscription**
- **Scopo**: Verifica stato subscription utente
- **Check**: Active, expired, trial
- **Status**: ✅ **ATTIVO E IN USO**

### 35. **create-payment-qr**
- **Scopo**: Genera QR code per pagamenti crypto
- **Coins**: BTC, ETH, USDT
- **Status**: ✅ **ATTIVO SE CRYPTO PAYMENT ABILITATO**

### 36. **verify-crypto-payment**
- **Scopo**: Verifica pagamenti crypto on-chain
- **Blockchain**: Bitcoin, Ethereum
- **Status**: ✅ **ATTIVO SE CRYPTO PAYMENT ABILITATO**

### 37. **crypto-renewal-reminder**
- **Scopo**: Reminder rinnovo subscription crypto
- **Schedule**: 3 giorni prima scadenza
- **Status**: ✅ **ATTIVO SE CRYPTO PAYMENT ABILITATO**

---

## 🔧 UTILITY & MAINTENANCE

### 38. **cleanup-old-signals**
- **Scopo**: Pulizia segnali vecchi dal database
- **Retention**: 90 giorni
- **Schedule**: Ogni domenica 02:00 UTC
- **Status**: ✅ **ATTIVO E IN USO**

### 39. **update-economic-calendar**
- **Scopo**: Update settimanale calendario economico
- **Schedule**: Ogni lunedì 01:00 UTC
- **Status**: ✅ **ATTIVO E IN USO**

### 40. **price-tick-cron**
- **Scopo**: Cron per aggiornamento prezzi tick
- **Frequency**: Ogni 5 secondi (se abilitato)
- **Status**: ⚠️ **ATTIVO MA RESOURCE INTENSIVE**

### 41. **signal-tick-monitor**
- **Scopo**: Monitoring stato segnali attivi
- **Check**: SL hit, TP reached, time decay
- **Status**: ✅ **ATTIVO E IN USO**

---

## 🧪 FUNZIONI TEST/DEBUG - DA RIMUOVERE

### ❌ 42. **generate-ai-signals-test**
- **Scopo**: Test function per debug
- **Motivo rimozione**: Solo per development, non usato in produzione
- **Status**: ⛔ **DA RIMUOVERE**

### ❌ 43. **generate-ai-signals-simple**
- **Scopo**: Generatore semplificato con segnali mock
- **Motivo rimozione**: Sostituito da generate-ai-signals principale
- **Status**: ⛔ **DA RIMUOVERE**

### ❌ 44. **generate-ai-signals-fast**
- **Scopo**: Versione veloce con logica semplificata
- **Motivo rimozione**: Non più necessario, generate-ai-signals è ottimizzato
- **Status**: ⛔ **DA RIMUOVERE**

### ❌ 45. **generate-ai-signals-public**
- **Scopo**: Versione pubblica senza auth per testing
- **Motivo rimozione**: Security risk, usato solo per demo
- **Status**: ⛔ **DA RIMUOVERE**

### ❌ 46. **random-signal-scheduler**
- **Scopo**: Genera segnali random per testing
- **Motivo rimozione**: Non serve in produzione, inquina i dati
- **Status**: ⛔ **DA RIMUOVERE**

### ❌ 47. **synthetic-signal-generator**
- **Scopo**: Genera segnali sintetici per ML training
- **Motivo rimozione**: Preferibile usare dati reali, può bias il modello
- **Status**: ⛔ **DA RIMUOVERE**

### ❌ 48. **reset-mt5-signals**
- **Scopo**: Reset manuale stato segnali MT5
- **Motivo rimozione**: Debug utility, non per produzione
- **Status**: ⛔ **DA RIMUOVERE**

---

## 📊 STATISTICHE SISTEMA

### Funzioni Totali
- **Totale**: 48 funzioni
- **Attive in produzione**: 41 funzioni
- **Da rimuovere**: 7 funzioni

### Breakdown per Categoria
| Categoria | Numero | % |
|-----------|--------|---|
| Core Trading | 5 | 12% |
| Data & Market | 7 | 17% |
| Machine Learning | 8 | 20% |
| RL & AI Avanzato | 2 | 5% |
| Analisi | 2 | 5% |
| Auth & Users | 7 | 17% |
| Payments | 7 | 17% |
| Utility | 4 | 10% |
| Test/Debug | 7 | 17% |

### Dimensioni Codice
- **Totale righe**: ~25,000 righe TypeScript
- **Funzione più grande**: generate-ai-signals (3,634 righe)
- **Media per funzione**: ~520 righe

---

## 🔄 WORKFLOW PRINCIPALE

### 1. Generazione Segnale
```
Frontend Request
    ↓
generate-ai-signals
    ↓
TradingView API (dati reali)
    ↓
Multi-timeframe Analysis
    ↓
Smart Money Concepts
    ↓
ML Model Inference (optional)
    ↓
Confidence Scoring (40-95%)
    ↓
Segnale Generato
```

### 2. Esecuzione Trade MT5
```
Segnale Generato
    ↓
mt5-trade-signals-enhanced
    ↓
Insert in mt5_signals table (sent=false)
    ↓
MT5 EA Polling (ogni 5 secondi)
    ↓
EA Fetch segnale
    ↓
Validate & Execute Trade
    ↓
mt5-trade-update webhook
    ↓
Update mt5_signals (status, P&L)
    ↓
realtime-trade-webhook
    ↓
Frontend Update Live
```

### 3. ML Training Loop
```
historical-data-cache (download data)
    ↓
ml-auto-retrain (ogni 7 giorni)
    ↓
feature engineering (50+ features)
    ↓
train XGBoost + LightGBM + NN
    ↓
ml-performance-tracker (validate)
    ↓
ml-weight-optimizer (tune)
    ↓
Deploy nuovo modello
    ↓
advanced-ml-signals (use in production)
```

---

## 🗄️ DATABASE TABLES

### Principali Tabelle Utilizzate
1. **ai_signals**: Segnali generati dall'AI
2. **mt5_signals**: Segnali per MT5 EA
3. **mt5_trades**: Trades eseguiti da MT5
4. **user_profiles**: Profili utenti
5. **subscriptions**: Subscription status
6. **economic_calendar**: Eventi economici
7. **news_articles**: Notizie finanziarie
8. **ml_models**: Modelli ML salvati
9. **ml_performance**: Metriche performance ML
10. **api_keys**: API keys utenti

---

## 🔐 SECURITY & RATE LIMITING

### Autenticazione
- JWT tokens Supabase
- Service role key per cron jobs
- API key validation per external access

### Rate Limits
- **generate-ai-signals**: 10 calls/minute per user
- **mt5-trade-signals**: 5 calls/minute per user
- **tradingview-market-data**: 30 calls/minute global
- **llm-sentiment**: 5 calls/minute per user

### CORS
- Origine: `*` (da restringere in produzione)
- Headers: Authorization, Content-Type, ApiKey

---

## 📈 PERFORMANCE

### Tempi di Risposta Medi
- **generate-ai-signals**: 8-15 secondi
- **mt5-trade-signals**: 100-300ms
- **tradingview-market-data**: 500-1500ms
- **ml inference**: 200-800ms
- **smart-money-concepts-analyzer**: 2-5 secondi

### Ottimizzazioni Implementate
- ✅ Cache TradingView data (5 minuti)
- ✅ Parallel API calls
- ✅ Database indexing
- ✅ Connection pooling
- ✅ Lazy loading modelli ML

---

## 🚀 DEPLOYMENT

### Environment Variables Required
```env
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TRADINGVIEW_API_KEY (se disponibile)
NEWS_API_KEY
RESEND_API_KEY (email)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
OPENAI_API_KEY (per LLM)
ANTHROPIC_API_KEY (per Claude)
```

### Cron Jobs Configurati
```sql
-- _cron_config.sql
- cleanup-old-signals: 0 2 * * 0 (Domenica 02:00)
- update-economic-calendar: 0 1 * * 1 (Lunedì 01:00)
- ml-auto-retrain: 0 3 * * 1 (Lunedì 03:00)
- trade-optimization-trigger: 0 0 * * 1 (Lunedì 00:00)
- price-tick-cron: */5 * * * * (Ogni 5 secondi - SE ABILITATO)
```

---

## 📝 AZIONI RACCOMANDATE

### Immediate (Oggi)
1. ✅ Rimuovere 7 funzioni test/debug
2. ✅ Aggiornare documentazione API
3. ✅ Configurare rate limits produzione

### Short-term (Questa settimana)
1. ⚠️ Restringere CORS origins
2. ⚠️ Implementare API key rotation
3. ⚠️ Setup monitoring errors (Sentry)
4. ⚠️ Ottimizzare query database più lente

### Medium-term (Questo mese)
1. 🔄 Implementare caching layer (Redis)
2. 🔄 Split generate-ai-signals in micro-services
3. 🔄 Setup CI/CD pipeline
4. 🔄 Load testing & stress testing

### Long-term (Prossimi 3 mesi)
1. 🎯 Kubernetes deployment
2. 🎯 Multi-region deployment
3. 🎯 Real-time websockets invece di polling
4. 🎯 Blockchain per signal tracking immutabile

---

## 📚 RIFERIMENTI

- **Documentazione Supabase**: https://supabase.com/docs
- **TradingView API**: Custom integration
- **Smart Money Concepts**: docs/SMART_MONEY_CONCEPTS_DOCS.md
- **ML System**: docs/FEATURE_ENGINEERING_README.md
- **RL Trading**: README-RL-TRADING.md

---

**Ultima Revisione**: 2 Ottobre 2025
**Versione**: 2.0.0
**Autore**: AI Cash Evolution Team
