import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

def parse_dom_data(file_path):
    """
    Converte un file CSV con dati DOM (Depth of Market) a 10 livelli
    in un DataFrame pandas strutturato.

    Formato input: timestamp, bid1_price, bid1_volume, bid2_price, bid2_volume, ..., ask10_price, ask10_volume
    """

    # Leggi il file CSV
    with open(file_path, 'r') as file:
        lines = file.readlines()

    data = []

    for line_num, line in enumerate(lines, 1):
        if line.strip():
            try:
                values = line.strip().split(',')
                print(f"Debug: Riga {line_num} ha {len(values)} valori")

                # Gestisci differenti formati di dati
                if len(values) < 41:
                    print(f"Avviso: Riga {line_num} ha solo {len(values)} valori (minimo 41 richiesti)")
                    continue
                elif len(values) == 41:
                    # Formato standard: timestamp + 40 valori DOM
                    pass
                elif len(values) == 42:
                    # Formato con 1 valore extra: timestamp + extra + 40 valori DOM
                    values = [values[0]] + values[2:]  # Mantieni timestamp, rimuovi il valore extra
                    print(f"Avviso: Riga {line_num} ha 42 valori, rimosso 1 valore extra")
                elif len(values) == 43:
                    # Formato con 2 valori extra: timestamp + extra1 + extra2 + 40 valori DOM
                    values = [values[0]] + values[3:]  # Mantieni timestamp, rimuovi i 2 valori extra
                    print(f"Avviso: Riga {line_num} ha 43 valori, rimossi 2 valori extra")
                else:
                    print(f"Avviso: Riga {line_num} ha {len(values)} valori, usando solo gli ultimi 41")
                    values = [values[0]] + values[-40:]  # Mantieni timestamp, prendi ultimi 40 valori

                # Estrai timestamp
                timestamp_raw = values[0]

                # Prova diversi formati di timestamp
                try:
                    # 1. Prova formato datetime diretto (YYYY-MM-DD HH:MM:SS)
                    if ':' in timestamp_raw and '-' in timestamp_raw:
                        datetime_obj = datetime.strptime(timestamp_raw, '%Y-%m-%d %H:%M:%S')
                        timestamp = datetime_obj.timestamp()
                    else:
                        # 2. Prova timestamp numerico
                        timestamp = float(timestamp_raw)
                        if timestamp > 1000000000:  # Timestamp Unix recente
                            datetime_obj = datetime.fromtimestamp(timestamp)
                        else:
                            # 3. Prova timestamp di oggi (ora di giorno in secondi)
                            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                            datetime_obj = today + timedelta(seconds=timestamp)

                except (ValueError, OSError):
                    # 4. Fallback: usa data e ora correnti
                    datetime_obj = datetime.now()
                    timestamp = datetime_obj.timestamp()
                    print(f"Avviso: Timestamp {timestamp_raw} non valido, usando data corrente")

                # Estrai dati bid (livelli 1-10)
                bid_levels = []
                for i in range(10):
                    price_idx = 1 + i * 2
                    volume_idx = 2 + i * 2
                    bid_levels.append({
                        'level': i + 1,
                        'price': float(values[price_idx]) if values[price_idx] else np.nan,
                        'volume': float(values[volume_idx]) if values[volume_idx] else 0
                    })

                # Estrai dati ask (livelli 1-10)
                ask_levels = []
                for i in range(10):
                    price_idx = 21 + i * 2  # Inizio dei dati ask
                    volume_idx = 22 + i * 2
                    ask_levels.append({
                        'level': i + 1,
                        'price': float(values[price_idx]) if values[price_idx] else np.nan,
                        'volume': float(values[volume_idx]) if values[volume_idx] else 0
                    })

                # Crea record principale
                record = {
                    'timestamp': timestamp,
                    'datetime': datetime_obj,
                    'best_bid': bid_levels[0]['price'],
                    'best_bid_volume': bid_levels[0]['volume'],
                    'best_ask': ask_levels[0]['price'],
                    'best_ask_volume': ask_levels[0]['volume'],
                    'spread': ask_levels[0]['price'] - bid_levels[0]['price'] if (ask_levels[0]['price'] and bid_levels[0]['price']) else np.nan,
                    'mid_price': (ask_levels[0]['price'] + bid_levels[0]['price']) / 2 if (ask_levels[0]['price'] and bid_levels[0]['price']) else np.nan
                }

                # Aggiungi dati dettagliati per ogni livello
                for i, (bid, ask) in enumerate(zip(bid_levels, ask_levels)):
                    record[f'bid_{i+1}_price'] = bid['price']
                    record[f'bid_{i+1}_volume'] = bid['volume']
                    record[f'ask_{i+1}_price'] = ask['price']
                    record[f'ask_{i+1}_volume'] = ask['volume']

                # Calcola volume totale bid e ask
                total_bid_volume = sum(bid['volume'] for bid in bid_levels if bid['volume'])
                total_ask_volume = sum(ask['volume'] for ask in ask_levels if ask['volume'])
                record['total_bid_volume'] = total_bid_volume
                record['total_ask_volume'] = total_ask_volume
                record['volume_imbalance'] = total_bid_volume - total_ask_volume

                data.append(record)

            except Exception as e:
                print(f"Errore nel processare la riga {line_num}: {e}")
                continue

    # Crea DataFrame
    df = pd.DataFrame(data)

    if not df.empty:
        # Imposta datetime come indice
        df = df.set_index('datetime')

        # Ordina per timestamp
        df = df.sort_index()

        # Calcola colonne aggiuntive
        df['bid_ask_ratio'] = df['total_bid_volume'] / df['total_ask_volume'].replace(0, np.nan)
        df['weighted_bid_price'] = sum(df[f'bid_{i+1}_price'] * df[f'bid_{i+1}_volume'] for i in range(10)) / df['total_bid_volume'].replace(0, np.nan)
        df['weighted_ask_price'] = sum(df[f'ask_{i+1}_price'] * df[f'ask_{i+1}_volume'] for i in range(10)) / df['total_ask_volume'].replace(0, np.nan)

    return df

