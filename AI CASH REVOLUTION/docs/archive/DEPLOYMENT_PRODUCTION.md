---
mode: development
---
<boltArtifact id="deployment-production-guide" title="Production Deployment Guide">
# 🚀 Deployment in Produzione - Sistema ML

## 📋 Checklist Pre-Deployment

### 1. ✅ Database Setup

**Esegui le migrazioni Supabase:**

```bash
# 1. Connettiti al progetto Supabase
supabase link --project-ref rvopmdflnecyrwrzhyfy

# 2. Applica le migrazioni ML
supabase db push

# Oppure manualmente nel Dashboard Supabase:
# - Vai su SQL Editor
# - Copia il contenuto di: supabase/migrations/20250105000000_ml_production_tables.sql
# - Esegui
```

**Verifica tabelle create:**
- ✅ `ml_training_samples`
- ✅ `ml_training_metrics`
- ✅ `ml_model_versions`
- ✅ `market_data_cache`
- ✅ `ml_predictions_log`
- ✅ Vista `ml_performance_analytics`

### 2. ✅ Environment Variables

**File `.env` o `.env.production`:**

```bash
# Supabase
VITE_SUPABASE_URL=https://rvopmdflnecyrwrzhyfy.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# TensorFlow.js (opzionale)
VITE_TF_BACKEND=webgl  # 'webgl' o 'cpu'

# ML Config
VITE_ML_UPDATE_FREQUENCY=weekly  # 'daily', 'weekly', 'monthly'
VITE_ML_MIN_SAMPLES=1000
VITE_ML_ENABLE_AUTO_LEARNING=true
```

### 3. ✅ Build Production

```bash
# 1. Installa dependencies
npm install --legacy-peer-deps

# 2. Build production
npm run build

# 3. Verifica build
ls -la dist/

# Dovresti vedere:
# - index.html
# - assets/ (JS, CSS)
# - TensorFlow.js bundles
```

### 4. ✅ Deploy Options

#### **Opzione A: Vercel (Recommended)**

```bash
# 1. Installa Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod

# 4. Configura environment variables in Vercel dashboard
```

#### **Opzione B: Netlify**

```bash
# 1. Installa Netlify CLI
npm i -g netlify-cli

# 2. Login
netlify login

# 3. Deploy
netlify deploy --prod --dir=dist

# 4. Configura environment variables in Netlify dashboard
```

#### **Opzione C: Manual (Any Static Host)**

```bash
# Upload contents of 'dist/' folder to:
# - AWS S3 + CloudFront
# - Firebase Hosting
# - GitHub Pages
# - Cloudflare Pages
```

---

## 🎯 Post-Deployment

### 1. ✅ Inizializzazione ML Models

**Al primo accesso, i modelli vengono inizializzati automaticamente.**

Verifica nei logs del browser:
```
🚀 Initializing ML Signal Service...
🎯 Initializing PPO model with synthetic data...
✅ PPO model initialized and saved
✅ ML Signal Service initialized
```

### 2. ✅ Test Funzionalità ML

**Vai su:** `https://your-domain.com/ml-test`

1. Clicca "Run Tests"
2. Verifica che tutti i 9 test passino ✅
3. Controlla:
   - Pass rate: 100%
   - No memory leaks
   - Inference < 100ms

### 3. ✅ Integrazione Trading Dashboard

**Modifica `src/pages/Index.tsx` o `Dashboard.tsx`:**

```typescript
import { MLSignalsPanel } from '@/components/MLSignalsPanel';

function TradingDashboard() {
  const [symbol, setSymbol] = useState('EURUSD');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Existing AI Signals */}
      <AISignals symbol={symbol} />

      {/* NEW: ML Signals */}
      <MLSignalsPanel
        symbol={symbol}
        onSignalGenerated={(signal) => {
          console.log('ML Signal:', signal);
          // Execute trade if confidence > 70%
          if (signal.confidence > 0.7) {
            executeTrade(signal);
          }
        }}
      />
    </div>
  );
}
```

### 4. ✅ Avvia Continuous Learning

**Nel `App.tsx` o `main.tsx`:**

