"""
OANDA Historical Data Downloader
=================================

Scarica 4 mesi di dati storici da OANDA:
- 3 mesi (Luglio-Settembre 2025) per TRAINING
- 1 mese (Ottobre 2025) per TESTING

Configurazione:
- Symbols: EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, NZDUSD
- Granularities: M5, M15, H1, H4
- Total candles: ~300,000

Uso:
    python scripts/download_oanda_data.py
"""

import os
import sys
import time
import requests
from datetime import datetime, timedelta
from supabase import create_client, Client
import json
from dotenv import load_dotenv

# Carica variabili d'ambiente dal file .env
load_dotenv()

# Configurazione
OANDA_API_KEY = os.getenv('OANDA_API_KEY') or os.getenv('VITE_OANDA_API_KEY')
OANDA_ACCOUNT_ID = os.getenv('OANDA_ACCOUNT_ID') or os.getenv('VITE_OANDA_ACCOUNT_ID')
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_SERVICE_ROLE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')

if not all([OANDA_API_KEY, SUPABASE_URL, SUPABASE_KEY]):
    print("❌ Errore: Variabili d'ambiente mancanti")
    print("   Necessari: OANDA_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Configurazione download
SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'XAUUSD']
GRANULARITIES = ['M1', 'M5', 'M15', 'H1', 'H4']

# Date ranges
TRAINING_START = datetime(2025, 7, 1)  # 1 Luglio 2025
TRAINING_END = datetime(2025, 8, 31, 23, 59, 59)  # 31 Agosto 2025 (2 mesi)
TESTING_START = datetime(2025, 9, 1)  # 1 Settembre 2025
TESTING_END = datetime(2025, 9, 30, 23, 59, 59)  # 30 Settembre 2025 (1 mese)

MAX_CANDLES_PER_REQUEST = 5000
RATE_LIMIT_DELAY = 0.5  # secondi tra richieste

# Mapping granularity per OANDA
GRANULARITY_MAP = {
    'M1': 'M1',
    'M5': 'M5',
    'M15': 'M15',
    'H1': 'H1',
    'H4': 'H4',
    'D1': 'D'
}

def format_instrument(symbol: str) -> str:
    """Formatta symbol per OANDA API (EURUSD -> EUR_USD)"""
    if '_' in symbol:
        return symbol
    if len(symbol) == 6:
        return f"{symbol[:3]}_{symbol[3:]}"
    return symbol

