# 🚀 ML Implementation Roadmap - 4 Settimane

## 📊 **ANALISI SISTEMA ATTUALE**

### ✅ Già Implementato:
1. **RL Trading System** (`src/lib/rl-trading/`)
   - PPO/CPPO model architecture ✅
   - TensorFlow.js integration ✅
   - Inference engine ✅
   - Model loader from Supabase Storage ✅
   
2. **Retraining System** (`src/lib/retraining/`)
   - Continuous learning pipeline ✅
   - Data collector ✅
   - Model trainer ✅
   - Deployment manager ✅
   - Performance monitoring ✅

3. **Database Schema**
   - `signal_performance` table ✅
   - OANDA trade tracking ✅
   - Performance indexes ✅

### ❌ Mancante/Da Migliorare:
1. **Historical Data Scraping** - Non implementato
2. **Confidence Calibration** - Logica base presente, ma non calibrata su dati reali
3. **Smart Money SL/TP** - Strutture base presenti, ma non integrate con order blocks/FVG
4. **Warnings System** - Non implementato

---

## 🗓️ **SETTIMANA 1: Training Pipeline**

### Obiettivo
Creare pipeline completo di training con dati storici OANDA

### Tasks

#### 1.1 Historical Data Scraper
**File da creare:** `src/lib/ml-training/HistoricalDataScraper.ts`

```typescript
export class HistoricalDataScraper {
  async scrapeHistoricalData(config: {
    symbols: string[];
    granularities: string[]; // M1, M5, M15
    startDate: Date;
    endDate: Date;
  }): Promise<HistoricalDataset>;
  
  async labelData(candles: Candle[]): Promise<LabeledData[]>;
  async saveToDatabase(data: LabeledData[]): Promise<void>;
}
```

**Implementation Steps:**
```bash
# Create scraper
touch src/lib/ml-training/HistoricalDataScraper.ts
touch src/lib/ml-training/DataLabeler.ts
touch src/lib/ml-training/BacktestLabeler.ts

# Create database migration
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_ml_historical_data.sql
```

**SQL Schema:**
```sql
CREATE TABLE ml_historical_candles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol VARCHAR(20) NOT NULL,
  granularity VARCHAR(5) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  open DECIMAL(15,5) NOT NULL,
  high DECIMAL(15,5) NOT NULL,
  low DECIMAL(15,5) NOT NULL,
  close DECIMAL(15,5) NOT NULL,
  volume BIGINT NOT NULL,
  -- Labels for ML
  future_return_5m DECIMAL(10,5),
  future_return_15m DECIMAL(10,5),
  future_return_1h DECIMAL(10,5),
  label VARCHAR(10), -- BUY, SELL, HOLD
  label_confidence DECIMAL(5,2),
  UNIQUE(symbol, granularity, timestamp)
);

CREATE INDEX idx_ml_candles_symbol_time 
ON ml_historical_candles(symbol, granularity, timestamp DESC);
```

#### 1.2 Data Labeling
**Logic:**
```python
# Pseudo-code for labeling
def label_candle(entry_price, future_candles, atr):
    # Check if SL hit (1.5 ATR)
    sl_distance = 1.5 * atr
    # Check if TP hit (3 ATR)
    tp_distance = 3 * atr
    
    for future in future_candles[:50]:  # Next 50 candles
        if hit_tp(future, entry_price, tp_distance):
            return "WIN", confidence_from_rrr(3.0)
        if hit_sl(future, entry_price, sl_distance):
            return "LOSS", confidence_from_rrr(1.5)
    
    return "HOLD", 0.0
```

#### 1.3 PPO/CPPO Training Script
**File:** `scripts/train-ppo-model.py`

```python
import tensorflow as tf
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv

# Load historical data
data = load_from_supabase("ml_historical_candles")

# Create trading environment
env = TradingEnvironment(data)
env = DummyVecEnv([lambda: env])

# Train PPO
model = PPO(
    "MlpPolicy",
    env,
    learning_rate=3e-4,
    n_steps=2048,
    batch_size=64,
    n_epochs=10,
    gamma=0.99,
    verbose=1
)

model.learn(total_timesteps=1_000_000)
model.save("ppo_trading_model")

# Upload to Supabase Storage
upload_to_supabase("ppo_trading_model", "rl-models/ppo-v2.zip")
```

#### 1.4 Supabase Edge Function
**File:** `supabase/functions/ml-train-model/index.ts`

