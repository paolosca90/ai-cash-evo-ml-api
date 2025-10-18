# Advanced Neural Training Module

Questo modulo implementa una pipeline completa per il training di una rete neurale multi-layer perceptron (MLP) sui dati FX provenienti da Polygon.io. Vengono calcolati indicatori tecnici avanzati tramite `pandas-ta`, generati label forward-looking e ottimizzati i pesi dei simboli in output.

## Requisiti

1. Python 3.10+
2. Librerie specificate in `requirements.txt` (installazione consigliata dentro un virtual environment):
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
3. Chiave API OANDA (practice o live) con permesso di lettura storica.

## Variabili d'ambiente

Crea un file `.env` dentro `ml_advanced_training/` oppure esporta le variabili direttamente:

```env
OANDA_API_KEY=la_tua_chiave
# facoltativo: per passare da ambiente practice a live
OANDA_API_URL=https://api-fxpractice.oanda.com
TRAINING_SYMBOLS=EURUSD,GBPUSD,USDJPY,XAUUSD
TRAINING_START=2025-06-01
TRAINING_END=2025-08-31
TEST_START=2025-09-01
TEST_END=2025-09-30
```

Le date possono essere modificate in base all'intervallo desiderato (massimo 50k candele per richiesta su Polygon a passo 5 minuti).

## Esecuzione

```powershell
cd ml_advanced_training
python train_model.py
```

Il processo esegue i seguenti passaggi:

1. Scarica i dataset train/test per ogni simbolo configurato tramite le REST API OANDA.
2. Calcola indicatori tecnici avanzati (`RSI`, `EMA`, `ATR`, `Stocastico`, `PPO`, `TSI`, `Bande di Bollinger`, ecc.).
3. Genera label binarie basate sul rendimento futuro a 6 barre e su misure di volatilità.
4. Esegue una ricerca a griglia su `MLPClassifier` (architetture e regolarizzazione).
5. Valida il modello sul periodo di test calcolando ROC AUC, classification report e matrice di confusione.
6. Calcola la probabilità media per simbolo e normalizza i pesi da inviare al motore di trading o a Supabase.
7. Salva output:
   - `models/mlp_model_<timestamp>.joblib`: pipeline completa (scaler + modello) e feature list.
   - `reports/classification_report_<timestamp>.txt`: metriche di classificazione.
   - `reports/confusion_matrix_<timestamp>.json`: matrice di confusione.
   - `outputs/metrics_<timestamp>.json`: ROC AUC, parametri migliori e score cross-validation.
   - `outputs/weights_<timestamp>.json`: pesi normalizzati per simbolo.

## Integrazione Successiva

- I file JSON possono essere letti da funzioni Supabase per aggiornare i pesi in tempo reale.
- Il modello `joblib` permette inferenza batch su nuovi dati, mantenendo la stessa trasformazione.
- È possibile estendere `features/technical_indicators.py` per aggiungere ulteriori segnali specializzati.

## Troubleshooting

- **Polygon rate limit**: aggiungere sleep tra le richieste o restringere l'intervallo temporale.
- **Dataset vuoto**: verificare simbolo e date; per FX usare il prefisso `C:` (gestito automaticamente dal client).
- **Convergenza MLP lenta**: regolare `max_iter`, `learning_rate_init` o ridurre la dimensione della rete.