def fetch_oanda_candles(instrument: str, granularity: str, from_time: datetime, to_time: datetime):
    """Scarica candles da OANDA API"""
    formatted_instrument = format_instrument(instrument)
    oanda_granularity = GRANULARITY_MAP.get(granularity, granularity)
    
    url = f"https://api-fxpractice.oanda.com/v3/instruments/{formatted_instrument}/candles"
    headers = {
        'Authorization': f'Bearer {OANDA_API_KEY}',
        'Accept': 'application/json'
    }
    params = {
        'granularity': oanda_granularity,
        'from': from_time.strftime('%Y-%m-%dT%H:%M:%S.000000Z'),
        'to': to_time.strftime('%Y-%m-%dT%H:%M:%S.000000Z'),
        'price': 'M'  # Mid prices
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        
        # Filtra solo candles complete
        candles = [c for c in data.get('candles', []) if c.get('complete', False)]
        return candles
    
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Errore OANDA API: {e}")
        return []

def save_candles_to_db(candles: list, symbol: str, granularity: str, dataset_type: str):
    """Salva candles nel database Supabase"""
    if not candles:
        return 0
    
    records = []
    for candle in candles:
        timestamp = candle['time']
        mid = candle['mid']
        
        record = {
            'symbol': symbol,
            'granularity': granularity,
            'timestamp': timestamp,
            'open': float(mid['o']),
            'high': float(mid['h']),
            'low': float(mid['l']),
            'close': float(mid['c']),
            'volume': candle.get('volume', 0),
            'is_labeled': False,
            'dataset_type': dataset_type  # 'training' o 'testing'
        }
        records.append(record)
    
    # Salva in batch di 1000
    batch_size = 1000
    total_saved = 0
    
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        
        try:
            # Upsert per evitare duplicati
            result = supabase.table('ml_historical_candles').upsert(
                batch,
                on_conflict='symbol,granularity,timestamp'
            ).execute()
            
            total_saved += len(batch)
            
        except Exception as e:
            print(f"   ⚠️  Errore salvataggio batch: {e}")
    
    return total_saved

def download_dataset(symbol: str, granularity: str, start_date: datetime, end_date: datetime, dataset_type: str):
    """Scarica un intero dataset per symbol + granularity"""
    print(f"\n📥 {symbol} {granularity} ({dataset_type.upper()})")
    
    # Crea batch record per questo symbol/granularity
    batch_id = create_batch_record(dataset_type, symbol, granularity, start_date, end_date)
    
    total_candles = 0
    current_start = start_date
    
    while current_start < end_date:
        # Calcola finestra temporale per questa richiesta
        # OANDA limita a 5000 candles, stimiamo il tempo necessario
        if granularity == 'M1':
            time_window = timedelta(days=3)  # ~5000 candles M1 = ~3.5 giorni
        elif granularity == 'M5':
            time_window = timedelta(days=17)  # ~5000 candles M5
        elif granularity == 'M15':
            time_window = timedelta(days=52)
        elif granularity == 'H1':
            time_window = timedelta(days=208)
        elif granularity == 'H4':
            time_window = timedelta(days=833)
        else:
            time_window = timedelta(days=30)
        
        current_end = min(current_start + time_window, end_date)
        
        # Fetch candles
        candles = fetch_oanda_candles(symbol, granularity, current_start, current_end)
        
        if candles:
            # Save to database
            saved = save_candles_to_db(candles, symbol, granularity, dataset_type)
            total_candles += saved
            
            print(f"   ✅ {current_start.date()} to {current_end.date()}: {saved} candles")
        else:
            print(f"   ⚠️  {current_start.date()} to {current_end.date()}: No data")
        
        # Rate limiting
        time.sleep(RATE_LIMIT_DELAY)
        
        # Avanza finestra
        current_start = current_end + timedelta(seconds=1)
    
    # Aggiorna batch record
    if batch_id:
        update_batch_record(batch_id, total_candles)
    
    print(f"   📊 Total: {total_candles} candles")
    return total_candles

def create_batch_record(dataset_type: str, symbol: str, granularity: str, start_date: datetime, end_date: datetime):
    """Crea record di tracking nel database"""
    batch_data = {
        'batch_name': f'{dataset_type.upper()}_{symbol}_{granularity}_{datetime.now().strftime("%Y%m%d")}',
        'symbol': symbol,
        'granularity': granularity,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_candles': 0,
        'labeled_candles': 0,
        'status': 'processing'
    }
    
    try:
        result = supabase.table('ml_training_batches').insert(batch_data).execute()
        return result.data[0]['id']
    except Exception as e:
        print(f"⚠️  Errore creazione batch: {e}")
        return None

def update_batch_record(batch_id: str, total_candles: int, status: str = 'completed'):
    """Aggiorna batch record"""
    try:
        supabase.table('ml_training_batches').update({
            'total_candles': total_candles,
            'status': status,
            'completed_at': datetime.now().isoformat()
        }).eq('id', batch_id).execute()
    except Exception as e:
        print(f"⚠️  Errore aggiornamento batch: {e}")

def main():
    print("🚀 OANDA Historical Data Download")
    print("="*70)
    print(f"📊 Configuration:")
    print(f"   Symbols: {', '.join(SYMBOLS)}")
    print(f"   Granularities: {', '.join(GRANULARITIES)}")
    print(f"   Training: {TRAINING_START.date()} to {TRAINING_END.date()} (2 months)")
    print(f"   Testing:  {TESTING_START.date()} to {TESTING_END.date()} (1 month)")
    print("="*70)
    
    # Conferma
    response = input("\n🔥 Start download? This will take 15-30 minutes. (y/n): ")
    if response.lower() != 'y':
        print("❌ Download cancelled")
        return
    
    start_time = time.time()
    
    # === TRAINING DATASET ===
    print("\n" + "="*70)
    print("📚 DOWNLOADING TRAINING DATASET (2 months: Jul-Aug)")
    print("="*70)
    
    training_total = 0
    
    for symbol in SYMBOLS:
        for granularity in GRANULARITIES:
            candles = download_dataset(symbol, granularity, TRAINING_START, TRAINING_END, 'training')
            training_total += candles
    
    print(f"\n✅ Training dataset complete: {training_total:,} candles")
    
    # === TESTING DATASET ===
    print("\n" + "="*70)
    print("🧪 DOWNLOADING TESTING DATASET (1 month: Sep)")
    print("="*70)
    
    testing_total = 0
    
    for symbol in SYMBOLS:
        for granularity in GRANULARITIES:
            candles = download_dataset(symbol, granularity, TESTING_START, TESTING_END, 'testing')
            testing_total += candles
    
    print(f"\n✅ Testing dataset complete: {testing_total:,} candles")
    
    # === SUMMARY ===
    elapsed_time = time.time() - start_time
    
    print("\n" + "="*70)
    print("🎉 DOWNLOAD COMPLETE!")
    print("="*70)
    print(f"📊 Statistics:")
    print(f"   Training candles: {training_total:,}")
    print(f"   Testing candles:  {testing_total:,}")
    print(f"   Total candles:    {training_total + testing_total:,}")
    print(f"   Time elapsed:     {elapsed_time/60:.1f} minutes")
    print(f"   Symbols x Granularities: {len(SYMBOLS)} x {len(GRANULARITIES)} = {len(SYMBOLS)*len(GRANULARITIES)} batches per dataset")
    print("="*70)
    
    print("\n📝 Next steps:")
    print("   1. Run labeling: python scripts/label_dataset.py")
    print("   2. Verify data: Check Supabase ml_historical_candles table")
    print("   3. Train model: python scripts/train_ml_model.py")
    
    # Salva summary
    summary = {
        'download_completed_at': datetime.now().isoformat(),
        'training': {
            'candles': training_total,
            'start_date': TRAINING_START.isoformat(),
            'end_date': TRAINING_END.isoformat(),
            'symbols': SYMBOLS,
            'granularities': GRANULARITIES
        },
        'testing': {
            'candles': testing_total,
            'start_date': TESTING_START.isoformat(),
            'end_date': TESTING_END.isoformat(),
            'symbols': SYMBOLS,
            'granularities': GRANULARITIES
        },
        'elapsed_minutes': elapsed_time / 60
    }
    
    with open('download_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n💾 Summary saved to: download_summary.json")

if __name__ == '__main__':
    main()