```typescript
serve(async (req) => {
  // 1. Fetch historical data
  const { data: candles } = await supabase
    .from('ml_historical_candles')
    .select('*')
    .gte('timestamp', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)); // 6 months

  // 2. Call Python training service (or use TF.js)
  const trainedModel = await trainPPOModel(candles);

  // 3. Upload to storage
  await supabase.storage
    .from('rl-models')
    .upload(`ppo-${Date.now()}.zip`, trainedModel);

  return new Response(JSON.stringify({ success: true }));
});
```

### Deliverables Week 1
- [ ] Historical scraper fetching 6 mesi di dati OANDA
- [ ] Backtest labeling con win/loss effettivi
- [ ] PPO model trained su dati reali
- [ ] Model weights salvati su Supabase Storage
- [ ] Edge function per training automatico

---

## 📈 **SETTIMANA 2: Confidence Calibration**

### Obiettivo
Calibrare confidence basata su win rate storico effettivo

### Tasks

#### 2.1 Confidence Bucket Tracking
**Migration:** `supabase/migrations/xxxx_confidence_calibration.sql`

```sql
CREATE TABLE confidence_calibration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  confidence_bucket INT NOT NULL, -- 50, 60, 70, 80, 90
  total_signals INT DEFAULT 0,
  winning_signals INT DEFAULT 0,
  win_rate DECIMAL(5,2),
  avg_profit DECIMAL(10,2),
  avg_loss DECIMAL(10,2),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(confidence_bucket)
);

-- Initialize buckets
INSERT INTO confidence_calibration (confidence_bucket) VALUES
(50), (60), (70), (80), (90);
```

#### 2.2 Signal Outcome Tracker
**File:** `supabase/functions/track-signal-outcome/index.ts`

```typescript
serve(async (req) => {
  const { signalId, outcome, profit } = await req.json();

  // 1. Get signal confidence
  const { data: signal } = await supabase
    .from('signal_performance')
    .select('confidence')
    .eq('id', signalId)
    .single();

  // 2. Determine bucket
  const bucket = Math.floor(signal.confidence / 10) * 10;

  // 3. Update calibration
  await supabase.rpc('update_confidence_calibration', {
    p_bucket: bucket,
    p_is_win: outcome === 'WIN',
    p_profit: profit
  });

  return new Response(JSON.stringify({ success: true }));
});
```

#### 2.3 Calibration Function
**SQL:** `supabase/migrations/xxxx_calibration_function.sql`

```sql
CREATE OR REPLACE FUNCTION update_confidence_calibration(
  p_bucket INT,
  p_is_win BOOLEAN,
  p_profit DECIMAL
) RETURNS VOID AS $$
BEGIN
  UPDATE confidence_calibration
  SET 
    total_signals = total_signals + 1,
    winning_signals = winning_signals + CASE WHEN p_is_win THEN 1 ELSE 0 END,
    win_rate = (winning_signals::DECIMAL + CASE WHEN p_is_win THEN 1 ELSE 0 END) / 
               (total_signals + 1) * 100,
    avg_profit = CASE WHEN p_is_win THEN 
                   (avg_profit * winning_signals + p_profit) / (winning_signals + 1)
                 ELSE avg_profit END,
    last_updated = NOW()
  WHERE confidence_bucket = p_bucket;
END;
$$ LANGUAGE plpgsql;
```

#### 2.4 Frontend Display
**File:** `src/lib/ml/ConfidenceCalibrator.ts`

```typescript
export class ConfidenceCalibrator {
  private calibrationData: Map<number, number> = new Map();

  async loadCalibration() {
    const { data } = await supabase
      .from('confidence_calibration')
      .select('confidence_bucket, win_rate');
    
    data?.forEach(row => {
      this.calibrationData.set(row.confidence_bucket, row.win_rate);
    });
  }

  getCalibratedConfidence(rawConfidence: number): {
    display: number;
    raw: number;
    historical: number;
  } {
    const bucket = Math.floor(rawConfidence / 10) * 10;
    const historicalWinRate = this.calibrationData.get(bucket) || rawConfidence;
    
    return {
      display: historicalWinRate, // Show this to user
      raw: rawConfidence,          // Keep for internal use
      historical: historicalWinRate
    };
  }
}
```

#### 2.5 Update Dashboard
**File:** `src/pages/Dashboard.tsx`

```tsx
// Add calibration display
<Badge>
  AI: {signal.confidence.toFixed(0)}%
  {calibratedConfidence && (
    <span className="text-xs">
      (Real: {calibratedConfidence.toFixed(0)}%)
    </span>
  )}
</Badge>
```

