# 🚀 START HERE - Quick Setup

## ⚡ AZIONE IMMEDIATA RICHIESTA

### 1️⃣ Vai su Railway Dashboard
🔗 https://railway.app/dashboard

### 2️⃣ Seleziona progetto `ai-cash-evo-ml-api`

### 3️⃣ Aggiungi Environment Variables

**Settings** → **Variables** → **New Variable**

```
SUPABASE_URL = https://rvopmdflnecyrwrzhyfy.supabase.co

SUPABASE_SERVICE_ROLE_KEY = [La tua chiave da Supabase Dashboard → Settings → API → service_role]
```

⚠️ **USA CHIAVE service_role, NON anon!**

### 4️⃣ Aspetta Redeploy (1-2 min)

### 5️⃣ Verifica 3 Servizi Running
- ✅ web
- ✅ signal_generator
- ✅ weight_optimizer

---

## 📖 Documentazione Completa

- **[AZIONI_IMMEDIATE.md](AZIONI_IMMEDIATE.md)** - Tutti gli step dettagliati
- **[SETUP_RAILWAY.md](SETUP_RAILWAY.md)** - Setup completo Railway
- **[README_RAILWAY_SERVICES.md](README_RAILWAY_SERVICES.md)** - Architettura servizi

---

## ✅ Dopo Setup

Attendi **1 ora** e verifica primi segnali:

```sql
SELECT COUNT(*) FROM signal_performance
WHERE DATE(created_at) = CURRENT_DATE;
```

**Target**: 6-10 segnali

---

**Sistema Auto-Trading ML pronto per deploy! 🎯**
