# ML API Deployment su Railway

## Step 1: Crea Account Railway

1. Vai su https://railway.app
2. Clicca "Login with GitHub"
3. Autorizza Railway

## Step 2: Crea Nuovo Progetto

1. Dashboard Railway → "New Project"
2. Seleziona "Deploy from GitHub repo"
3. Scegli: `paolosca90/ai-cash-evo`
4. Railway rileverà automaticamente Python

## Step 3: Configura Deployment

Railway leggerà automaticamente `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r api/requirements.txt"
  },
  "deploy": {
    "startCommand": "cd api && uvicorn ml_prediction_service:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health"
  }
}
```

## Step 4: Ottieni URL Deployment

Dopo il deployment (1-2 minuti):

1. Vai su "Settings" → "Domains"
2. Clicca "Generate Domain"
3. Copia l'URL (es: `https://ai-cash-evo-production.up.railway.app`)

## Step 5: Test ML API

```bash
curl https://YOUR-RAILWAY-URL.railway.app/health
```

Risposta:
```json
{"status":"healthy","model_available":true}
```

Test prediction:
```bash
curl -X POST https://YOUR-RAILWAY-URL.railway.app/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol":"EUR_USD","features":{"close":1.095,"rsi":55,"ema12":1.094,"ema21":1.093,"ema50":1.092,"atr":0.0015,"adx":28}}'
```

## Step 6: Configura Supabase

```bash
npx supabase secrets set ML_API_URL="https://YOUR-RAILWAY-URL.railway.app" --project-ref rvopmdflnecyrwrzhyfy
npx supabase functions deploy generate-ai-signals --project-ref rvopmdflnecyrwrzhyfy
```

## Costi

**Railway Free Tier:**
- $5 di crediti al mese (gratis)
- Sufficiente per ~500 requests/giorno
- Sleeping dopo 30 min di inattività (cold start ~10s)

**Railway Hobby ($5/mese):**
- Always-on (no cold starts)
- Più risorse

## Troubleshooting

### Build Failed
Verifica che:
- `api/requirements.txt` esista
- `ml_models/model_20251008_223513.pkl` sia nel repo (1.2MB)

### Model Not Loading
Check logs in Railway dashboard:
- "⚠️ Could not load model" → path errato
- "✅ Model loaded" → tutto ok

### Health Check Failed
- Verifica che `/health` risponda 200
- Check logs per errori Python

## Status

✅ Codice pronto per Railway
✅ Pushed su GitHub (commit 81ee607)
⏳ Deployment da fare manualmente su Railway
⏳ ML_API_URL da configurare in Supabase

## Alternative a Railway

Se preferisci:
- **Render**: https://render.com (simile a Railway)
- **Fly.io**: https://fly.io (più complesso)
- **Heroku**: https://heroku.com ($7/mese minimo)