### Deliverables Week 2
- [ ] `confidence_calibration` table con buckets
- [ ] Auto-tracking di ogni outcome segnale
- [ ] Calibration basata su win rate effettivo
- [ ] Frontend mostra "Real Confidence" vs "AI Confidence"
- [ ] Dashboard analytics per confidence accuracy

---

## 🎯 **SETTIMANA 3: Smart SL/TP con Smart Money Concepts**

### Obiettivo
Implementare SL/TP basati su order blocks, CHoCH, FVG

### Tasks

#### 3.1 Order Block Detector
**File:** `src/lib/smart-money/OrderBlockDetector.ts`

```typescript
export class OrderBlockDetector {
  detectOrderBlocks(candles: Candle[]): OrderBlock[] {
    const blocks: OrderBlock[] = [];
    
    for (let i = 3; i < candles.length - 3; i++) {
      // Bullish OB: Last down candle before strong up move
      if (this.isBullishOrderBlock(candles, i)) {
        blocks.push({
          type: 'BULLISH',
          high: candles[i].high,
          low: candles[i].low,
          timestamp: candles[i].time,
          strength: this.calculateOBStrength(candles, i)
        });
      }
      
      // Bearish OB: Last up candle before strong down move
      if (this.isBearishOrderBlock(candles, i)) {
        blocks.push({
          type: 'BEARISH',
          high: candles[i].high,
          low: candles[i].low,
          timestamp: candles[i].time,
          strength: this.calculateOBStrength(candles, i)
        });
      }
    }
    
    return blocks;
  }

  private isBullishOrderBlock(candles: Candle[], idx: number): boolean {
    // Last bearish candle before bullish impulse
    const current = candles[idx];
    const next3 = candles.slice(idx + 1, idx + 4);
    
    return (
      current.close < current.open && // Bearish candle
      next3.every(c => c.close > c.open) && // Next 3 bullish
      next3[2].close > current.high + (2 * this.getATR(candles, idx)) // Strong move
    );
  }
}
```

#### 3.2 Change of Character (CHoCH) Detector
**File:** `src/lib/smart-money/CHoCHDetector.ts`

```typescript
export class CHoCHDetector {
  detectCHoCH(candles: Candle[]): CHoCHPoint[] {
    const swingHighs = this.findSwingHighs(candles);
    const swingLows = this.findSwingLows(candles);
    const chochPoints: CHoCHPoint[] = [];
    
    // Bullish CHoCH: Price breaks above previous swing high
    for (let i = 1; i < swingHighs.length; i++) {
      if (candles[i].close > swingHighs[i - 1].price) {
        chochPoints.push({
          type: 'BULLISH',
          price: swingHighs[i - 1].price,
          timestamp: candles[i].time,
          brokenLevel: swingHighs[i - 1]
        });
      }
    }
    
    // Bearish CHoCH: Price breaks below previous swing low
    for (let i = 1; i < swingLows.length; i++) {
      if (candles[i].close < swingLows[i - 1].price) {
        chochPoints.push({
          type: 'BEARISH',
          price: swingLows[i - 1].price,
          timestamp: candles[i].time,
          brokenLevel: swingLows[i - 1]
        });
      }
    }
    
    return chochPoints;
  }
}
```

#### 3.3 Fair Value Gap (FVG) Detector
**File:** `src/lib/smart-money/FVGDetector.ts`

```typescript
export class FVGDetector {
  detectFVGs(candles: Candle[]): FVG[] {
    const fvgs: FVG[] = [];
    
    for (let i = 1; i < candles.length - 1; i++) {
      const prev = candles[i - 1];
      const curr = candles[i];
      const next = candles[i + 1];
      
      // Bullish FVG: Gap between prev high and next low
      if (next.low > prev.high && curr.close > curr.open) {
        fvgs.push({
          type: 'BULLISH',
          top: next.low,
          bottom: prev.high,
          timestamp: curr.time,
          filled: false
        });
      }
      
      // Bearish FVG: Gap between prev low and next high
      if (next.high < prev.low && curr.close < curr.open) {
        fvgs.push({
          type: 'BEARISH',
          top: prev.low,
          bottom: next.high,
          timestamp: curr.time,
          filled: false
        });
      }
    }
    
    return fvgs;
  }
  
  findNearestUnfilledFVG(price: number, fvgs: FVG[], direction: 'ABOVE' | 'BELOW'): FVG | null {
    const unfilled = fvgs.filter(f => !f.filled);
    
    if (direction === 'ABOVE') {
      return unfilled
        .filter(f => f.bottom > price)
        .sort((a, b) => a.bottom - b.bottom)[0];
    } else {
      return unfilled
        .filter(f => f.top < price)
        .sort((a, b) => b.top - a.top)[0];
    }
  }
}
```

