# AI Cash Revolution EA - Gestione Volume e Configurazione Simboli

## 📋 Tabella Parametri EA

### 🔧 Parametri di Gestione Volume

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `VolumeManagementMode` | Enum | `PERCENTAGE` | Modalità calcolo volume: `FIXED`, `PERCENTAGE`, `CURRENCY` |
| `FixedVolume` | Double | `0.01` | Volume fisso in lotti (usato con `FIXED` mode) |
| `RiskPercentage` | Double | `2.0` | Percentuale di rischio del conto (usato con `PERCENTAGE` mode) |
| `RiskCurrency` | Double | `100.0` | Importo fisso in valuta del conto (usato con `CURRENCY` mode) |
| `MinVolume` | Double | `0.01` | Volume minimo consentito |
| `MaxVolume` | Double | `10.0` | Volume massimo consentito |

### 📊 Altri Parametri Important

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `UserEmail` | String | `""` | Email utente per identificazione segnali |
| `MagicNumber` | Integer | `888777` | Numero magico per identificare i trade |
| `MaxSpreadPips` | Double | `3.0` | Spread massimo consentito in pip |
| `SlippagePoints` | Integer | `3` | Slippage massimo consentito |
| `AutoExecuteTrades` | Boolean | `true` | Esecuzione automatica dei segnali |

## 🎯 Modalità di Calcolo Volume

### 1. Modalità Lotto Fisso (`FIXED`)
```mql5
VolumeManagementMode = FIXED
FixedVolume = 0.05  // Esempio: 0.05 lotti fissi per ogni trade
```

**Caratteristiche:**
- Volume identico per tutti i trade
- Indicata per trader principianti o strategie con rischio uniforme
- Semplice da configurare e gestire

### 2. Modalità Rischio Percentuale (`PERCENTAGE`)
```mql5
VolumeManagementMode = PERCENTAGE
RiskPercentage = 2.0  // 2% del saldo del conto a rischio
```

**Formula di calcolo:**
```mql5
Volume = (AccountBalance * RiskPercentage / 100) / (RiskDistancePips * PipValue)
```

**Caratteristiche:**
- Volume si adatta alle dimensioni del conto
- Rischio costante in percentuale
- Ideale per gestione del money management professionale

### 3. Modalità Rischio Valuta (`CURRENCY`)
```mql5
VolumeManagementMode = CURRENCY
RiskCurrency = 150.0  // €150 fissi di rischio per trade
```

**Formula di calcolo:**
```mql5
Volume = RiskCurrency / (RiskDistancePips * PipValue)
```

**Caratteristiche:**
- Rischio monetario fisso per ogni trade
- Indipendente dalle dimensioni del conto
- Utile per strategie con target di rischio predefinito

## 🗺️ Configurazione Simboli e Mapping

### Mapping Automatico Simboli

L'EA include un sistema di mapping automatico per gestire differenze tra simboli del broker e simboli OANDA:

```mql5
// Struttura mapping simboli
struct SymbolMapping {
    string oandaSymbol;    // Simbolo OANDA ricevuto dal backend
    string brokerSymbol;   // Simbolo effettivo del broker
    string suffix;         // Suffisso del broker (es: .m, .c, .ecn)
    double multiplier;     // Moltiplicatore per lotti (se necessario)
};
```

### Mapping Predefiniti

| Simbolo OANDA | Simbolo Broker | Suffisso | Note |
|---------------|----------------|----------|------|
| `EURUSD` | `EURUSD` | `.m` | Conti micro lotti |
| `EURUSD` | `EURUSD` | `.c` | Conti cent |
| `EURUSD` | `EURUSD` | `.ecn` | Conti ECN |
| `XAUUSD` | `GOLD` | `.` | Gold con nome differente |
| `GBPUSD` | `GBPUSD` | `.m` | Con suffisso |

### Configurazione Personalizzata Mapping

Puoi aggiungere mapping personalizzati nell'EA:

```mql5
// Aggiungi mapping personalizzati nell'array
SymbolMapping customMappings[] = {
    {"EURUSD", "EURUSD", ".pro", 1.0},
    {"XAUUSD", "XAUUSD.m", "", 1.0},
    {"GBPJPY", "GBPJPY.c", "", 1.0}
};
```

### Funzioni di Gestione Simboli

