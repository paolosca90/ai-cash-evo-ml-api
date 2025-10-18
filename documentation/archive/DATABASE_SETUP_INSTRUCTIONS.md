# 🗄️ Setup Database - Istruzioni Semplici

## ⚡ Metodo Più Veloce (2 minuti)

### Step 1: Apri SQL Editor
Vai su: https://supabase.com/dashboard/project/rvopmdflnecyrwrzhyfy/sql

### Step 2: New Query
Click sul pulsante **"New Query"** in alto a destra

### Step 3: Copia SQL
Apri il file `MANUAL_DB_SETUP.sql` (è nella cartella principale del progetto)
Copia **tutto** il contenuto (Ctrl+A, Ctrl+C)

### Step 4: Incolla ed Esegui
1. Incolla nel SQL Editor di Supabase (Ctrl+V)
2. Click sul pulsante **"Run"** (o premi Ctrl+Enter)

### Step 5: Verifica
Dovresti vedere il messaggio di successo e 3 nuove tabelle:
- ✅ `collective_signals`
- ✅ `ml_weight_optimization`
- ✅ `ml_training_log`

Puoi verificarle andando su: https://supabase.com/dashboard/project/rvopmdflnecyrwrzhyfy/editor

---

## 🐍 Metodo Alternativo (Python Script)

Se preferisci automatizzare:

### 1. Installa psycopg2
```bash
pip install psycopg2-binary
```

### 2. Ottieni Password Database
1. Vai su: https://supabase.com/dashboard/project/rvopmdflnecyrwrzhyfy/settings/database
2. Click su "Reset database password" se non la ricordi
3. Copia la password

### 3. Setta Password
**Windows:**
```cmd
set SUPABASE_DB_PASSWORD=tua_password_qui
```

**Linux/Mac:**
```bash
export SUPABASE_DB_PASSWORD=tua_password_qui
```

### 4. Esegui Script
```bash
python setup_database.py
```

---

## ✅ Verifica Setup Completato

Dopo aver eseguito il setup, verifica che sia andato a buon fine:

### Query di Test (SQL Editor):
```sql
-- Conta tabelle create
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('collective_signals', 'ml_weight_optimization', 'ml_training_log');

-- Dovrebbe restituire 3 righe
```

### Verifica Pesi Default:
```sql
SELECT COUNT(*) FROM ml_weight_optimization;
-- Dovrebbe restituire 15 (pesi default per vari contesti)
```

### Verifica Funzione:
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'update_signal_tick';

-- Dovrebbe restituire: update_signal_tick
```

---

## 🐛 Troubleshooting

### Errore: "relation already exists"
✅ **Non è un problema!** Significa che alcune tabelle esistono già.
Il SQL usa `IF NOT EXISTS` quindi è safe rieseguirlo.

### Errore: "permission denied"
❌ Assicurati di usare il **SQL Editor di Supabase** (non CLI locale)
Il SQL Editor ha i permessi corretti.

### Non vedo le tabelle
1. Refresh la pagina del Table Editor
2. Controlla che sei nel progetto giusto (rvopmdflnecyrwrzhyfy)
3. Controlla che non ci siano errori nel SQL Editor

---

## 📞 Hai Problemi?

Se il setup non funziona:

1. **Screenshot errore**: Fai screenshot dell'errore nel SQL Editor
2. **Controlla log**: Guarda eventuali messaggi di errore in rosso
3. **Verifica project**: Assicurati di essere su project `rvopmdflnecyrwrzhyfy`

Il setup dovrebbe richiedere solo **1-2 minuti** ⚡
