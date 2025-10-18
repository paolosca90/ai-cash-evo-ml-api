# Librerie e Dipendenze per il Rilevamento dei Trade

## Indice
1. [Dipendenze Frontend (React/TypeScript)](#dipendenze-frontend-reacttypescript)
2. [Dipendenze MQL5 (Expert Advisor)](#dipendenze-mql5-expert-advisor)
3. [Dipendenze Supabase (Edge Functions)](#dipendenze-supabase-edge-functions)
4. [Dipendenze di Sviluppo e Build](#dipendenze-di-sviluppo-e-build)
5. [Dipendenze Database PostgreSQL](#dipendenze-database-postgresql)
6. [Ruolo di Ogni Libreria nel Sistema](#ruolo-di-ogni-libreria-nel-sistema)

---

## Dipendenze Frontend (React/TypeScript)

### Core Framework
- **React 18.3.1**: Framework principale per l'interfaccia utente
- **TypeScript 5.8.3**: Tipizzazione statica per JavaScript
- **Vite 5.4.19**: Build tool e development server

### Supabase Integration
- **@supabase/supabase-js 2.57.4**: Client ufficiale Supabase per database e auth
- **Database Types**: Tipi TypeScript generati automaticamente dal database schema

### UI Framework e Componenti
- **@radix-ui/react-* (v1.x-2.x)**: Componenti UI accessibili e personalizzabili
  - Dialog, Alert Dialog, Accordion, Select, etc.
- **Tailwind CSS 3.4.17**: Framework CSS per styling
- **Lucide React 0.462.0**: Icone vettoriali
- **Shadcn/ui**: Componenti UI pre-costruiti basati su Radix UI

### Form Handling e Validazione
- **React Hook Form 7.61.1**: Gestione form con performance ottimizzate
- **@hookform/resolvers 3.10.0**: Resolver per validazione schemi
- **Zod 3.25.76**: Validazione schemi TypeScript-first

### State Management e Data Fetching
- **@tanstack/react-query 5.83.0**: Data fetching, caching e synchronization
- **React Router DOM 6.30.1**: Routing per applicazione SPA

### Web3 e Blockchain (integrato per pagamenti)
- **Ethers 6.15.0**: Libreria Ethereum per interazione blockchain
- **Viem 2.37.8**: Interface TypeScript per Ethereum
- **Wagmi 2.17.5**: React Hooks per Ethereum
- **@wagmi/core 2.21.2**: Core library per Wagmi
- **@wagmi/connectors 4.3.10**: Wallet connectors

### Utilità e Tools
- **Date-fns 3.6.0**: Manipolazione date
- **QRCode 1.5.4**: Generazione codici QR
- **Class Variance Authority 0.7.1**: Utility per varianti CSS
- **Cmdk 1.1.1**: Command palette component
- **Recharts 2.15.4**: Libreria per chart e grafici

---

## Dipendenze MQL5 (Expert Advisor)

### Librerie Standard MQL5
- **Standard MQL5 Libraries**: Incluse nativamente in MetaTrader 5
  - `Trade.mqh`: Gestione operazioni di trading
  - `String.mqh`: Manipolazione stringhe
  - `Arrays.mqh`: Operazioni su array
  - `Time.mqh`: Funzioni temporali

### Funzionalità Native MQL5
- **WebRequest**: Per chiamate HTTP API ai webhook
- **OrderSend**: Per esecuzione ordini trading
- **PositionGetInteger/Double**: Per informazioni posizioni
- **SymbolInfoDouble**: Per dati di mercato
- **AccountInfoInteger/Double**: Per informazioni account

### Funzionalità Custom Implementate
- **Trade Tracking System**: Sistema personalizzato per monitoraggio trade
- **JSON Parser**: Parser JSON semplificato (senza librerie esterne)
- **Error Handling**: Sistema di gestione errori custom
- **Risk Management**: Calcolo position sizing e risk management

---

## Dipendenze Supabase (Edge Functions)

### Runtime Deno/TypeScript
- **Deno Standard Library (deno.land/std@0.168.0)**:
  - `http/server.ts`: Server HTTP per edge functions
  - `xhr@0.1.0`: Per richieste HTTP esterne

### Supabase Client
- **@supabase/supabase-js@2**: Client Supabase per edge functions
- **Service Role Key**: Accesso completo al database

### CORS e Headers
- **CORS Headers**: Configurazione per cross-origin requests
- **Authentication Headers**: Headers custom per email validation

### Database Extensions PostgreSQL
- **pgcrypto**: Per UUID generation e encryption
- **Row Level Security (RLS)**: Per sicurezza dati

---

## Dipendenze di Sviluppo e Build

### Code Quality e Linting
- **ESLint 9.32.0**: Linting code quality
- **TypeScript ESLint 8.38.0**: Plugin TypeScript per ESLint
- **ESLint React Hooks 5.2.0**: Plugin per React Hooks
- **ESLint React Refresh 0.4.20**: Plugin per HMR

### Build Tools
- **Vite Plugin React SWC 3.11.0**: Compilazione React con SWC
- **Autoprefixer 10.4.21**: Prefissi CSS automatici
- **PostCSS 8.5.6**: Processore CSS
- **Tailwind CSS Typography 0.5.16**: Plugin tipografia

### Development Tools
- **@types/node 22.16.5**: Tipi Node.js
- **@types/react 18.3.23**: Tipi React
- **@types/react-dom 18.3.7**: Tipi React DOM
- **Bun 1.x**: Package manager e runtime JavaScript

---

## Dipendenze Database PostgreSQL

### Estensioni PostgreSQL
- **pgcrypto**: Funzioni crittografiche (UUID, hashing)
- **Row Level Security (RLS)**: Sicurezza a livello di riga

### Schema Design
- **mt5_signals**: Tabella principale per segnali trading
- **trading_analytics**: Tabella per analisi e learning
- **user_api_keys**: Tabella per chiavi API utente
- **Indexes**: Indici ottimizzati per performance query

### Funzioni Database
- **validate_email_api_key()**: Funzione custom per validazione email
- **register_mt5_account()**: Funzione per registrazione conti MT5
- **Trigger Functions**: Trigger per aggiornamento analytics

---

## Ruolo di Ogni Libreria nel Sistema

### Frontend (React/TypeScript)
1. **React + TypeScript**: Base applicazione con type safety
2. **Supabase Client**: Connessione al database e autenticazione
3. **TanStack Query**: Gestione stato server-side e caching
4. **React Hook Form + Zod**: Form validation e handling
5. **Radix UI + Tailwind**: UI components accessibili e styling
6. **React Router**: Navigazione applicazione

### Expert Advisor (MQL5)
1. **WebRequest**: Comunicazione con webhook Supabase
2. **Trade Library**: Esecuzione ordini e gestione posizioni
3. **Position Functions**: Monitoraggio stato trade
4. **Symbol Functions**: Dati di mercato in tempo reale
5. **Account Functions**: Informazioni account e risk management

### Edge Functions (Supabase)
1. **Deno HTTP Server**: Gestione richieste webhook
2. **Supabase Admin Client**: Accesso database con privilegi elevati
3. **CORS Headers**: Abilitazione chiamate cross-origin
4. **JSON Processing**: Parsing e serializzazione dati trading

### Database (PostgreSQL)
1. **mt5_signals table**: Storage persistente segnali trading
2. **Indexes**: Performance ottimizzate per query frequenti
3. **RLS**: Sicurezza dati a livello di riga
4. **pgcrypto**: Generazione ID sicuri e funzioni crypto

### Sistema Integrato
1. **Real-time Communication**: Webhook per comunicazione EA → Server
2. **Data Persistence**: PostgreSQL per storage dati trading
3. **Type Safety**: TypeScript end-to-end da frontend a database
4. **Authentication**: Email-based authentication system
5. **Error Handling**: Robusto error handling a tutti i livelli

---

## Note Tecniche

### Security Considerations
- Tutte le comunicazioni usano HTTPS
- RLS abilitato su tutte le tabelle
- Service role keys solo per edge functions
- Email validation per accesso segnali

### Performance Optimizations
- Indexes ottimizzati per query temporali
- Caching con TanStack Query
- Lazy loading componenti UI
- Efficient JSON parsing in MQL5

### Scalability
- Edge functions auto-scaling con Supabase
- Database PostgreSQL con connection pooling
- Stateless design per EA MQL5
- Component-based architecture frontend

---

Questo documento fornisce una panoramica completa delle librerie e dipendenze utilizzate nel sistema di rilevamento trade, spiegando il ruolo specifico di ciascuna componente nell'architettura complessiva.