```mql5
// Funzione principale per ottenere il simbolo corretto
string GetCorrectSymbol(string originalSymbol) {
    // 1. Cerca nella tabella mapping predefiniti
    // 2. Prova varianti con suffissi comuni
    // 3. Usa simbolo originale se non trovato
    return brokerSymbol;
}

// Verifica se il simbolo è disponibile per il trading
bool IsSymbolTradeable(string symbol) {
    return SymbolInfoInteger(symbol, SYMBOL_TRADE_MODE) == SYMBOL_TRADE_MODE_FULL;
}
```

## 📊 Esempi Pratici

### Esempio 1: Trader Principiante
```mql5
// Configurazione conservativa per principianti
VolumeManagementMode = FIXED
FixedVolume = 0.01
MinVolume = 0.01
MaxVolume = 0.05
MaxSpreadPips = 2.0
```

### Esempio 2: Trader Intermedio
```mql5
// Configurazione con rischio percentuale
VolumeManagementMode = PERCENTAGE
RiskPercentage = 1.5
MinVolume = 0.01
MaxVolume = 1.0
MaxSpreadPips = 3.0
```

### Esempio 3: Trader Avanzato
```mql5
// Configurazione con rischio valuta fisso
VolumeManagementMode = CURRENCY
RiskCurrency = 200.0
MinVolume = 0.01
MaxVolume = 5.0
MaxSpreadPips = 5.0
```

## 🛡️ Sicurezza e Limitazioni

### Limiti di Sicurezza
- **Volume Minimo:** 0.01 lotti
- **Volume Massimo:** 10.0 lotti (configurabile)
- **Rischio Massimo:** 10% del conto (modalità percentuale)
- **Spread Massimo:** Configurabile per ogni simbolo

### Validazioni Automatiche
```mql5
// Controlli eseguiti prima di ogni trade
bool ValidateTradeParameters() {
    // 1. Verifica volume consentito
    if (volume < MinVolume || volume > MaxVolume) return false;

    // 2. Verifica spread
    if (spread > MaxSpreadPips) return false;

    // 3. Verifica margine disponibile
    if (!CheckMarginEnough()) return false;

    // 4. Verifica orari di trading
    if (!IsTradeAllowedTime()) return false;

    return true;
}
```

## 🔧 Configurazione Avanzata

### Personalizzazione Suffissi
```mql5
// Array di suffissi da testare automaticamente
string suffixes[] = {".m", ".c", ".ecn", ".pro", "", ".micro", ".nano"};
```

### Configurazione Valore Pip
```mql5
// Calcolo automatico valore pip per simboli diversi
double GetPipValue(string symbol) {
    double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
    double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);

    // Conversione in valore per pip
    return tickValue * (10 / tickSize);
}
```

## 📋 Checklist Configurazione

### Prima dell'Uso
- [ ] Impostare `UserEmail` corretto
- [ ] Scegliere modalità volume appropriata
- [ ] Configurare limiti di volume (min/max)
- [ ] Verificare mapping simboli broker
- [ ] Testare con account demo

### Test di Funzionamento
- [ ] Verificare ricezione segnali
- [ ] Testare calcolo volume
- [ ] Verificare esecuzione trade
- [ ] Controllare SL/TP positioning
- [ ] Monitorare performance

## 🐛 Troubleshooting

### Problemi Comuni

**Volume 0.0 nei log**
- Soluzione: Verificare `VolumeManagementMode` e parametri rischio
- Controllare margine disponibile e limiti broker

**Simbolo non trovato**
- Soluzione: Aggiungere mapping personalizzato nell'EA
- Verificare simboli disponibili nel Market Watch

**Trade non eseguiti**
- Soluzione: Controllare `MaxSpreadPips` e orari di trading
- Verificare autorizzazioni trading nel terminale

### Log di Debug
```mql5
// Abilita log dettagliati
EnableDebugLogs = true

// Output tipico
[INFO] Signal received: EURUSD BUY @ 1.08567
[INFO] Volume calculation mode: PERCENTAGE
[INFO] Account balance: 10,000 EUR
[INFO] Risk percentage: 2.0% = 200 EUR
[INFO] Risk distance: 25 pips
[INFO] Calculated volume: 0.08 lots
[INFO] Symbol mapping: EURUSD -> EURUSD.m
[INFO] Trade executed successfully
```

---

**Versione Documento:** 1.0
**Ultimo Aggiornamento:** 2025-10-17
**Compatibilità:** MT5 Build 3000+