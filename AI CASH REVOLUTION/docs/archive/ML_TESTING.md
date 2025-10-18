# ML System Testing Guide

## 🧪 Come Testare il Sistema ML

### 1. Accesso alla Pagina di Test

Naviga su: **http://localhost:8080/ml-test**

### 2. Test Automatici del Sistema

La pagina include una suite completa di test per verificare tutti i componenti ML:

#### Test Disponibili:
1. **TensorFlow.js Backend** - Verifica che TF.js sia inizializzato (WebGL o CPU)
2. **PPO Model Creation** - Crea modello PPO (Proximal Policy Optimization)
3. **CPPO Model Creation** - Crea modello CPPO (Constrained PPO) con safety constraints
4. **PPO Inference** - Test inferenza real-time con dati OANDA
5. **CPPO Constraint Check** - Verifica sistema di constraint per risk management
6. **Uncertainty Quantification** - Test epistemic + aleatoric uncertainty
7. **Training Pipeline** - Verifica pipeline di training
8. **Model Persistence** - Test salvataggio/caricamento modelli da IndexedDB
9. **Memory Management** - Verifica cleanup memoria TensorFlow.js

#### Come Eseguire:
1. Clicca **"Run Tests"**
2. Attendi completamento (~5-10 secondi)
3. Verifica risultati:
   - ✅ Verde = Test passato
   - ❌ Rosso = Test fallito (con dettaglio errore)

### 3. Test Generazione Segnali ML

#### Signal Generation Test:
1. Seleziona una coppia (EURUSD, GBPUSD, USDJPY, XAUUSD, BTCUSD)
2. Il pannello MLSignalsPanel si auto-attiva
3. Verifica:
   - **Action**: BUY/SELL/HOLD
   - **Confidence**: Percentuale affidabilità
   - **Entry/SL/TP**: Livelli di prezzo con decimali corretti
   - **Uncertainty**: Epistemic + Aleatoric + Total
   - **Constraints**: Eventuali violazioni safety

#### Cosa Verificare:
- ✅ Prezzi FOREX mostrano 5 decimali (es: 1.16610)
- ✅ Prezzi GOLD/SILVER mostrano 2 decimali (es: 3942.90)
- ✅ Confidence tra 40% e 95%
- ✅ Uncertainty total < 30%
- ✅ Constraints severity: low/medium/high

### 4. Integrazione con OANDA

Il sistema ML usa **dati reali OANDA**:

#### Flusso Dati:
1. MLSignalService chiama Edge Function `oanda-market-data`
2. Edge Function recupera:
   - Current price (bid/ask/spread)
   - Historical candles (200 per indicatori)
   - Technical indicators (RSI, MACD, ATR, SMA, EMA, Stochastic)
3. Feature engineering (50 features)
4. TensorFlow.js inference (PPO + CPPO ensemble)
5. Uncertainty quantification
6. Constraint validation
7. Signal formatting

#### Verifica OANDA:
- Controlla che i prezzi siano realistici
- Verifica che i segnali cambino con il mercato
- Controlla che gli indicatori tecnici siano calcolati

### 5. Fallback e Error Handling

#### Database Cache Fallback:
Se OANDA API fallisce:
1. Sistema prova cache database `market_data_cache`
2. Se anche questo fallisce → errore "No market data available"

#### Error Scenarios da Testare:
- ❌ OANDA API offline → verifica fallback a cache
- ❌ Symbol non valido → errore chiaro
- ❌ Timeout (>10s) → abort request
- ❌ Network error → retry con cache

### 6. Console Browser - Debug Info

Apri Developer Tools (F12) e controlla Console:

#### Log Attesi:
```
🚀 Initializing ML Signal Service...
📍 TensorFlow.js backend: webgl
✅ Loaded pre-trained PPO model
✅ Loaded pre-trained CPPO model
✅ ML Signal Service initialized
🤖 Generating ML signal for EURUSD...
✅ ML signal generated in 87ms: {action: 'BUY', confidence: 0.82, uncertainty: 0.15}
```

#### Warning/Error da Investigare:
- ⚠️ "No pre-trained model found" → OK, usa pesi inizializzati
- ⚠️ "OANDA API failed, trying database cache" → Verifica API key
- ❌ "Inference engine not initialized" → Problema TF.js
- ❌ "No market data available" → Problema OANDA + cache