#### 3.4 Smart SL/TP Calculator Integration
**Update:** `src/lib/risk-management/SmartSLTPCalculator.ts`

```typescript
export class SmartSLTPCalculator {
  private obDetector = new OrderBlockDetector();
  private chochDetector = new CHoCHDetector();
  private fvgDetector = new FVGDetector();

  async calculateSmartLevels(params: {
    symbol: string;
    direction: 'BUY' | 'SELL';
    entryPrice: number;
  }): Promise<SmartLevels> {
    // 1. Fetch recent candles
    const candles = await this.fetchCandles(params.symbol, 'M15', 100);
    
    // 2. Detect structures
    const orderBlocks = this.obDetector.detectOrderBlocks(candles);
    const chochPoints = this.chochDetector.detectCHoCH(candles);
    const fvgs = this.fvgDetector.detectFVGs(candles);
    
    // 3. Calculate SL based on order blocks
    let stopLoss: number;
    if (params.direction === 'BUY') {
      // SL below nearest bullish OB
      const nearestOB = orderBlocks
        .filter(ob => ob.type === 'BULLISH' && ob.low < params.entryPrice)
        .sort((a, b) => b.low - a.low)[0];
      
      stopLoss = nearestOB ? nearestOB.low - (5 * this.pipValue) : params.entryPrice * 0.995;
    } else {
      // SL above nearest bearish OB
      const nearestOB = orderBlocks
        .filter(ob => ob.type === 'BEARISH' && ob.high > params.entryPrice)
        .sort((a, b) => a.high - b.high)[0];
      
      stopLoss = nearestOB ? nearestOB.high + (5 * this.pipValue) : params.entryPrice * 1.005;
    }
    
    // 4. Calculate TP based on FVG
    let takeProfit: number;
    const targetFVG = this.fvgDetector.findNearestUnfilledFVG(
      params.entryPrice,
      fvgs,
      params.direction === 'BUY' ? 'ABOVE' : 'BELOW'
    );
    
    if (targetFVG) {
      takeProfit = params.direction === 'BUY' ? targetFVG.bottom : targetFVG.top;
    } else {
      // Fallback: 2:1 RR
      const slDistance = Math.abs(params.entryPrice - stopLoss);
      takeProfit = params.direction === 'BUY' 
        ? params.entryPrice + (slDistance * 2)
        : params.entryPrice - (slDistance * 2);
    }
    
    // 5. Calculate dynamic R:R
    const riskReward = Math.abs(takeProfit - params.entryPrice) / Math.abs(params.entryPrice - stopLoss);
    
    return {
      stopLoss,
      takeProfit,
      riskReward,
      reasoning: [
        `SL based on ${orderBlocks.length} order blocks`,
        `TP targeting FVG ${targetFVG ? 'found' : 'not found'}`,
        `CHoCH detected: ${chochPoints.length} points`,
        `R:R ratio: ${riskReward.toFixed(2)}:1`
      ]
    };
  }
}
```

### Deliverables Week 3
- [ ] Order Block detector con validazione
- [ ] CHoCH detector per swing points
- [ ] FVG detector per target zones
- [ ] SL posizionato su strutture valide (non ATR random)
- [ ] TP su FVG non filled
- [ ] Dynamic R:R basato su market structure

---

## ⚠️ **SETTIMANA 4: Warnings System**

### Obiettivo
Sistema di alert per condizioni di mercato non ottimali

### Tasks

#### 4.1 Spread Monitor
**File:** `src/lib/warnings/SpreadMonitor.ts`

```typescript
export class SpreadMonitor {
  private averageSpreads: Map<string, number> = new Map();

  async monitorSpread(symbol: string, currentSpread: number): Promise<Warning | null> {
    // Get historical average
    const avgSpread = await this.getAverageSpread(symbol);
    
    if (currentSpread > avgSpread * 2) {
      return {
        level: 'HIGH',
        type: 'SPREAD',
        message: `High spread: ${currentSpread.toFixed(1)} pips (avg: ${avgSpread.toFixed(1)})`,
        recommendation: 'Consider waiting for spread to normalize'
      };
    }
    
    return null;
  }

  private async getAverageSpread(symbol: string): Promise<number> {
    const { data } = await supabase
      .from('spread_history')
      .select('spread')
      .eq('symbol', symbol)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000))
      .order('timestamp', { ascending: false })
      .limit(100);
    
    const spreads = data?.map(d => d.spread) || [];
    return spreads.reduce((a, b) => a + b, 0) / spreads.length;
  }
}
```

