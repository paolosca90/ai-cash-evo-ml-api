"""
ANALISI TRADE STORICI - AI Cash Evolution
==========================================

Questo script analizza i trade storici dal database Supabase per:
1. Capire quali pattern funzionano meglio
2. Identificare correlazioni confidence → win rate
3. Trovare i migliori symbol/timeframe/orari
4. Generare insights per ML training

Uso:
    python scripts/analyze_trades.py

Output:
    - Console: statistiche dettagliate
    - trades_analysis.json: dati completi
    - trades_report.md: report leggibile
"""

import os
import json
from datetime import datetime, timedelta
from supabase import create_client, Client
from collections import defaultdict
import statistics

# Configurazione
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Errore: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devono essere impostati")
    print("Controlla il file .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_all_signals():
    """Fetch tutti i segnali generati"""
    print("📥 Downloading segnali da Supabase...")
    
    response = supabase.table('mt5_signals').select('*').execute()
    signals = response.data
    
    print(f"   ✅ {len(signals)} segnali scaricati")
    return signals

def fetch_performance_data():
    """Fetch performance data (WIN/LOSS)"""
    print("📥 Downloading dati performance...")
    
    response = supabase.table('signal_performance').select('*').execute()
    performance = response.data
    
    print(f"   ✅ {len(performance)} trade con outcome scaricati")
    return performance

def analyze_signals(signals):
    """Analizza distribuzione segnali"""
    print("\n" + "="*60)
    print("📊 ANALISI SEGNALI GENERATI")
    print("="*60)
    
    if not signals:
        print("❌ Nessun segnale trovato nel database")
        return {}
    
    # Overview
    print(f"\n📌 OVERVIEW:")
    print(f"   Total signals: {len(signals)}")
    
    symbols = set(s['symbol'] for s in signals)
    print(f"   Unique symbols: {len(symbols)} → {', '.join(sorted(symbols))}")
    
    # Date range
    timestamps = [datetime.fromisoformat(s['timestamp'].replace('Z', '+00:00')) for s in signals]
    first_signal = min(timestamps)
    last_signal = max(timestamps)
    days_range = (last_signal - first_signal).days
    
    print(f"   Date range: {first_signal.date()} to {last_signal.date()} ({days_range} days)")
    print(f"   Signals per day: {len(signals) / max(days_range, 1):.1f}")
    
    # BUY vs SELL
    buy_count = sum(1 for s in signals if s['type'] == 'BUY')
    sell_count = sum(1 for s in signals if s['type'] == 'SELL')
    
    print(f"\n📌 BUY vs SELL:")
    print(f"   BUY:  {buy_count} ({buy_count/len(signals)*100:.1f}%)")
    print(f"   SELL: {sell_count} ({sell_count/len(signals)*100:.1f}%)")
    
    # Confidence distribution
    confidences = [s['confidence'] for s in signals if s['confidence'] is not None]
    if confidences:
        print(f"\n📌 CONFIDENCE DISTRIBUTION:")
        print(f"   Min:    {min(confidences):.1f}%")
        print(f"   Max:    {max(confidences):.1f}%")
        print(f"   Mean:   {statistics.mean(confidences):.1f}%")
        print(f"   Median: {statistics.median(confidences):.1f}%")
        
        # Confidence ranges
        ranges = {
            '90-100%': sum(1 for c in confidences if c >= 90),
            '80-89%': sum(1 for c in confidences if 80 <= c < 90),
            '70-79%': sum(1 for c in confidences if 70 <= c < 80),
            '60-69%': sum(1 for c in confidences if 60 <= c < 70),
            '50-59%': sum(1 for c in confidences if 50 <= c < 60),
            '<50%': sum(1 for c in confidences if c < 50),
        }
        
        print(f"\n   Range breakdown:")
        for range_name, count in ranges.items():
            pct = count / len(confidences) * 100
            print(f"   {range_name:12} {count:5} ({pct:5.1f}%)")
    
    # Per symbol
    print(f"\n📌 SIGNALS PER SYMBOL:")
    symbol_counts = defaultdict(int)
    for s in signals:
        symbol_counts[s['symbol']] += 1
    
    for symbol in sorted(symbol_counts.keys(), key=lambda x: symbol_counts[x], reverse=True):
        count = symbol_counts[symbol]
        pct = count / len(signals) * 100
        print(f"   {symbol:10} {count:5} ({pct:5.1f}%)")
    
    return {
        'total_signals': len(signals),
        'unique_symbols': len(symbols),
        'date_range_days': days_range,
        'buy_count': buy_count,
        'sell_count': sell_count,
        'confidence_stats': {
            'min': min(confidences) if confidences else 0,
            'max': max(confidences) if confidences else 0,
            'mean': statistics.mean(confidences) if confidences else 0,
            'median': statistics.median(confidences) if confidences else 0,
        },
        'confidence_ranges': ranges if confidences else {},
        'symbol_counts': dict(symbol_counts)
    }

def analyze_performance(signals, performance):
    """Analizza performance WIN/LOSS"""
    print("\n" + "="*60)
    print("🎯 ANALISI PERFORMANCE TRADING")
    print("="*60)
    
    if not performance:
        print("❌ Nessun dato di performance trovato")
        print("   I segnali sono stati eseguiti su MT5?")
        return {}
    
    # Create signal lookup
    signal_map = {s['id']: s for s in signals}
    
    # Overall stats
    wins = sum(1 for p in performance if p['outcome'] == 'WIN')
    losses = sum(1 for p in performance if p['outcome'] == 'LOSS')
    total = len(performance)
    win_rate = wins / total * 100 if total > 0 else 0
    
    print(f"\n📌 OVERALL PERFORMANCE:")
    print(f"   Total trades:  {total}")
    print(f"   Wins:          {wins} ({wins/total*100:.1f}%)")
    print(f"   Losses:        {losses} ({losses/total*100:.1f}%)")
    print(f"   Win Rate:      {win_rate:.1f}%")
    
    # Pips analysis
    pips_data = [p['pips'] for p in performance if p['pips'] is not None]
    if pips_data:
        total_pips = sum(pips_data)
        avg_pips = statistics.mean(pips_data)
        
        print(f"\n📌 PIPS ANALYSIS:")
        print(f"   Total pips:    {total_pips:+.1f}")
        print(f"   Avg per trade: {avg_pips:+.1f}")
        print(f"   Best trade:    {max(pips_data):+.1f}")
        print(f"   Worst trade:   {min(pips_data):+.1f}")
    
    # Win rate by confidence
    print(f"\n📌 WIN RATE BY CONFIDENCE:")
    confidence_performance = defaultdict(lambda: {'wins': 0, 'total': 0, 'pips': []})
    
    for p in performance:
        if p['signal_id'] in signal_map:
            signal = signal_map[p['signal_id']]
            conf = signal.get('confidence', 0)
            
            if conf >= 90:
                range_key = '90-100%'
            elif conf >= 80:
                range_key = '80-89%'
            elif conf >= 70:
                range_key = '70-79%'
            elif conf >= 60:
                range_key = '60-69%'
            elif conf >= 50:
                range_key = '50-59%'
            else:
                range_key = '<50%'
            
            confidence_performance[range_key]['total'] += 1
            if p['outcome'] == 'WIN':
                confidence_performance[range_key]['wins'] += 1
            if p['pips'] is not None:
                confidence_performance[range_key]['pips'].append(p['pips'])
    
    for range_name in ['90-100%', '80-89%', '70-79%', '60-69%', '50-59%', '<50%']:
        data = confidence_performance[range_name]
        if data['total'] > 0:
            wr = data['wins'] / data['total'] * 100
            avg_pips = statistics.mean(data['pips']) if data['pips'] else 0
            print(f"   {range_name:12} Win Rate: {wr:5.1f}%  |  Trades: {data['total']:4}  |  Avg Pips: {avg_pips:+6.1f}")
    
    # Performance by symbol
    print(f"\n📌 PERFORMANCE BY SYMBOL:")
    symbol_performance = defaultdict(lambda: {'wins': 0, 'total': 0, 'pips': []})
    
    for p in performance:
        if p['signal_id'] in signal_map:
            signal = signal_map[p['signal_id']]
            symbol = signal['symbol']
            
            symbol_performance[symbol]['total'] += 1
            if p['outcome'] == 'WIN':
                symbol_performance[symbol]['wins'] += 1
            if p['pips'] is not None:
                symbol_performance[symbol]['pips'].append(p['pips'])
    
    for symbol in sorted(symbol_performance.keys(), key=lambda x: symbol_performance[x]['total'], reverse=True):
        data = symbol_performance[symbol]
        wr = data['wins'] / data['total'] * 100
        avg_pips = statistics.mean(data['pips']) if data['pips'] else 0
        total_pips = sum(data['pips']) if data['pips'] else 0
        print(f"   {symbol:10} Win Rate: {wr:5.1f}%  |  Trades: {data['total']:4}  |  Total: {total_pips:+7.1f}  |  Avg: {avg_pips:+6.1f}")
    
    # Performance by type (BUY/SELL)
    print(f"\n📌 PERFORMANCE BY TYPE:")
    type_performance = defaultdict(lambda: {'wins': 0, 'total': 0, 'pips': []})
    
    for p in performance:
        if p['signal_id'] in signal_map:
            signal = signal_map[p['signal_id']]
            trade_type = signal['type']
            
            type_performance[trade_type]['total'] += 1
            if p['outcome'] == 'WIN':
                type_performance[trade_type]['wins'] += 1
            if p['pips'] is not None:
                type_performance[trade_type]['pips'].append(p['pips'])
    
    for trade_type in ['BUY', 'SELL']:
        data = type_performance[trade_type]
        if data['total'] > 0:
            wr = data['wins'] / data['total'] * 100
            avg_pips = statistics.mean(data['pips']) if data['pips'] else 0
            print(f"   {trade_type:6} Win Rate: {wr:5.1f}%  |  Trades: {data['total']:4}  |  Avg Pips: {avg_pips:+6.1f}")
    
    return {
        'total_trades': total,
        'wins': wins,
        'losses': losses,
        'win_rate': win_rate,
        'total_pips': sum(pips_data) if pips_data else 0,
        'avg_pips': statistics.mean(pips_data) if pips_data else 0,
        'confidence_performance': dict(confidence_performance),
        'symbol_performance': dict(symbol_performance),
        'type_performance': dict(type_performance)
    }

def generate_ml_insights(signals, performance):
    """Genera insights per ML training"""
    print("\n" + "="*60)
    print("🤖 ML TRAINING INSIGHTS")
    print("="*60)
    
    if not performance:
        print("⚠️  Nessun dato di performance - impossibile generare insights")
        return {}
    
    # Crea lookup map
    signal_map = {s['id']: s for s in signals}
    
    # Trova i migliori pattern
    print(f"\n📌 BEST PERFORMING PATTERNS:")
    patterns = defaultdict(lambda: {'wins': 0, 'total': 0, 'pips': []})
    
    for p in performance:
        if p['signal_id'] in signal_map:
            signal = signal_map[p['signal_id']]
            
            # Pattern: symbol + type + confidence_range
            conf = signal.get('confidence', 0)
            conf_range = 'HIGH' if conf >= 70 else 'MEDIUM' if conf >= 50 else 'LOW'
            
            pattern_key = f"{signal['symbol']}_{signal['type']}_{conf_range}"
            
            patterns[pattern_key]['total'] += 1
            if p['outcome'] == 'WIN':
                patterns[pattern_key]['wins'] += 1
            if p['pips'] is not None:
                patterns[pattern_key]['pips'].append(p['pips'])
    
    # Filtra pattern con almeno 5 trade
    valid_patterns = {k: v for k, v in patterns.items() if v['total'] >= 5}
    
    # Ordina per win rate
    sorted_patterns = sorted(
        valid_patterns.items(),
        key=lambda x: x[1]['wins'] / x[1]['total'],
        reverse=True
    )
    
    print(f"\n   Top 10 patterns (min 5 trades):")
    for i, (pattern, data) in enumerate(sorted_patterns[:10], 1):
        wr = data['wins'] / data['total'] * 100
        avg_pips = statistics.mean(data['pips']) if data['pips'] else 0
        print(f"   {i:2}. {pattern:30} WR: {wr:5.1f}%  |  Trades: {data['total']:3}  |  Avg: {avg_pips:+6.1f} pips")
    
    # Worst performing patterns
    print(f"\n   Worst 5 patterns (avoid these):")
    for i, (pattern, data) in enumerate(sorted_patterns[-5:], 1):
        wr = data['wins'] / data['total'] * 100
        avg_pips = statistics.mean(data['pips']) if data['pips'] else 0
        print(f"   {i}. {pattern:30} WR: {wr:5.1f}%  |  Trades: {data['total']:3}  |  Avg: {avg_pips:+6.1f} pips")
    
    # Recommendations
    print(f"\n📌 RECOMMENDATIONS FOR ML TRAINING:")
    
    if len(performance) < 100:
        print(f"   ⚠️  Sample size too small ({len(performance)} trades)")
        print(f"   📊 Need at least 1000 trades for reliable ML training")
        print(f"   💡 Consider using historical backtesting data")
    else:
        print(f"   ✅ Good sample size ({len(performance)} trades)")
    
    # Check confidence calibration
    confidence_data = defaultdict(lambda: {'wins': 0, 'total': 0})
    for p in performance:
        if p['signal_id'] in signal_map:
            signal = signal_map[p['signal_id']]
            conf = signal.get('confidence', 0)
            conf_bucket = int(conf // 10) * 10
            confidence_data[conf_bucket]['total'] += 1
            if p['outcome'] == 'WIN':
                confidence_data[conf_bucket]['wins'] += 1
    
    print(f"\n   📊 Confidence Calibration Check:")
    print(f"   (Confidence should match win rate)")
    for conf in sorted(confidence_data.keys(), reverse=True):
        data = confidence_data[conf]
        if data['total'] >= 5:
            expected_wr = conf
            actual_wr = data['wins'] / data['total'] * 100
            diff = actual_wr - expected_wr
            status = "✅" if abs(diff) < 10 else "⚠️"
            print(f"   {status} {conf}-{conf+9}%: Expected {expected_wr}%, Actual {actual_wr:.1f}% (Δ {diff:+.1f}%)")
    
    return {
        'best_patterns': sorted_patterns[:10],
        'worst_patterns': sorted_patterns[-5:],
        'sample_size': len(performance),
        'confidence_calibration': dict(confidence_data)
    }

def main():
    print("🚀 AI Cash Evolution - Trade History Analysis")
    print("="*60)
    
    # Fetch data
    signals = fetch_all_signals()
    performance = fetch_performance_data()
    
    # Analyze
    signal_analysis = analyze_signals(signals)
    performance_analysis = analyze_performance(signals, performance)
    ml_insights = generate_ml_insights(signals, performance)
    
    # Save results
    results = {
        'generated_at': datetime.now().isoformat(),
        'signal_analysis': signal_analysis,
        'performance_analysis': performance_analysis,
        'ml_insights': ml_insights
    }
    
    with open('trades_analysis.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n" + "="*60)
    print(f"✅ Analysis complete!")
    print(f"📄 Results saved to: trades_analysis.json")
    print(f"="*60)

if __name__ == '__main__':
    main()