```typescript
import { continuousLearningPipeline } from '@/lib/rl-trading/ContinuousLearningPipeline';

// Start learning pipeline
if (import.meta.env.VITE_ML_ENABLE_AUTO_LEARNING === 'true') {
  continuousLearningPipeline.start().then(() => {
    console.log('✅ Continuous learning started');
  });
}
```

---

## 📊 Monitoring & Analytics

### 1. **ML Performance Dashboard**

Crea una nuova pagina `/ml-analytics`:

```typescript
// src/pages/MLAnalytics.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

function MLAnalytics() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      // Get model performance
      const { data } = await supabase
        .from('ml_performance_analytics')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      setStats(data);
    }

    fetchStats();
  }, []);

  return (
    <div>
      <h1>ML Performance Analytics</h1>
      {/* Display stats */}
      {stats?.map(stat => (
        <div key={stat.date}>
          <p>Date: {stat.date}</p>
          <p>Win Rate: {(stat.win_rate * 100).toFixed(1)}%</p>
          <p>Avg P&L: ${stat.avg_pnl.toFixed(2)}</p>
          <p>Total Predictions: {stat.total_predictions}</p>
        </div>
      ))}
    </div>
  );
}
```

### 2. **Query Analytics**

**Dashboard Supabase SQL Editor:**

```sql
-- Performance Summary (Last 7 days)
SELECT
  symbol,
  COUNT(*) as predictions,
  AVG(confidence) as avg_confidence,
  AVG(total_uncertainty) as avg_uncertainty,
  COUNT(*) FILTER (WHERE was_executed) as executed,
  AVG(actual_result) FILTER (WHERE actual_result IS NOT NULL) as avg_pnl,
  COUNT(*) FILTER (WHERE actual_result > 0)::FLOAT /
    NULLIF(COUNT(*) FILTER (WHERE actual_result IS NOT NULL), 0) as win_rate
FROM ml_predictions_log
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY symbol
ORDER BY predictions DESC;

-- Training Progress
SELECT
  model_version,
  MAX(epoch) as total_epochs,
  AVG(avg_reward) as final_reward,
  MIN(total_loss) as best_loss,
  MAX(samples_count) as samples_used
FROM ml_training_metrics
GROUP BY model_version
ORDER BY MAX(created_at) DESC
LIMIT 10;

-- Model Versions Performance
SELECT
  version,
  model_type,
  is_active,
  performance_metrics->>'avg_reward' as avg_reward,
  performance_metrics->>'sharpe_ratio' as sharpe_ratio,
  performance_metrics->>'win_rate' as win_rate,
  trained_on_samples,
  training_completed_at
FROM ml_model_versions
ORDER BY training_completed_at DESC;
```

### 3. **Logging & Alerts**

**Setup Supabase Webhooks:**

```typescript
// supabase/functions/ml-performance-alert/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Check model performance
  const { data } = await supabase
    .from('ml_performance_analytics')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  // Alert if win rate < 50%
  if (data && data.win_rate < 0.5) {
    // Send alert (email, Slack, etc.)
    await fetch('https://hooks.slack.com/YOUR_WEBHOOK', {
      method: 'POST',
      body: JSON.stringify({
        text: `⚠️ ML Performance Alert: Win rate dropped to ${(data.win_rate * 100).toFixed(1)}%`
      })
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## 🔧 Configurazione Avanzata

### 1. **Model Hyperparameters Tuning**

**Modifica `src/lib/rl-trading/TFRLModelArchitecture.ts`:**

```typescript
const productionConfig: TFModelConfig = {
  inputDim: 50,
  actionDim: 3,
  hiddenUnits: [512, 256, 128], // Increased capacity
  learningRate: 0.00005, // Lower for stability
  clipRatio: 0.15, // Tighter clip
  gamma: 0.995, // Longer-term rewards
  lambda: 0.97, // GAE smoothing
  dropout: 0.15, // More regularization
  useBatchNorm: true
};
```

### 2. **Risk Management**

**Modifica `src/services/mlSignalService.ts`:**

```typescript
const config: RLInferenceConfig = {
  modelPath: 'default',
  maxPositionSize: 0.05, // 5% max (conservative)
  riskThreshold: 0.8, // Higher threshold
  uncertaintyThreshold: 0.2, // Lower tolerance
  useEnsemble: true,
  enableConstraints: true,
  timeout: 5000
};
```

### 3. **Continuous Learning Frequency**

**Modifica `src/lib/rl-trading/ContinuousLearningPipeline.ts`:**

```typescript
const productionConfig: LearningConfig = {
  minSamples: 5000, // More samples for production
  batchSize: 128, // Larger batches
  epochs: 20, // More epochs
  learningRate: 0.00005, // Lower LR
  validationSplit: 0.3, // More validation data
  updateFrequency: 'daily' // Daily retraining
};
```

---

## 🚨 Troubleshooting

### Problem: Modelli non si caricano

**Soluzione:**
```typescript
// Clear IndexedDB
indexedDB.deleteDatabase('tensorflowjs');

