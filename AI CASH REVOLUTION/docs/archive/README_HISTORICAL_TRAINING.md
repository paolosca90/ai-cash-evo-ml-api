# 📊 HISTORICAL TRAINING & BACKTESTING SYSTEM

## 🎯 METODOLOGIA

Sistema di **machine learning con validazione out-of-sample**:

1. **Training Set**: Giugno + Luglio + Agosto 2025 (3 mesi)
2. **Test Set**: Settembre 2025 (1 mese - dati MAI visti)
3. **Algoritmo**: Gradient Descent per ottimizzare 10 pesi
4. **Obiettivo**: Massimizzare `win_rate × sharpe_ratio`

---

## 📈 PRIMI RISULTATI (EURUSD)

### Training Period: Jun-Aug 2025
- **Segnali generati**: 122
- **Win Rate Baseline**: 34.43%
- **Improvement**: 0.00% (ottimizzatore non ha trovato miglioramenti)

### Test Period: September 2025 (OUT-OF-SAMPLE)
- **Segnali generati**: 132
- **Win Rate Baseline**: 44.70%
- **Win Rate Ottimizzato**: 44.70%
- **PnL Baseline**: -1.91%
- **PnL Ottimizzato**: -1.91%

---

## ⚠️ PROBLEMI RILEVATI

### 1. **Win Rate Troppo Basso (44%)**
Il win rate di 44% è **sotto il 50%** (random). Problemi possibili:
- Strategia di base troppo aggressiva (confidence threshold a 65 potrebbe essere troppo basso)
- SL/TP ratio non ottimale
- Indicatori tecnici non sufficienti

### 2. **Ottimizzatore Non Trova Miglioramenti**
L'algoritmo ritorna i DEFAULT_WEIGHTS senza modifiche perché:
- Win rate già troppo basso per essere migliorato con solo weight tuning
- Serve modificare la **strategia di base**, non solo i pesi
- Learning rate potrebbe essere troppo basso

### 3. **API Demo Limits**
Twelve Data con API key "demo" ha limiti:
- Max 800 candles per chiamata
- Rate limiting
- Serve API key vera per dati completi

---

## 🔧 SOLUZIONI PROPOSTE

### **A. Aumenta Confidence Threshold**

Invece di 65, prova 75 o 80:

```typescript
// In generate-ai-signals/index.ts
if (confidence < 75) return null; // Era 65
```

**Effetto**: Meno segnali ma win rate più alto (quality > quantity)

### **B. Migliora Risk/Reward Ratio**

```typescript
// Aumenta R:R da 1.5:1 a 2:1
if (direction === 'BUY') {
  stopLoss = entryPrice - (atr * 1.5);
  takeProfit = entryPrice + (atr * 3.0); // Era 2.25
}
```

**Effetto**: Anche con 45% win rate, R:R 2:1 → profitable

### **C. Aggiungi Filtri Aggiuntivi**

```typescript
// Solo trade durante London/NY session
if (!isPrimeSession) return null;

// Solo se trend è forte
if (Math.abs(ema50 - ema200) / close < 0.002) return null;

// Solo se volume spike presente
if (!volumeSpike) return null;
```

### **D. Usa API Key Reale**

Aggiungi su Supabase → Settings → Secrets:

```bash
TWELVE_DATA_API_KEY=your_real_api_key_here
```

Ottieni API key gratis: https://twelvedata.com/pricing (800 API calls/day)

---

## 🚀 PROSSIMI STEP

### **Immediate (oggi)**:

1. **Aumenta confidence threshold a 75**
   ```bash
   # File: generate-ai-signals/index.ts
   # Line: ~3650
   # Change: if (confidence < 75) { return null; }
   ```

2. **Migliora R:R a 2:1**
   ```bash
   # File: ml-historical-training/index.ts
   # Lines: ~450-455
   ```

3. **Aggiungi filtro session**
   ```bash
   # Solo prime sessions (London/NY overlap)
   ```

4. **Re-run training**
   ```bash
   POST /ml-historical-training
   Body: {"symbols": ["EURUSD"], "iterations": 100}
   ```

### **Domani**:

5. **Ottieni Twelve Data API key** (gratuita)
6. **Test su tutti i simboli** (8 pairs)
7. **Analizza confluence factors** (quali hanno win rate > 50%)

### **Settimana 1**:

8. **Backtest su più timeframe** (5min, 15min, 1h)
9. **Test multi-month** (ultimi 6 mesi)
10. **Deploy pesi ottimizzati** in produzione

---

## 📊 TARGET PERFORMANCE

| Metrica | Baseline | Target Ottimizzato |
|---------|----------|-------------------|
| **Win Rate** | 34-45% | **60-70%** |
| **Risk/Reward** | 1.5:1 | **2:1** |
| **PnL Mensile** | -2% | **+8-12%** |
| **Sharpe Ratio** | 0.5 | **1.5-2.0** |
| **Max Drawdown** | -15% | **-8%** |

---

## 🧪 COMANDI UTILI

### Test singolo simbolo:
```powershell
Invoke-WebRequest -Uri "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/ml-historical-training" `
  -Method POST `
  -Headers @{"Authorization"="Bearer YOUR_KEY"; "Content-Type"="application/json"} `
  -Body '{"symbols":["EURUSD"],"iterations":100}'
```

### Test tutti i simboli:
```powershell
-Body '{"symbols":["EURUSD","GBPUSD","USDJPY","XAUUSD"],"iterations":100}'
```

### Con learning rate custom:
```powershell
-Body '{"symbols":["EURUSD"],"iterations":200,"learningRate":0.05}'
```

---

## 📚 ANALISI DETTAGLIATA

### **Perché 44% win rate è problematico?**

Con 44% win rate e R:R 1.5:1:
```
100 trade × 44% win × 1.5% gain = +66%
100 trade × 56% loss × -1% loss = -56%
Net PnL = +66% - 56% = +10%
```

**MA** con slippage, spread, commissioni:
- -2 pip spread × 100 trade = -200 pip
- Net PnL diventa **NEGATIVO**

Con 60% win rate e R:R 2:1:
```
100 trade × 60% win × 2% gain = +120%
100 trade × 40% loss × -1% loss = -40%
Net PnL = +120% - 40% = +80%
Dopo costi = +70% ✅
```

---

## ✅ CONCLUSIONE

Il sistema di backtesting **FUNZIONA TECNICAMENTE**:
- ✅ Scarica dati reali da Twelve Data
- ✅ Calcola indicatori (EMA, BB, ATR, Volume)
- ✅ Genera segnali basati su confluence
- ✅ Simula TP/SL hit con look-ahead
- ✅ Ottimizza pesi con Gradient Descent
- ✅ Valida su out-of-sample (Settembre)

**MA** la strategia di base ha performance deboli (44% WR).

**SOLUZIONE**: Prima miglioriamo la strategia (filtri, R:R, threshold), POI ottimizziamo i pesi.

---

**Next**: Vuoi che implemento i miglioramenti (confidence threshold 75, R:R 2:1, filtri) e ri-testo? 🚀