### 7. Performance Metrics

#### Target Performance:
- **Inference Latency**: < 100ms
- **Memory Usage**: < 100MB per model
- **Model Size**: ~5MB total
- **Initialization**: < 2s

#### Come Verificare:
1. Nella pagina `/ml-test` → sezione test results
2. Check "duration" per ogni test
3. Memory info nel browser DevTools → Performance Monitor

### 8. Continuous Learning

Il sistema salva trade results per continuous learning:

#### Tabelle Database:
- `ml_training_samples` - Features + actions + rewards
- `ml_training_metrics` - Training progress
- `ml_model_versions` - Model versioning
- `ml_predictions_log` - Prediction history
- `ml_performance_analytics` - Performance view

#### Verifica Learning:
1. Genera alcuni segnali
2. Controlla tabella `ml_training_samples` in Supabase
3. Ogni predizione dovrebbe essere loggata con:
   - Features (50-dim vector)
   - Action (0=HOLD, 1=BUY, 2=SELL)
   - Reward (calcolato da P&L)

### 9. Spiegazioni in Italiano

I segnali AI ora hanno spiegazioni discorsive in italiano:

#### Esempio Output:
```
"Il mercato presenta opportunità di acquisto. con un trend ben definito.
durante la sessione di Londra. La volatilità contenuta favorisce movimenti
più prevedibili. Il momentum è positivo ma senza eccessi. L'analisi tecnica
fornisce un livello di affidabilità elevato (85%)."
```

#### Verifica:
- ✅ Testo fluido in italiano
- ✅ Nessuna percentuale intermedia (solo confidence finale)
- ✅ Contestualizzazione: trend, sessione, volatilità, RSI
- ✅ Finale con livello affidabilità

### 10. Troubleshooting

#### Problema: Modelli non si caricano
**Soluzione**:
1. Controlla IndexedDB (DevTools → Application → IndexedDB)
2. Esegui `ModelInitializer.ensureModelsExist()`
3. Verifica memoria disponibile (min 200MB)

#### Problema: Prezzi sempre uguali
**Soluzione**:
1. Verifica OANDA API key in Supabase secrets
2. Check Edge Function `oanda-market-data` deploy status
3. Test manuale: `curl https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/oanda-market-data -d '{"symbol":"EURUSD"}'`

#### Problema: Uncertainty sempre alta (>50%)
**Soluzione**:
1. Modelli non trained → normale all'inizio
2. Dopo 50+ samples dovrebbe scendere
3. Check training samples in DB

#### Problema: Tutti segnali HOLD
**Soluzione**:
1. Constraints troppo restrittivi
2. Confidence threshold troppo alto
3. Verifica `config.uncertaintyThreshold` (default 0.3)

### 11. Production Readiness Checklist

Prima del deploy production:

- [ ] Tutti i 9 test automatici passano
- [ ] Inferenza < 100ms
- [ ] Memory leak free (run 100+ predictions)
- [ ] OANDA API key production configurata
- [ ] Database tables esistono
- [ ] Edge Functions deployed
- [ ] Model versioning attivo
- [ ] Logging configurato
- [ ] Error handling completo
- [ ] Spiegazioni italiane verificate

---

## 📊 Metriche Attese

### Win Rate Target
- **Good**: > 55%
- **Excellent**: > 60%

### Sharpe Ratio Target
- **Good**: > 1.5
- **Excellent**: > 2.0

### Confidence Distribution
- **High (>80%)**: 20-30% dei segnali
- **Medium (60-80%)**: 50-60% dei segnali
- **Low (<60%)**: 10-20% dei segnali

### Constraint Violations
- **High severity**: < 5%
- **Medium severity**: < 15%
- **Low severity**: < 30%

---

## 🔗 Risorse Utili

- **Test Page**: http://localhost:8080/ml-test
- **Supabase Dashboard**: https://supabase.com/dashboard/project/rvopmdflnecyrwrzhyfy
- **TensorFlow.js Docs**: https://www.tensorflow.org/js
- **OANDA API Docs**: https://developer.oanda.com/rest-live-v20/introduction/

---

**Status**: ✅ Sistema ML completamente operativo con dati reali OANDA
**Last Updated**: 2025-10-06