// Re-initialize
import { ModelInitializer } from '@/lib/rl-trading/ModelInitializer';
await ModelInitializer.initializeAllModels();
```

### Problem: Memory leak

**Soluzione:**
```typescript
// Add to inference engine
useEffect(() => {
  return () => {
    inferenceEngine?.dispose();
    tf.disposeVariables();
  };
}, []);
```

### Problem: Slow inference

**Soluzione:**
```typescript
// Force WebGL backend
await tf.setBackend('webgl');
await tf.ready();

// Or quantize model
const quantizedModel = await tf.loadGraphModel('model.json', {
  quantizationBytes: 2
});
```

### Problem: Training fails

**Soluzione:**
```sql
-- Check samples quality
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE features IS NOT NULL) as valid_features,
  COUNT(*) FILTER (WHERE reward IS NOT NULL) as valid_rewards,
  AVG(array_length(features::jsonb::text::json::jsonb, 1)) as avg_feature_len
FROM ml_training_samples
WHERE timestamp >= NOW() - INTERVAL '7 days';
```

---

## 📈 Scaling

### 1. **Horizontal Scaling**

- Deploy multiple instances behind load balancer
- Each instance has its own IndexedDB models
- Shared Supabase for training data

### 2. **Vertical Scaling**

- Increase WebGL memory limit
- Use quantized models (2-byte precision)
- Batch inference requests

### 3. **Database Scaling**

```sql
-- Partition training samples by month
CREATE TABLE ml_training_samples_2025_01
  PARTITION OF ml_training_samples
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Add indexes
CREATE INDEX CONCURRENTLY idx_samples_reward
  ON ml_training_samples(reward) WHERE reward IS NOT NULL;
```

---

## ✅ Success Metrics

### After 1 Week:
- [ ] 1000+ training samples collected
- [ ] Win rate > 55%
- [ ] Avg inference time < 100ms
- [ ] No memory leaks (stable tensor count)

### After 1 Month:
- [ ] 10,000+ training samples
- [ ] Win rate > 60%
- [ ] Sharpe ratio > 1.5
- [ ] Max drawdown < 15%
- [ ] 3+ model versions deployed

### After 3 Months:
- [ ] 50,000+ training samples
- [ ] Win rate > 65%
- [ ] Sharpe ratio > 2.0
- [ ] Automated retraining working
- [ ] Production-grade risk management

---

## 🎉 Sistema Pronto!

**Deployment Completed:**

✅ Database migrated
✅ ML models initialized
✅ Continuous learning active
✅ Production monitoring setup
✅ Risk management configured

**Next Steps:**

1. Monitor `/ml-analytics` dashboard
2. Collect 1000+ samples
3. Retrain with real data
4. Fine-tune hyperparameters
5. Scale to multiple assets

**🚀 Il sistema ML è ora in produzione con dati reali!**

---

## 📞 Support

Per problemi o domande:

1. Controlla `ML_SISTEMA_COMPLETO.md` per documentazione dettagliata
2. Verifica logs in browser console
3. Query Supabase per analytics
4. Test su `/ml-test` per diagnostica

**Happy Trading! 💰**
</boltArtifact>
