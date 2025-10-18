# 🔧 Supabase MCP Server Setup

Questa guida ti aiuta a configurare il server MCP di Supabase per permettere a Claude Code di interagire direttamente con il tuo database.

## Step 1: Crea Personal Access Token (PAT)

1. Vai su: https://supabase.com/dashboard/account/tokens
2. Clicca **"Generate new token"**
3. Nome: `Claude Code MCP`
4. Scopes: Seleziona tutti gli scopes necessari
5. **Copia il token** (lo vedrai solo una volta!)

## Step 2: Configura Claude Code MCP

Crea o modifica il file di configurazione MCP per Claude Code.

### Percorso file (Windows):
```
%APPDATA%\Claude\claude_desktop_config.json
```

oppure

```
C:\Users\USER\AppData\Roaming\Claude\claude_desktop_config.json
```

### Contenuto:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "YOUR_PERSONAL_ACCESS_TOKEN_HERE"
      ]
    }
  }
}
```

**IMPORTANTE**: Sostituisci `YOUR_PERSONAL_ACCESS_TOKEN_HERE` con il token che hai creato nello Step 1.

## Step 3: Verifica Configurazione

1. Riavvia Claude Code
2. Verifica che il server MCP sia attivo
3. Prova ad eseguire una query SQL

## Step 4: Test Connessione

Una volta configurato, puoi eseguire query SQL direttamente:

```sql
-- Test query
SELECT COUNT(*) FROM ml_historical_candles;
```

## Tools Disponibili

Una volta configurato MCP Supabase, avrai accesso a:

- ✅ **Run SQL queries** - Esegui query SQL arbitrarie
- ✅ **Design tables** - Crea e modifica tabelle
- ✅ **Fetch project config** - Ottieni configurazione progetto
- ✅ **Create database branches** - Gestisci branch del database
- ✅ **Generate TypeScript types** - Genera tipi da database

## Risoluzione Problemi

### NPX non trovato
```bash
npm install -g npm
```

### Token non valido
- Verifica che il token sia corretto
- Controlla che non sia scaduto
- Rigeneralo se necessario

### MCP server non si avvia
- Riavvia Claude Code
- Controlla il file di configurazione JSON (sintassi corretta)
- Verifica che Node.js sia installato

---

**Prossimi passi dopo la configurazione:**
1. ✅ MCP configurato
2. ⏭️ Esegui migrazione database
3. ⏭️ Enrich signals con pesi
4. ⏭️ Backtest