def save_processed_data(df, input_file, format='csv'):
    """
    Salva il DataFrame processato in vari formati
    """
    base_name = os.path.splitext(input_file)[0]

    if format.lower() == 'csv':
        output_file = f"{base_name}_processed.csv"
        df.to_csv(output_file)
        print(f"Dati salvati in: {output_file}")

    elif format.lower() == 'parquet':
        output_file = f"{base_name}_processed.parquet"
        df.to_parquet(output_file)
        print(f"Dati salvati in: {output_file}")

    elif format.lower() == 'excel':
        output_file = f"{base_name}_processed.xlsx"
        df.to_excel(output_file)
        print(f"Dati salvati in: {output_file}")

    return output_file

def analyze_dom_data(df):
    """
    Analisi statistica dei dati DOM
    """
    print("\n=== ANALISI DATI DOM ===")
    print(f"Numero di record: {len(df)}")
    print(f"Periodo: da {df.index.min()} a {df.index.max()}")
    print(f"\nStatistiche spread:")
    print(f"  Media: {df['spread'].mean():.4f}")
    print(f"  Min: {df['spread'].min():.4f}")
    print(f"  Max: {df['spread'].max():.4f}")
    print(f"  Dev std: {df['spread'].std():.4f}")

    print(f"\nStatistiche volume totale:")
    print(f"  Bid medio: {df['total_bid_volume'].mean():.2f}")
    print(f"  Ask medio: {df['total_ask_volume'].mean():.2f}")
    print(f"  Volume imbalance medio: {df['volume_imbalance'].mean():.2f}")

    print(f"\nPrezzi best levels:")
    print(f"  Best bid medio: {df['best_bid'].mean():.4f}")
    print(f"  Best ask medio: {df['best_ask'].mean():.4f}")
    print(f"  Mid price medio: {df['mid_price'].mean():.4f}")

    return df.describe()

def main():
    # File di input
    input_file = "tick_export_dom10L.csv"

    if not os.path.exists(input_file):
        print(f"Errore: File {input_file} non trovato")
        return

    print(f"Processando file: {input_file}")

    # Processa i dati
    df = parse_dom_data(input_file)

    if df.empty:
        print("Nessun dato processato")
        return

    # Analisi statistica
    stats = analyze_dom_data(df)

    # Salva in formato CSV
    save_processed_data(df, input_file, 'csv')

    # Mostra prime righe
    print(f"\n=== PRIME 5 RIGHE DEL DATASET ===")
    print(df.head())

    # Mostra colonne disponibili
    print(f"\n=== COLONNE DISPONIBILI ===")
    print(df.columns.tolist())

    return df

if __name__ == "__main__":
    df = main()

    # Esempio di utilizzo per analisi successive
    if df is not None and not df.empty:
        print(f"\n=== ESEMPI DI ANALISI AGGIUNTIVE ===")

        # Filtra per spread alto
        high_spread = df[df['spread'] > df['spread'].quantile(0.9)]
        print(f"Record con spread alto (>90° percentile): {len(high_spread)}")

        # Calcola moving average del mid price
        df['mid_price_ma_10'] = df['mid_price'].rolling(window=10).mean()
        print(f"Moving average calcolata con successo")

        # Identifica pattern di volume imbalance
        extreme_imbalance = df[abs(df['volume_imbalance']) > df['volume_imbalance'].quantile(0.95)]
        print(f"Record con volume imbalance estremo: {len(extreme_imbalance)}")