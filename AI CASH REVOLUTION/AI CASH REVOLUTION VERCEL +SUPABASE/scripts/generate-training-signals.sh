#!/bin/bash

# Script per generare segnali di training automaticamente
# Esegue generate-ai-signals ogni 3 ore per 10 simboli

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDc4ODQsImV4cCI6MjA3NDEyMzg4NH0.snlFF1ChbYsA765gXE-cMGb11jHIaF2np_pNxIGLgW8"
SUPABASE_URL="https://rvopmdflnecyrwrzhyfy.supabase.co"

# Simboli da tradare
SYMBOLS=("EURUSD" "GBPUSD" "USDJPY" "AUDUSD" "USDCAD" "NZDUSD" "EURGBP" "EURJPY" "XAUUSD" "XAGUSD")

echo "🚀 Generazione segnali training - $(date)"
echo "Simboli: ${SYMBOLS[@]}"
echo "---"

# Genera 1 segnale per ogni simbolo
for symbol in "${SYMBOLS[@]}"; do
  echo "📊 Generando segnale per $symbol..."

  response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/generate-ai-signals" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ANON_KEY" \
    -d "{\"symbol\":\"$symbol\"}")

  # Estrai info dal segnale
  signal_type=$(echo $response | jq -r '.type')
  confidence=$(echo $response | jq -r '.confidence')

  echo "   → $signal_type (conf: $confidence%)"

  # Aspetta 2 secondi tra un simbolo e l'altro
  sleep 2
done

echo "---"
echo "✅ Generati 10 segnali. Controlla su Supabase!"
echo ""
echo "📊 Query per verificare:"
echo "SELECT COUNT(*) FROM signal_performance WHERE created_at > NOW() - INTERVAL '1 hour';"
