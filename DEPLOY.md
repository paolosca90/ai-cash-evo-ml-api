# Deploy ML API su Railway

## Step 1: Login Railway

1. Vai su https://railway.app
2. Clicca **"Login"** → **"Login with GitHub"**
3. Autorizza Railway ad accedere ai tuoi repository

## Step 2: Crea Nuovo Progetto

1. Dashboard Railway → **"+ New Project"**
2. Seleziona **"Deploy from GitHub repo"**
3. Cerca e seleziona: **`paolosca90/ai-cash-evo-ml-api`**
4. Railway inizierà il build automaticamente

## Step 3: Attendi Build (1-2 minuti)

Railway farà:
- ✅ Rileva Python 3.10 (da runtime.txt)
- ✅ Installa dependencies (da requirements.txt)
- ✅ Carica model.pkl (1.2MB)
- ✅ Avvia server FastAPI (da Procfile)

Vedrai i logs in tempo reale.

## Step 4: Genera Domain

1. Nel progetto Railway, vai su **"Settings"**
2. Scroll a **"Domains"**
3. Clicca **"Generate Domain"**
4. Railway genera un URL tipo: `https://ai-cash-evo-ml-api-production.up.railway.app`
5. **COPIA QUESTO URL** 📋

## Step 5: Test ML API

Apri browser e vai a:
```
https://YOUR-URL.railway.app/health
```

Dovresti vedere:
```json
{
  "status": "healthy",
  "model_available": true
}
```

✅ Se vedi `"model_available": true` → ML API funziona!

## Step 6: Configura Supabase

Torna al terminale e esegui:

```bash
cd "C:\Users\USER\Downloads\codice github\ai-cash-evo-main"

npx supabase secrets set ML_API_URL="https://YOUR-URL.railway.app" --project-ref rvopmdflnecyrwrzhyfy

npx supabase functions deploy generate-ai-signals --project-ref rvopmdflnecyrwrzhyfy
```

## Step 7: Test End-to-End

Genera un segnale trading su https://cash-revolution.com

Dovresti vedere:
- ✅ Confidence dinamica (60-90% con ML, 45-85% senza)
- ✅ "ML model prediction" nei reasoning

## Troubleshooting

### Build Failed
- Verifica che tutti i file siano nel repo GitHub
- Check Railway logs per errori specifici

### Model Not Available
- Verifica che `models/model.pkl` sia stato pushato (1.2MB)
- Check logs: dovrebbe dire "✅ Model loaded"

### Health Check 500 Error
- Railway potrebbe non aver finito il build
- Attendi 30 secondi e riprova

## Costi

**Railway Free Tier:**
- $5 crediti gratis al mese
- Sufficiente per ~500 predictions/giorno
- Cold start dopo 30 min inattività (~10s)

**Railway Hobby ($5/mese):**
- Always-on (no cold starts)
- Più risorse CPU/RAM

## Next Steps

Dopo deployment:
1. ✅ ML API live su Railway
2. ✅ Supabase configurato con ML_API_URL
3. ✅ Sistema ibrido completo attivo
