# AI Cash Revolution - Expert Advisor per MetaTrader 5

## Prima Installazione: MetaTrader 5

### 1. Download e Installazione MT5

1. **Scarica MetaTrader 5**:
   - Vai su [https://www.metatrader5.com/it/download](https://www.metatrader5.com/it/download)
   - Clicca su "Download gratis"
   - Esegui il file scaricato e segui l'installazione

2. **Prima configurazione**:
   - Avvia MetaTrader 5
   - Alla prima apertura ti chiederà di aprire un conto
   - Seleziona il tuo broker o "Demo Account" per testare

### 2. Login con il tuo Conto MT5

1. **Se hai già un conto MT5**:
   - File → Login to Trade Account
   - Inserisci:
     - Login: Il tuo numero di conto
     - Password: La tua password MT5
     - Server: Il server del tuo broker

2. **Se non hai un conto**:
   - File → Open an Account
   - Seleziona il tuo broker
   - Segui la procedura di registrazione

### 3. Preparazione MetaTrader 5

1. Vai su **Strumenti → Opzioni → Expert Advisors**
2. Abilita:
   - ✅ "Consenti trading automatico"
   - ✅ "Consenti import di DLL"
   - ✅ "Consenti WebRequest per URL elencati"

### 4. Configurazione URL

1. Vai su **Strumenti → Opzioni → Expert Advisors**
2. Nella sezione "WebRequest", aggiungi questo URL:
   ```
   https://rvopmdflnecyrwrzhyfy.supabase.co
   ```

### 5. Installazione EA

**Opzione A - File Compilato (Consigliato)**:
1. Copia il file `AI_Cash_Revolution_EA.ex5` nella cartella:
   ```
   C:\Users\[TuoNome]\AppData\Roaming\MetaQuotes\Terminal\[ID_Terminal]\MQL5\Experts\
   ```

**Opzione B - Compilazione Manuale**:
1. Copia il file `AI_Cash_Revolution_EA.mq5` nella cartella:
   ```
   C:\Users\[TuoNome]\AppData\Roaming\MetaQuotes\Terminal\[ID_Terminal]\MQL5\Experts\
   ```

2. Apri MetaEditor (F4 in MT5) e compila l'EA:
   - Apri il file `AI_Cash_Revolution_EA.mq5`
   - Premi F7 per compilare
   - Assicurati che non ci siano errori

**Trova la cartella facilmente**:
- In MT5: File → Apri cartella dati
- Naviga in MQL5 → Experts
- Copia il file EA qui

### 6. Configurazione EA

1. **Riavvia MT5** dopo aver copiato l'EA
2. **Trascina l'EA** `AI_Cash_Revolution_EA` sul grafico del simbolo desiderato (es: EURUSD)
3. **Configura i parametri**:

   **Parametri OBBLIGATORI:**
   - `UserEmail`: **INSERISCI LA TUA EMAIL** (quella usata per registrarti su Cash Revolution)
   - `ServerURL`: Lascia il valore predefinito
   - `ClientID`: Imposta un ID univoco (es: "TuoNome_001")

   **Parametri di Trading:**
   - `PollInterval`: 5000 ms (controlla segnali ogni 5 secondi)
   - `MaxRiskPercent`: 2.0 (massimo 2% del conto per trade)
   - `MagicNumber`: 888777 (per identificare i trade dell'EA)
   - `EnableTrading`: true (per trading automatico)
   - `EnableNotifications`: true (per notifiche push)

4. **Abilita "Consenti trading automatico"** ✅
5. Clicca **OK** per attivare l'EA

⚠️ **IMPORTANTE**: L'EA può funzionare solo su un conto MT5 per volta. Se lo attivi su un nuovo conto, quello precedente verrà automaticamente disattivato.

## Come Funziona

### Flusso di Trading

1. **Frontend Web**: L'utente inserisce l'importo da rischiare e clicca "Esegui Trade"
2. **AI Analysis**: Il sistema genera un segnale AI con entry, stop loss e take profit
3. **Signal Storage**: Il segnale viene salvato nel server
4. **MT5 Polling**: L'EA controlla ogni 5 secondi se ci sono nuovi segnali
5. **Auto Execution**: L'EA esegue automaticamente il trade in MT5
6. **Feedback**: Lo stato del trade viene inviato al server

### Gestione Rischio

- **Position Sizing**: Calcolato automaticamente basato sull'importo da rischiare
- **Max Risk**: Limitato al 2% del conto (configurabile)
- **Stop Loss**: Sempre impostato automaticamente
- **Take Profit**: Impostato con risk/reward favorevole

### Monitoraggio

L'EA mostra nel log:
- ✅ Connessioni riuscite al server
- 📡 Polling dei segnali
- 🎯 Segnali ricevuti
- 🚀 Trade eseguiti
- ❌ Eventuali errori

## Parametri Avanzati

### Configurazione Parametri
- `UserEmail`: Email del tuo account Cash Revolution (OBBLIGATORIO)
- `MaxRiskPercent`: Rischio massimo per singolo trade
- `MagicNumber`: Numero magico per identificare trade EA
- `HeartbeatInterval`: Intervallo heartbeat (30 secondi)
- `SignalCheckInterval`: Frequenza controllo segnali (10 secondi)

**Funzionalità Automatiche:**
- Trading automatico: SEMPRE ATTIVO
- ML Tracking: SEMPRE ATTIVO (rilevamento ogni secondo)
- ClientID: Generato automaticamente dall'account MT5

## Troubleshooting

### Errori Comuni

**"No internet connection"**
- Controlla la connessione internet
- Verifica che MT5 sia online

**"URL not allowed"**
- Aggiungi l'URL nelle opzioni WebRequest di MT5
- Riavvia MT5 dopo aver aggiunto l'URL

**"Trading not allowed"**
- Abilita "Consenti trading automatico" nelle opzioni
- Controlla che il conto consenta trading automatico

**"Invalid lot size"**
- Verifica che il conto abbia fondi sufficienti
- Controlla i limiti di lotto del broker

### Log di Debug

L'EA scrive log dettagliati nella scheda "Esperti" di MT5:
- 🤖 Inizializzazione
- 📡 Polling segnali
- 🎯 Segnali ricevuti
- 💰 Calcoli position sizing
- ✅ Trade eseguiti
- ❌ Errori

## Sicurezza

- **Risk Management**: Rischio limitato per trade
- **Magic Number**: Trade identificabili univocamente
- **Stop Loss**: Sempre impostato automaticamente
- **Position Limits**: Controllo dimensioni posizioni
- **Connection Timeout**: Timeout su connessioni server

## Supporto

Per assistenza:
1. Controlla i log nella scheda "Esperti" di MT5
2. Verifica la configurazione URL e parametri
3. Assicurati che il trading automatico sia abilitato

## Versioni

- **v1.00**: Versione iniziale con polling e auto-trading
- Compatibile con MT5 build 3000+