#### 4.2 News Calendar Integration
**File:** `src/lib/warnings/NewsCalendarMonitor.ts`

```typescript
export class NewsCalendarMonitor {
  private highImpactEvents = ['NFP', 'FOMC', 'CPI', 'GDP', 'Interest Rate'];

  async checkUpcomingNews(): Promise<Warning | null> {
    // Integrate with ForexFactory or similar API
    const upcomingEvents = await this.fetchUpcomingEvents();
    
    const nextHighImpact = upcomingEvents.find(event => 
      this.highImpactEvents.some(hi => event.title.includes(hi)) &&
      event.timestamp - Date.now() < 60 * 60 * 1000 // Within 1 hour
    );
    
    if (nextHighImpact) {
      return {
        level: 'CRITICAL',
        type: 'NEWS',
        message: `High impact news in ${Math.floor((nextHighImpact.timestamp - Date.now()) / 60000)} minutes: ${nextHighImpact.title}`,
        recommendation: 'Avoid trading until after news release'
      };
    }
    
    return null;
  }
}
```

#### 4.3 Session Quality Scorer
**File:** `src/lib/warnings/SessionQualityScorer.ts`

```typescript
export class SessionQualityScorer {
  scoreCurrentSession(): {
    score: number;
    warning: Warning | null;
  } {
    const now = new Date();
    const utcHour = now.getUTCHours();
    
    // London session: 8-17 UTC (best)
    if (utcHour >= 8 && utcHour < 17) {
      return { score: 100, warning: null };
    }
    
    // NY session: 13-22 UTC (good)
    if (utcHour >= 13 && utcHour < 22) {
      return { score: 90, warning: null };
    }
    
    // Tokyo session: 0-9 UTC (ok)
    if (utcHour >= 0 && utcHour < 9) {
      return {
        score: 70,
        warning: {
          level: 'MEDIUM',
          type: 'SESSION',
          message: 'Trading during Tokyo session (lower liquidity)',
          recommendation: 'Consider waiting for London open'
        }
      };
    }
    
    // Dead zone
    return {
      score: 30,
      warning: {
        level: 'HIGH',
        type: 'SESSION',
        message: 'Trading outside major sessions (very low liquidity)',
        recommendation: 'Avoid trading during session gaps'
      }
    };
  }
}
```

#### 4.4 Volatility Alert
**File:** `src/lib/warnings/VolatilityMonitor.ts`

```typescript
export class VolatilityMonitor {
  async checkVolatility(symbol: string, currentATR: number): Promise<Warning | null> {
    const avgATR = await this.getAverageATR(symbol);
    const atrRatio = currentATR / avgATR;
    
    if (atrRatio > 1.5) {
      return {
        level: 'HIGH',
        type: 'VOLATILITY',
        message: `High volatility: ATR ${(atrRatio * 100).toFixed(0)}% above average`,
        recommendation: 'Widen stops or reduce position size'
      };
    }
    
    if (atrRatio < 0.5) {
      return {
        level: 'LOW',
        type: 'VOLATILITY',
        message: `Low volatility: ATR ${((1 - atrRatio) * 100).toFixed(0)}% below average`,
        recommendation: 'Potential breakout setup - be ready'
      };
    }
    
    return null;
  }
}
```

#### 4.5 Integrated Warning System
**File:** `src/lib/warnings/WarningAggregator.ts`

