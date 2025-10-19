# Trial Expiry Popup System

## Overview
Sistema automatico di popup per l'upgrade quando scade il periodo di prova di 7 giorni.

## Componenti Implementati

### 1. TrialExpiryPopup Component
**Location**: `frontend/src/components/TrialExpiryPopup.tsx`

**Features**:
- ✅ Popup modale con design professionale
- ✅ Mostra giorni rimanenti con progress bar
- ✅ Piani consigliati (Professional) in evidenza
- ✅ Limitazioni chiare per account scaduti
- ✅ Pulsanti diretti per upgrade/pagamento
- ✅ Indicators di trust (cancellazione gratuita, etc.)
- ✅ Responsive design per mobile/desktop

### 2. useTrialExpiry Hook
**Location**: `frontend/src/hooks/useTrialExpiry.ts`

**Features**:
- ✅ Controlla automaticamente status del trial
- ✅ Popup appare 3 giorni prima della scadenza
- ✅ Popup appare immediatamente se scaduto
- ✅ Suppression per 24 ore dopo chiusura
- ✅ Check ogni ora per aggiornamenti
- ✅ Integrato con auth state di Supabase

### 3. PaymentSetup Integration
**Location**: `frontend/src/pages/PaymentSetup.tsx`

**Features**:
- ✅ Accetta piano preselezionato dal popup
- ✅ Reindirizza direttamente a Stripe checkout
- ✅ Mantiene contesto di upgrade dal popup

## Logica di Visualizzazione

### Quando Appare il Popup:

```javascript
// Condizioni per mostrare popup:
1. subscription_status === 'trial' E days_left <= 3
2. subscription_status === 'expired'
3. subscription_expires_at < now()
4. NON se piano è già 'professional' o 'enterprise'
5. NON se popup è stato chiuso nelle ultime 24 ore
```

### Messaggi del Popup:

**3+ giorni rimanenti**:
```
🎯 La tua prova scade in X giorni
Non perdere l'accesso alle funzionalità premium!
```

**Scaduto**:
```
⚠️ Prova Gratuita Scaduta
Il tuo periodo di prova di 7 giorni è terminato
```

### Stati del Progress Bar:

```javascript
// Calcolo progress bar
progress = Math.max(0, 100 - (daysLeft / 7 * 100))

// Colori:
- daysLeft = 0: rosso (scaduto)
- daysLeft <= 3: arancione (critico)
- daysLeft > 3: giallo (attenzione)
```

## Flusso Utente

### 1. Trial in Scadenza (3 giorni):
1. Popup appare automaticamente
2. Utente vede giorni rimanenti
3. Può scegliere piano o "Forse più tardi"
4. Se chiude, non appare per 24 ore

### 2. Trial Scaduto:
1. Popup appare immediatamente al login
2. Mostra limitazioni attuali
3. Solo opzioni: "Scegli Piano" o "Vedi Tutti i Piani"
4. Non può essere chiuso definitivamente

### 3. Click su Upgrade:
1. Reindirizzamento a `/payment-setup`
2. Piano preselezionato dal popup
3. Checkout Stripe diretto
4. Success → reindirizzamento a `/payment-success`

## Piano Consigliato (Professional)

### Perché Professional:
- ✅ **Prezzo ottimale**: €39/mese
- ✅ **Segnali illimitati**: 999 segnali/giorno
- ✅ **EA completo**: Expert Advisor MT5
- ✅ **ML avanzato**: Analisi machine learning
- ✅ **Supporto 24/7**: Prioritario
- ✅ **Accesso beta**: Nuove funzionalità

### Posizionamento:
- **Card in evidenza** con bordo primario
- **Badge "PIÙ POPOLARE"**
- **Pulsante primario grande**
- **Vantaggi chiari e concisi**

## Test Cases

### Scenario 1: Nuovo Utente (7 giorni)
```
Input: subscription_status='trial', days_left=7
Expected: ❌ No popup
```

### Scenario 2: Trial in Scadenza (3 giorni)
```
Input: subscription_status='trial', days_left=3
Expected: ✅ Popup appare con "3 giorni rimanenti"
```

### Scenario 3: Trial Scaduto
```
Input: subscription_status='expired', days_left=0
Expected: ✅ Popup appare con "Prova scaduta"
```

### Scenario 4: Piano Già Attivo
```
Input: subscription_status='active', plan='professional'
Expected: ❌ No popup
```

### Scenario 5: Popup Chiuso Recentemente
```
Input: popup_chised=<24h fa, trial_scaduto
Expected: ❌ No popup (suppressed)
```

## Configurazione

### Timing:
- **Check interval**: Ogni ora
- **Pre-avviso**: 3 giorni prima
- **Suppression**: 24 ore dopo chiusura
- **Min check interval**: 5 minuti

### Database Required Fields:
```sql
profiles:
- subscription_status (trial/active/expired)
- subscription_expires_at (timestamp)
- subscription_plan (essenziale/professional/enterprise)
```

### Local Storage:
```javascript
// Chiave usata per suppression
'trial-popup-dismissed': '2025-01-19T10:30:00Z'
```

## Analytics Tracking

### Eventi da Tracciare:
1. **popup_shown** - Quando popup appare
2. **popup_dismissed** - Quando utente chiude
3. **upgrade_clicked** - Click su piano
4. **payment_started** - Inizio checkout Stripe
5. **payment_completed** - Pagamento completato

### Proprietà:
- `days_until_expiry`
- `selected_plan`
- `source` (trial_expiry_popup)
- `user_id`

## Performance Considerazioni

### Lazy Loading:
- ✅ Popup caricato solo quando necessario
- ✅ Piani fetchati on-demand
- ✅ Supabase queries ottimizzate

### UX Optimizations:
- ✅ No-blocking popup (overlay modal)
- ✅ Responsive design
- ✅ Loading states durante checkout
- ✅ Clear error handling

## Future Enhancements

### Short-term:
1. ** countdown timer realtime**
2. **special offers per scadenza imminente**
3. **social proof (ultimi upgrade)**
4. **comparazione piani dettagliata**

### Long-term:
1. **AI-powered plan recommendations**
2. **dynamic pricing basato su usage**
3. **referral discounts**
4. **multi-currency support**

## Deployment Notes

### Required:
- ✅ Supabase auth state listener
- ✅ Stripe checkout integration
- ✅ Toast notifications system
- ✅ React Router v6

### Optional:
- 🔄 Analytics integration
- 🔄 A/B testing framework
- 🔄 Feature flags
- 🔄 Error monitoring

---

**Status**: ✅ Implementato e pronto per testing
**Next Steps**: Test con utenti reali, monitor conversion rates
**Priority**: Alta (impatto diretto su revenue)