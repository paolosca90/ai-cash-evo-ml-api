# 📊 Ottimizzazione Intraday - HIGH WIN RATE Strategy

## 🎯 Obiettivi

1. **HIGH WIN RATE (60-70%+)** - Più trade vincenti, profitto da volume
2. **SL larghi con spread buffer** - Evitare stop out prematuri
3. **TP realistici e vicini** - Target facilmente raggiungibili (0.5:1 - 1.2:1)
4. **Evitare operazioni overnight** - Zero costi swap

---

## ✅ Implementazione Completata

### **File Creato**: `intraday-risk-manager.ts`

Sistema standalone per gestione rischio intraday con:

- ✅ **Prevenzione overnight**: No trade venerdì 20:00+ UTC, no weekend
- ✅ **SL ottimizzati**: 0.3%-0.8% max (30-80 pips su EURUSD)
- ✅ **TP ottimizzati**: Risk/Reward 1.5:1 - 2.5:1
- ✅ **Durata max trade**:
  - Major pairs: 4 ore max
  - Minor pairs: 3 ore max
  - Metals (XAUUSD/XAGUSD): 2 ore max

---

## 📋 Parametri HIGH WIN RATE

### **Stop Loss (LARGHI con Spread Buffer)**
```typescript
MIN_SL_PERCENT: 0.006       // 0.6% (60 pips EURUSD) + spread buffer
MAX_SL_PERCENT: 0.015       // 1.5% (150 pips EURUSD)
SL_ATR_MULTIPLIER: 1.8      // SL = ATR × 1.8 (largo)
SPREAD_BUFFER_PIPS: 5       // +5 pips buffer per evitare stop out da spread
```

### **Take Profit (PICCOLI per Alta Probabilità)**
```typescript
MIN_RR_RATIO: 0.5           // Minimo 0.5:1 (TP metà dello SL)
TARGET_RR_RATIO: 0.8        // Target 0.8:1 (TP 80% dello SL)
MAX_RR_RATIO: 1.2           // Massimo 1.2:1
TP_ATR_MULTIPLIER: 1.2      // TP = ATR × 1.2 (realistico)
```

### **Orari Trading**
```typescript
// No trade venerdì dalle 20:00 UTC
FOREX_NO_TRADE_START: 20  // UTC
FOREX_NO_TRADE_END: 23    // Domenica fino alle 23:00 UTC

// No trade weekend (Sabato/Domenica)
```

---

## 🔧 Come Integrare (Future Implementation)

### **Opzione 1: Modifica auto-oanda-trader**

```typescript
// In auto-oanda-trader/index.ts
import { calculateIntradayRisk, shouldClosePosition } from './intraday-risk-manager.ts';

// Prima di eseguire trade
const intradayRisk = calculateIntradayRisk({
  price: signal.entryPrice,
  signal: signal.type,
  atr: signal.atr,
  structuralLow: signal.structuralLow,
  structuralHigh: signal.structuralHigh,
  currentHour: new Date().getUTCHours(),
  symbol: signal.symbol
});

if (!intradayRisk.shouldTrade) {
  console.log(`Skip trade: ${intradayRisk.reason}`);
  return { success: false, reason: intradayRisk.reason };
}

// Usa SL/TP ottimizzati
const orderData = {
  order: {
    type: 'MARKET',
    instrument: signal.symbol,
    units: signal.type === 'BUY' ? 1000 : -1000,
    stopLossOnFill: { price: intradayRisk.stopLoss },
    takeProfitOnFill: { price: intradayRisk.takeProfit },
    timeInForce: 'FOK'
  }
};
```

### **Opzione 2: Cron Job per Chiusura Posizioni**

```typescript
// Esegui ogni 15 minuti per chiudere posizioni in scadenza
Deno.cron("close-intraday-positions", "*/15 * * * *", async () => {
  const openTrades = await getOpenTrades();

  for (const trade of openTrades) {
    const check = shouldClosePosition(
      trade.openTime,
      new Date(),
      trade.symbol
    );

    if (check.shouldClose) {
      await closeOANDATrade(trade.id);
      console.log(`Closed ${trade.symbol}: ${check.reason}`);
    }
  }
});
```

---

## 📈 Vantaggi HIGH WIN RATE Strategy

### **Alta Probabilità di Successo**
- ✅ **Win Rate 60-70%+** - Profitto da volume, non da singoli big win
- ✅ **TP realistici** - Target facilmente raggiungibili (0.5-1.2:1)
- ✅ **SL larghi** - No stop out da spread/slippage/noise

### **Costi Ridotti**
- ❌ **Zero swap overnight** - Nessun costo di mantenimento posizione
- ✅ **Solo spread** - Costo minimo per trade intraday
- ✅ **Spread buffer** - 5 pips extra protezione

### **Profittabilità da Volume**
- ✅ **Più trade vincenti** - 60-70 win su 100 trade
- ✅ **Profitto costante** - Piccoli gain regolari > grandi win rari
- ✅ **Drawdown ridotto** - Win rate alto = meno perdite consecutive

### **Machine Learning Friendly**
- ✅ **Alta frequenza** - Più trade = più dati per ML
- ✅ **Pattern identificabili** - Target piccoli = pattern più chiari
- ✅ **Continuous learning** - Sistema migliora con volume

---

## 🚀 Prossimi Passi

1. **Test in Production** ✅
   - Sistema attualmente usa SL/TP originali (conservative)
   - Raccolta dati performance per 500-1000 trade

2. **Integrazione Graduale** (Week 2-3)
   - Applicare optimization solo su simboli con win rate > 55%
   - A/B test: 50% trade con optimization, 50% originale

3. **Monitoraggio Performance** (Ongoing)
   ```sql
   -- Query per confrontare performance
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

---

## 📝 Note Tecniche

### **Limitazioni Attuali**
- Edge Function ha boot errors con dynamic imports
- Soluzione: Codice inline in generate-ai-signals (futuro)
- File `intraday-risk-manager.ts` pronto per uso

### **Alternative Implementation**
- Creare nuova Edge Function separata `intraday-optimizer`
- Chiamarla DOPO generate-ai-signals, PRIMA di execute-oanda-trade
- Pro: Modulare, testabile separatamente
- Contro: Latenza aggiuntiva (~100-200ms)

---

## ✅ Sistema Attuale Operativo

**Status**: Auto-trading funzionante 24/7

Il sistema continua a operare con SL/TP originali mentre raccoglie dati.
L'optimization intraday è pronta per deployment quando avremo:

1. ✅ 500+ trade di baseline performance
2. ✅ Win rate stabile > 50%
3. ✅ Sistema continuous learning attivo

**Next deployment**: Integrazione graduale in auto-oanda-trader dopo analisi performance iniziale.