```typescript
export class WarningAggregator {
  private spreadMonitor = new SpreadMonitor();
  private newsMonitor = new NewsCalendarMonitor();
  private sessionScorer = new SessionQualityScorer();
  private volatilityMonitor = new VolatilityMonitor();

  async getAllWarnings(params: {
    symbol: string;
    spread: number;
    atr: number;
  }): Promise<Warning[]> {
    const warnings: Warning[] = [];
    
    // Check spread
    const spreadWarning = await this.spreadMonitor.monitorSpread(params.symbol, params.spread);
    if (spreadWarning) warnings.push(spreadWarning);
    
    // Check news
    const newsWarning = await this.newsMonitor.checkUpcomingNews();
    if (newsWarning) warnings.push(newsWarning);
    
    // Check session
    const sessionCheck = this.sessionScorer.scoreCurrentSession();
    if (sessionCheck.warning) warnings.push(sessionCheck.warning);
    
    // Check volatility
    const volWarning = await this.volatilityMonitor.checkVolatility(params.symbol, params.atr);
    if (volWarning) warnings.push(volWarning);
    
    return warnings;
  }

  getOverallRiskLevel(warnings: Warning[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (warnings.some(w => w.level === 'CRITICAL')) return 'CRITICAL';
    if (warnings.some(w => w.level === 'HIGH')) return 'HIGH';
    if (warnings.some(w => w.level === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }
}
```

#### 4.6 Frontend Integration
**Update:** `src/components/AIAnalysisPanel.tsx`

```tsx
const [warnings, setWarnings] = useState<Warning[]>([]);

// Fetch warnings
const warningAggregator = new WarningAggregator();
const allWarnings = await warningAggregator.getAllWarnings({
  symbol: analysisResult.symbol,
  spread: analysisResult.price.spreadPips,
  atr: analysisResult.analysis.indicators.atr_percent
});

// Display warnings
{warnings.length > 0 && (
  <Alert variant={getAlertVariant(warnings)}>
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Trading Warnings</AlertTitle>
    <AlertDescription>
      {warnings.map((w, i) => (
        <div key={i} className="mt-2">
          <Badge variant={w.level}>{w.type}</Badge>
          <p className="text-sm">{w.message}</p>
          <p className="text-xs text-muted-foreground">{w.recommendation}</p>
        </div>
      ))}
    </AlertDescription>
  </Alert>
)}
```

### Deliverables Week 4
- [ ] Spread monitoring con alert se > 2x average
- [ ] News calendar integration (ForexFactory API)
- [ ] Session quality scorer (warn fuori London/NY)
- [ ] Volatility alerts (ATR > 150% average)
- [ ] Frontend warning display con colori
- [ ] Overall risk level calculation

---

## 📈 **SUCCESS METRICS**

### Week 1 - Training Pipeline
- [ ] 6 mesi di dati storici scaricati (M1/M5/M15)
- [ ] 100k+ candles labeled con win/loss
- [ ] PPO model trained con loss < 0.05
- [ ] Model inference time < 100ms

### Week 2 - Confidence Calibration
- [ ] `confidence_calibration` table popolata
- [ ] Win rate per bucket entro ±5% di confidence
- [ ] 100+ segnali tracked per bucket
- [ ] Frontend mostra calibrated confidence

### Week 3 - Smart SL/TP
- [ ] Order blocks detected su 80%+ dei setup
- [ ] R:R medio > 2:1 (vs 1.5:1 attuale)
- [ ] SL hit rate < 40% (structural stops più safe)
- [ ] TP hit rate > 50% (targeting real zones)

### Week 4 - Warnings System
- [ ] 0 trade durante high spread (> 3 pips EUR/USD)
- [ ] 0 trade entro 1h da NFP/FOMC
- [ ] 80%+ trade durante London/NY session
- [ ] Volatility alerts riducono drawdown del 20%

---

## 🚀 **QUICK START CHECKLIST**

### Day 1 (Oggi)
```bash
# Create ML training directory
mkdir -p src/lib/ml-training
mkdir -p scripts/ml-training

# Create database migrations
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_ml_historical_data.sql
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_confidence_calibration.sql

# Create core files
touch src/lib/ml-training/HistoricalDataScraper.ts
touch src/lib/smart-money/OrderBlockDetector.ts
touch src/lib/warnings/WarningAggregator.ts
```

### Day 2-3
- Implement HistoricalDataScraper
- Fetch 6 months OANDA data
- Label data with backtest results

### Day 4-7
- Train PPO model
- Upload to Supabase Storage
- Test inference performance

---

## 📚 **RESOURCES**

### APIs to Integrate
- **OANDA API**: Historical data (già hai accesso)
- **ForexFactory API**: News calendar
- **Alpha Vantage**: Backup data source

### Libraries to Install
```bash
npm install @tensorflow/tfjs
npm install date-fns
npm install axios
```

### Python Dependencies (se usi Python per training)
```bash
pip install stable-baselines3
pip install gym
pip install pandas numpy
pip install supabase-py
```

---

**Vuoi che inizi con l'implementazione della SETTIMANA 1?** 🚀
