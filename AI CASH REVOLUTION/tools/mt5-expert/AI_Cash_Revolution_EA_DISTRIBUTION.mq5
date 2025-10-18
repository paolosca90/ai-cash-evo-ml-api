//+------------------------------------------------------------------+
//|                                      AI Cash Revolution EA      |
//|                                           Production Version     |
//+------------------------------------------------------------------+
#property copyright "AI Cash Revolution 2025"
#property version   "3.00"
#property description "EA con gestione avanzata volume e mapping simboli"

#include <Trade\Trade.mqh>

//--- Enum modalità gestione volume
enum VOLUME_MANAGEMENT_MODE
{
    FIXED,          // Lotto fisso
    PERCENTAGE,     // Percentuale rischio
    CURRENCY        // Importo fisso valuta
};

//--- Input parameters (solo quelli che il cliente può modificare)
input group   "User Settings"
input string   UserEmail       = "";              // Inserisci la tua email qui
input int      MagicNumber     = 888777;
input int      PollingInterval = 2;               // Polling ogni 2 secondi

input group   "Volume Management"
input VOLUME_MANAGEMENT_MODE VolumeManagementMode = PERCENTAGE;
input double   FixedVolume      = 0.01;           // Lotto fisso
input double   RiskPercentage   = 2.0;            // % rischio del conto
input double   RiskCurrency     = 100.0;          // Importo fisso valuta
input double   MinVolume        = 0.01;           // Volume minimo
input double   MaxVolume        = 10.0;           // Volume massimo

input group   "Risk Management"
input int      SlippagePoints   = 3;              // Slippage massimo
input bool     AutoExecuteTrades = true;          // Esecuzione automatica

input group   "Symbol Mapping"
input string   SymbolSuffix     = "";             // Suffisso simboli broker (.m, .c, .ecn)
input bool     EnableAutoMapping = true;          // Mapping automatico simboli

input group   "Debug"
input bool     EnableLogs       = true;
input bool     EnableDebugMode  = false;

//--- Configurazioni fisse (non modificabili dal cliente)
string   SUPABASE_URL   = "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1";
string   SUPABASE_KEY   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDc4ODQsImV4cCI6MjA3NDEyMzg4NH0.snlFF1ChbYsA765gXE-cMGb11jHIaF2np_pNxIGLgW8";

//--- Global objects
CTrade trade;

//--- Global variables
datetime lastCheck = 0;

//--- Symbol mapping structure
struct SymbolMapping
{
    string oandaSymbol;     // Simbolo OANDA ricevuto
    string brokerSymbol;    // Simbolo broker effettivo
    string suffix;          // Suffisso del broker
    bool   isActive;        // Se è attivo il mapping
};

//--- Array mapping predefiniti
SymbolMapping symbolMappings[];

//+------------------------------------------------------------------+
//| Expert initialization                                            |
//+------------------------------------------------------------------+
int OnInit()
{
   // Verifica che l'email sia stata inserita
   if(UserEmail == "")
   {
      Alert("❌ ERRORE: Inserisci la tua email nel parametro 'UserEmail'");
      return(INIT_FAILED);
   }

   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(SlippagePoints);
   trade.SetTypeFilling(ORDER_FILLING_IOC);

   // Inizializza mapping simboli
   InitializeSymbolMappings();

   if(EnableLogs)
   {
      Print("🚀 AI Cash Revolution EA Inizializzato");
      Print("📧 Email: ", UserEmail);
      Print("🎯 Volume Mode: ", EnumToString(VolumeManagementMode));
      Print("⏱️ Polling: ogni ", PollingInterval, " secondi");

      if(VolumeManagementMode == FIXED)
         Print("💰 Volume fisso: ", FixedVolume, " lotti");
      else if(VolumeManagementMode == PERCENTAGE)
         Print("💰 Rischio %: ", RiskPercentage, "% del conto");
      else if(VolumeManagementMode == CURRENCY)
         Print("💰 Rischio valuta: ", RiskCurrency, " EUR");
   }

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization                                          |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(EnableLogs) Print("👋 EA Deinizializzato");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   // Polling ogni N secondi
   if(TimeCurrent() - lastCheck >= PollingInterval)
   {
      CheckForNewTrades();
      lastCheck = TimeCurrent();
   }
}

//+------------------------------------------------------------------+
//| Inizializza mapping simboli                                      |
//+------------------------------------------------------------------+
void InitializeSymbolMappings()
{
   ArrayResize(symbolMappings, 26);

   // Mapping EURUSD
   symbolMappings[0].oandaSymbol = "EURUSD";
   symbolMappings[0].brokerSymbol = "EURUSD" + SymbolSuffix;
   symbolMappings[0].suffix = SymbolSuffix;
   symbolMappings[0].isActive = true;

   // Mapping XAUUSD -> GOLD
   symbolMappings[1].oandaSymbol = "XAUUSD";
   symbolMappings[1].brokerSymbol = "GOLD" + SymbolSuffix;
   symbolMappings[1].suffix = SymbolSuffix;
   symbolMappings[1].isActive = true;

   // Mapping GBPUSD
   symbolMappings[2].oandaSymbol = "GBPUSD";
   symbolMappings[2].brokerSymbol = "GBPUSD" + SymbolSuffix;
   symbolMappings[2].suffix = SymbolSuffix;
   symbolMappings[2].isActive = true;

   // Mapping USDJPY
   symbolMappings[3].oandaSymbol = "USDJPY";
   symbolMappings[3].brokerSymbol = "USDJPY" + SymbolSuffix;
   symbolMappings[3].suffix = SymbolSuffix;
   symbolMappings[3].isActive = true;

   // --- CROSS PAIRS MAPPING ---
   // ✅ Tutti i cross pairs sono ora ATTIVATI per default
   // Verifica che il broker supporti questi simboli prima del trading

   // CADCHF
   symbolMappings[4].oandaSymbol = "CADCHF";
   symbolMappings[4].brokerSymbol = "CADCHF" + SymbolSuffix;
   symbolMappings[4].suffix = SymbolSuffix;
   symbolMappings[4].isActive = true;  // ✅ ATTIVATO

   // AUDCHF
   symbolMappings[5].oandaSymbol = "AUDCHF";
   symbolMappings[5].brokerSymbol = "AUDCHF" + SymbolSuffix;
   symbolMappings[5].suffix = SymbolSuffix;
   symbolMappings[5].isActive = true;  // ✅ ATTIVATO

   // NZDCHF
   symbolMappings[6].oandaSymbol = "NZDCHF";
   symbolMappings[6].brokerSymbol = "NZDCHF" + SymbolSuffix;
   symbolMappings[6].suffix = SymbolSuffix;
   symbolMappings[6].isActive = true;  // ✅ ATTIVATO

   // AUDCAD
   symbolMappings[7].oandaSymbol = "AUDCAD";
   symbolMappings[7].brokerSymbol = "AUDCAD" + SymbolSuffix;
   symbolMappings[7].suffix = SymbolSuffix;
   symbolMappings[7].isActive = true;  // ✅ ATTIVATO

   // NZDCAD
   symbolMappings[8].oandaSymbol = "NZDCAD";
   symbolMappings[8].brokerSymbol = "NZDCAD" + SymbolSuffix;
   symbolMappings[8].suffix = SymbolSuffix;
   symbolMappings[8].isActive = true;  // ✅ ATTIVATO

   // AUDNZD
   symbolMappings[9].oandaSymbol = "AUDNZD";
   symbolMappings[9].brokerSymbol = "AUDNZD" + SymbolSuffix;
   symbolMappings[9].suffix = SymbolSuffix;
   symbolMappings[9].isActive = true;  // ✅ ATTIVATO

   // EURGBP
   symbolMappings[10].oandaSymbol = "EURGBP";
   symbolMappings[10].brokerSymbol = "EURGBP" + SymbolSuffix;
   symbolMappings[10].suffix = SymbolSuffix;
   symbolMappings[10].isActive = true;  // ✅ ATTIVATO

   // NZDJPY
   symbolMappings[11].oandaSymbol = "NZDJPY";
   symbolMappings[11].brokerSymbol = "NZDJPY" + SymbolSuffix;
   symbolMappings[11].suffix = SymbolSuffix;
   symbolMappings[11].isActive = true;  // ✅ ATTIVATO

   // EURCHF
   symbolMappings[12].oandaSymbol = "EURCHF";
   symbolMappings[12].brokerSymbol = "EURCHF" + SymbolSuffix;
   symbolMappings[12].suffix = SymbolSuffix;
   symbolMappings[12].isActive = true;  // ✅ ATTIVATO

   // EURAUD
   symbolMappings[13].oandaSymbol = "EURAUD";
   symbolMappings[13].brokerSymbol = "EURAUD" + SymbolSuffix;
   symbolMappings[13].suffix = SymbolSuffix;
   symbolMappings[13].isActive = true;  // ✅ ATTIVATO

   // GBPJPY
   symbolMappings[14].oandaSymbol = "GBPJPY";
   symbolMappings[14].brokerSymbol = "GBPJPY" + SymbolSuffix;
   symbolMappings[14].suffix = SymbolSuffix;
   symbolMappings[14].isActive = true;  // ✅ ATTIVATO

   // GBPCHF
   symbolMappings[15].oandaSymbol = "GBPCHF";
   symbolMappings[15].brokerSymbol = "GBPCHF" + SymbolSuffix;
   symbolMappings[15].suffix = SymbolSuffix;
   symbolMappings[15].isActive = true;  // ✅ ATTIVATO

   // GBPCAD
   symbolMappings[16].oandaSymbol = "GBPCAD";
   symbolMappings[16].brokerSymbol = "GBPCAD" + SymbolSuffix;
   symbolMappings[16].suffix = SymbolSuffix;
   symbolMappings[16].isActive = true;  // ✅ ATTIVATO

   // GBPNZD
   symbolMappings[17].oandaSymbol = "GBPNZD";
   symbolMappings[17].brokerSymbol = "GBPNZD" + SymbolSuffix;
   symbolMappings[17].suffix = SymbolSuffix;
   symbolMappings[17].isActive = true;  // ✅ ATTIVATO

   // GBPAUD
   symbolMappings[18].oandaSymbol = "GBPAUD";
   symbolMappings[18].brokerSymbol = "GBPAUD" + SymbolSuffix;
   symbolMappings[18].suffix = SymbolSuffix;
   symbolMappings[18].isActive = true;  // ✅ ATTIVATO

   // CHFJPY
   symbolMappings[19].oandaSymbol = "CHFJPY";
   symbolMappings[19].brokerSymbol = "CHFJPY" + SymbolSuffix;
   symbolMappings[19].suffix = SymbolSuffix;
   symbolMappings[19].isActive = true;  // ✅ ATTIVATO

   // --- SIMBOLI FOREX MANCANTI DAL SISTEMA ---

   // USDCHF (Major pair mancante)
   symbolMappings[20].oandaSymbol = "USDCHF";
   symbolMappings[20].brokerSymbol = "USDCHF" + SymbolSuffix;
   symbolMappings[20].suffix = SymbolSuffix;
   symbolMappings[20].isActive = true;  // ✅ MAJOR PAIR

   // USDCAD (Minor pair)
   symbolMappings[21].oandaSymbol = "USDCAD";
   symbolMappings[21].brokerSymbol = "USDCAD" + SymbolSuffix;
   symbolMappings[21].suffix = SymbolSuffix;
   symbolMappings[21].isActive = true;  // ✅ MINOR PAIR

   // AUDUSD (Minor pair)
   symbolMappings[22].oandaSymbol = "AUDUSD";
   symbolMappings[22].brokerSymbol = "AUDUSD" + SymbolSuffix;
   symbolMappings[22].suffix = SymbolSuffix;
   symbolMappings[22].isActive = true;  // ✅ MINOR PAIR

   // NZDUSD (Minor pair)
   symbolMappings[23].oandaSymbol = "NZDUSD";
   symbolMappings[23].brokerSymbol = "NZDUSD" + SymbolSuffix;
   symbolMappings[23].suffix = SymbolSuffix;
   symbolMappings[23].isActive = true;  // ✅ MINOR PAIR

   // EURJPY (Minor pair)
   symbolMappings[24].oandaSymbol = "EURJPY";
   symbolMappings[24].brokerSymbol = "EURJPY" + SymbolSuffix;
   symbolMappings[24].suffix = SymbolSuffix;
   symbolMappings[24].isActive = true;  // ✅ MINOR PAIR

   // XAGUSD (Argento)
   symbolMappings[25].oandaSymbol = "XAGUSD";
   symbolMappings[25].brokerSymbol = "XAGUSD" + SymbolSuffix;
   symbolMappings[25].suffix = SymbolSuffix;
   symbolMappings[25].isActive = true;  // ✅ METAL

   if(EnableDebugMode)
   {
      int activeCount = 0;
      for(int i = 0; i < ArraySize(symbolMappings); i++)
      {
         if(symbolMappings[i].isActive)
         {
            Print("🗺️ Symbol mapping: ", symbolMappings[i].oandaSymbol, " -> ", symbolMappings[i].brokerSymbol);
            activeCount++;
         }
      }
      Print("✅ All symbols ENABLED by default (", activeCount, "/26 active)");
      Print("📊 Major pairs: 5 (EURUSD, XAUUSD, GBPUSD, USDJPY, USDCHF)");
      Print("🔀 Minor pairs: 6 (USDCAD, AUDUSD, NZDUSD, EURGBP, EURJPY, GBPJPY)");
      Print("🌐 Cross pairs: 13 (all active)");
      Print("💰 Metals: 2 (XAUUSD, XAGUSD)");
      Print("⚠️ Ensure broker supports all symbols for trading");
   }
}

//+------------------------------------------------------------------+
//| Controlla ore di mercato attive                                      |
//+------------------------------------------------------------------+
bool IsMarketOpen()
{
   datetime currentTime = TimeCurrent();
   MqlDateTime timeInfo;
   TimeToStruct(currentTime, timeInfo);

   int dayOfWeek = timeInfo.day_of_week;  // 0=Sunday, 1=Monday
   int hour = timeInfo.hour;  // UTC hour

   // Weekend (Sabato Domenica): mercato chiuso
   if(dayOfWeek == 0 || dayOfWeek == 6) return false;

   // Orari principali (UTC):
   // Sydney: 22:00-07:00 (DST)
   // Tokyo: 23:00-08:00 (DST)
   // London: 08:00-17:00 (DST)
   // NY: 13:00-22:00 (DST)

   // Almeno una sessione deve essere aperta
   bool sydneyOpen = (hour >= 22 || hour < 7);
   bool tokyoOpen = (hour >= 23 || hour < 8);
   bool londonOpen = (hour >= 8 && hour < 17);
   bool nyOpen = (hour >= 13 && hour < 22);

   return londonOpen || nyOpen; // Priorità London e NY
}

//+------------------------------------------------------------------+
//| Controlla se il simbolo è adatto per trading                           |
//+------------------------------------------------------------------+
bool IsSymbolSuitable(string symbol)
{
   // 1. Controlla se è major pair o metal
   bool isMajor = (StringFind(symbol, "EURUSD") >= 0 ||
                   StringFind(symbol, "GBPUSD") >= 0 ||
                   StringFind(symbol, "USDJPY") >= 0 ||
                   StringFind(symbol, "USDCHF") >= 0 ||
                   StringFind(symbol, "XAUUSD") >= 0 ||
                   StringFind(symbol, "XAGUSD") >= 0);

   // 2. Controlla se è minor pair
   bool isMinor = (StringFind(symbol, "USDCAD") >= 0 ||
                  StringFind(symbol, "AUDUSD") >= 0 ||
                  StringFind(symbol, "NZDUSD") >= 0 ||
                  StringFind(symbol, "EURGBP") >= 0 ||
                  StringFind(symbol, "EURJPY") >= 0 ||
                  StringFind(symbol, "GBPJPY") >= 0);

   // 3. Se è major o minor pair, ok
   if(isMajor || isMinor) return true;

   // 4. Se è cross pair, richiede check aggiuntivi
   bool isCrossPair = false;
   string crossPairs[] = {"CADCHF", "AUDCHF", "NZDCHF", "AUDCAD", "NZDCAD", "AUDNZD",
                         "EURCHF", "EURAUD", "GBPCHF", "GBPCAD",
                         "GBPNZD", "GBPAUD", "CHFJPY"};

   for(int i = 0; i < ArraySize(crossPairs); i++)
   {
      if(StringFind(symbol, crossPairs[i]) >= 0)
      {
         isCrossPair = true;
         break;
      }
   }

   // 5. Cross pairs sono pericolosi - solo se esplicitamente attivi e mercato aperto
   if(isCrossPair)
   {
      // Cerca se questo cross pair è attivo nel mapping
      for(int i = 0; i < ArraySize(symbolMappings); i++)
      {
         if(symbolMappings[i].isActive && symbolMappings[i].oandaSymbol == symbol)
         {
            // Cross pair attivo - consenti solo durante orari di picco
            return IsMarketOpen(); // Solo durante sessioni attive
         }
      }

      // Cross pair non attivo o non configurato - blocca
      if(EnableDebugMode) Print("🚫 Cross pair ", symbol, " not active or not configured");
      return false;
   }

   // 6. Altri simboli - bloccati per sicurezza
   if(EnableDebugMode) Print("🚫 Symbol ", symbol, " not supported for trading");
   return false;
}

//+------------------------------------------------------------------+
//| Ottiene simbolo corretto del broker                               |
//+------------------------------------------------------------------+
string GetCorrectSymbol(string originalSymbol)
{
   // 0. Safety check: controlla se il simbolo è adatto
   if(!IsSymbolSuitable(originalSymbol))
   {
      if(EnableDebugMode) Print("🚫 Symbol unsuitable for trading: ", originalSymbol);
      return ""; // Return empty string to signal rejection
   }

   // 1. Cerca nella tabella mapping
   for(int i = 0; i < ArraySize(symbolMappings); i++)
   {
      if(symbolMappings[i].isActive && symbolMappings[i].oandaSymbol == originalSymbol)
      {
         string mappedSymbol = symbolMappings[i].brokerSymbol;

         // Verifica che il simbolo sia disponibile
         if(IsSymbolTradeable(mappedSymbol))
         {
            if(EnableDebugMode) Print("✅ Symbol mapped: ", originalSymbol, " -> ", mappedSymbol);
            return mappedSymbol;
         }
         else if(EnableDebugMode)
         {
            Print("❌ Mapped symbol not tradeable: ", mappedSymbol);
         }
      }
   }

   // 2. Se non trovato o non tradeabile, prova varianti comuni
   if(EnableAutoMapping)
   {
      string commonSuffixes[] = {".m", ".c", ".ecn", ".pro", "", ".micro", ".nano"};

      for(int i = 0; i < ArraySize(commonSuffixes); i++)
      {
         string testSymbol = originalSymbol + commonSuffixes[i];
         if(IsSymbolTradeable(testSymbol) && IsSymbolSuitable(testSymbol))
         {
            if(EnableDebugMode) Print("✅ Auto-mapped: ", originalSymbol, " -> ", testSymbol);
            return testSymbol;
         }
      }
   }

   // 3. Usa simbolo originale come fallback solo se è adatto
   if(IsSymbolSuitable(originalSymbol))
   {
      if(EnableDebugMode) Print("⚠️ Using original symbol: ", originalSymbol);
      return originalSymbol;
   }

   // 4. Simbolo non valido
   if(EnableDebugMode) Print("❌ Symbol rejected: ", originalSymbol);
   return ""; // Return empty string to signal rejection
}

//+------------------------------------------------------------------+
//| Verifica se simbolo è tradeable                                 |
//+------------------------------------------------------------------+
bool IsSymbolTradeable(string symbol)
{
   return SymbolInfoInteger(symbol, SYMBOL_TRADE_MODE) == SYMBOL_TRADE_MODE_FULL ||
          SymbolInfoInteger(symbol, SYMBOL_TRADE_MODE) == SYMBOL_TRADE_MODE_CLOSEONLY;
}

//+------------------------------------------------------------------+
//| Calcola Take Profit con RR 1:1 per XAUUSD, ETHUSD, BTCUSD         |
//+------------------------------------------------------------------+
double CalculateTakeProfitRR1To1(string symbol, double entryPrice, double stopLoss, string action)
{
   // Applica RR 1:1 solo per XAUUSD, ETHUSD, BTCUSD come richiesto
   bool isRR1To1Symbol = (StringFind(symbol, "XAUUSD") >= 0 ||
                         StringFind(symbol, "ETHUSD") >= 0 ||
                         StringFind(symbol, "BTCUSD") >= 0);

   if(!isRR1To1Symbol)
   {
      return 0; // Non modificare TP per altri simboli
   }

   // Calcola distanza entry -> stop loss
   double riskDistance = MathAbs(entryPrice - stopLoss);

   if(riskDistance <= 0)
   {
      if(EnableLogs) Print("❌ Invalid risk distance for RR 1:1 calculation");
      return 0;
   }

   // Calcola take profit con RR 1:1
   double takeProfit;
   if(action == "BUY")
   {
      takeProfit = entryPrice + riskDistance;
   }
   else // SELL
   {
      takeProfit = entryPrice - riskDistance;
   }

   // Normalizza con i decimali corretti
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   takeProfit = NormalizeDouble(takeProfit, digits);

   if(EnableLogs)
   {
      Print("🎯 RR 1:1 Take Profit calcolato per ", symbol);
      Print("   Entry: ", entryPrice);
      Print("   Stop Loss: ", stopLoss);
      Print("   Risk Distance: ", riskDistance);
      Print("   Take Profit: ", takeProfit, " (RR 1:1)");
   }

   return takeProfit;
}

//+------------------------------------------------------------------+
//| Calcola volume in base alla modalità scelta                     |
//+------------------------------------------------------------------+
double CalculateVolume(string symbol, double entryPrice, double stopLoss, double takeProfit)
{
   double volume = FixedVolume; // Default

   // Calcola distanza rischio
   double riskDistance = MathAbs(entryPrice - stopLoss);
   if(riskDistance <= 0)
   {
      if(EnableLogs) Print("❌ Invalid risk distance for volume calculation");
      return MinVolume;
   }

   // Ottieni informazioni account
   double accountBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   double accountEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   double usableBalance = MathMin(accountBalance, accountEquity);

   if(usableBalance <= 0)
   {
      if(EnableLogs) Print("❌ Invalid account balance for volume calculation");
      return MinVolume;
   }

   // Calcola valore pip
   double pipValue = GetPipValue(symbol);
   double riskDistancePips = riskDistance / GetPipSize(symbol);

   if(VolumeManagementMode == FIXED)
   {
      volume = FixedVolume;
      if(EnableLogs) Print("💰 Fixed volume: ", volume, " lots");
   }
   else if(VolumeManagementMode == PERCENTAGE)
   {
      double riskAmount = (usableBalance * RiskPercentage) / 100.0;
      volume = riskAmount / (riskDistancePips * pipValue);

      if(EnableLogs)
      {
         Print("💰 Percentage calculation:");
         Print("   Account: ", usableBalance, " EUR");
         Print("   Risk %: ", RiskPercentage, "% = ", riskAmount, " EUR");
         Print("   Risk distance: ", riskDistancePips, " pips");
         Print("   Pip value: ", pipValue, " EUR/pip");
         Print("   Calculated volume: ", volume, " lots");
      }
   }
   else if(VolumeManagementMode == CURRENCY)
   {
      volume = RiskCurrency / (riskDistancePips * pipValue);

      if(EnableLogs)
      {
         Print("💰 Currency calculation:");
         Print("   Risk amount: ", RiskCurrency, " EUR");
         Print("   Risk distance: ", riskDistancePips, " pips");
         Print("   Pip value: ", pipValue, " EUR/pip");
         Print("   Calculated volume: ", volume, " lots");
      }
   }

   // Applica limiti
   volume = MathMax(MinVolume, MathMin(MaxVolume, volume));

   // Normalizza volume
   double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   volume = MathFloor(volume / lotStep) * lotStep;
   volume = MathMax(volume, MinVolume);

   if(EnableLogs) Print("📊 Final volume after limits: ", volume, " lots");

   return volume;
}

//+------------------------------------------------------------------+
//| Ottiene valore di un pip per il simbolo                          |
//+------------------------------------------------------------------+
double GetPipValue(string symbol)
{
   double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);

   if(tickSize <= 0) return 0.0001; // Default per forex

   // Calcola valore per pip
   double pipValue = tickValue * (0.0001 / tickSize);

   // Per simboli JPY e XAUUSD
   if(StringFind(symbol, "JPY") >= 0 || StringFind(symbol, "XAU") >= 0)
   {
      pipValue = tickValue * (0.01 / tickSize);
   }

   return pipValue;
}

//+------------------------------------------------------------------+
//| Ottieni dimensione pip per il simbolo                            |
//+------------------------------------------------------------------+
double GetPipSize(string symbol)
{
   if(StringFind(symbol, "JPY") >= 0 || StringFind(symbol, "XAU") >= 0)
      return 0.01;
   else
      return 0.0001;
}

//+------------------------------------------------------------------+
//| Controlla nuovi trade da eseguire                               |
//+------------------------------------------------------------------+
void CheckForNewTrades()
{
   string url = SUPABASE_URL + "/mt5-trade-signals?email=" + UserEmail;
   string headers = "apikey: " + SUPABASE_KEY + "\r\n";
   headers += "x-user-email: " + UserEmail + "\r\n";

   char data[];
   char result_data[];
   string result_headers;

   int res = WebRequest("GET", url, headers, 5000, data, result_data, result_headers);

   if(res == -1)
   {
      int error = GetLastError();
      if(EnableLogs) Print("❌ Errore connessione: ", error);
      return;
   }

   if(res != 200)
   {
      if(EnableLogs) Print("❌ HTTP Error: ", res);
      return;
   }

   string response = CharArrayToString(result_data);

   // Parse JSON per trovare signals
   int signalsPos = StringFind(response, "\"signals\":");
   if(signalsPos < 0)
   {
      return; // Nessun campo signals
   }

   int arrayStart = StringFind(response, "[", signalsPos);
   int arrayEnd = StringFind(response, "]", arrayStart);

   if(arrayStart < 0 || arrayEnd < 0) return;

   string signalsArray = StringSubstr(response, arrayStart + 1, arrayEnd - arrayStart - 1);

   // Se array vuoto, nessun segnale
   if(StringLen(signalsArray) < 10)
   {
      return;
   }

   // Processa ogni segnale
   int signalStart = 0;
   while(signalStart >= 0)
   {
      signalStart = StringFind(signalsArray, "{", signalStart);
      if(signalStart < 0) break;

      int signalEnd = StringFind(signalsArray, "}", signalStart);
      if(signalEnd < 0) break;

      string signalJson = StringSubstr(signalsArray, signalStart, signalEnd - signalStart + 1);

      ExecuteSignal(signalJson);

      signalStart = signalEnd + 1;
   }
}

//+------------------------------------------------------------------+
//| Esegue un singolo segnale                                       |
//+------------------------------------------------------------------+
void ExecuteSignal(string json)
{
   // Estrai campi dal JSON
   string id = ExtractValue(json, "id");
   string symbol = ExtractValue(json, "symbol");
   string action = ExtractValue(json, "action");
   if(action == "") action = ExtractValue(json, "signal");

   double entry = StringToDouble(ExtractValue(json, "entry"));
   double sl = StringToDouble(ExtractValue(json, "stop_loss"));
   if(sl == 0) sl = StringToDouble(ExtractValue(json, "stopLoss"));

   double tp = StringToDouble(ExtractValue(json, "take_profit"));
   if(tp == 0) tp = StringToDouble(ExtractValue(json, "takeProfit"));

   // Mapping simbolo
   string brokerSymbol = GetCorrectSymbol(symbol);

   if(EnableLogs)
   {
      Print("📊 Nuovo segnale:");
      Print("  ID: ", id);
      Print("  Symbol: ", symbol, " -> ", brokerSymbol);
      Print("  Action: ", action);
      Print("  Entry: ", entry);
      Print("  SL: ", sl);
      Print("  TP: ", tp);
   }

   // Validazione base
   if(brokerSymbol == "" || action == "" || entry == 0 || sl == 0 || tp == 0)
   {
      if(EnableLogs) Print("❌ Dati segnale incompleti");
      return;
   }

   // ✅ Rimuovo controllo spread - non più necessario

   // Calcola volume
   double volume = CalculateVolume(brokerSymbol, entry, sl, tp);
   if(volume <= 0)
   {
      if(EnableLogs) Print("❌ Errore calcolo volume");
      return;
   }

   // Normalizza prezzi
   int digits = (int)SymbolInfoInteger(brokerSymbol, SYMBOL_DIGITS);
   sl = NormalizeDouble(sl, digits);
   tp = NormalizeDouble(tp, digits);

   // USA PREZZO CORRENTE, non entry price fisso
   double currentPrice;
   if(action == "BUY")
      currentPrice = SymbolInfoDouble(brokerSymbol, SYMBOL_ASK);
   else
      currentPrice = SymbolInfoDouble(brokerSymbol, SYMBOL_BID);

   if(EnableLogs) Print("📈 Prezzo corrente: ", currentPrice);

   // ✅ Rimuovo controllo margine restrittivo - MT5 gestisce automaticamente
   // if(!CheckMarginEnough(brokerSymbol, volume))
   // {
   //    if(EnableLogs) Print("❌ Margine insufficiente");
   //    return;
   // }

   // Esegui trade se abilitato
   if(!AutoExecuteTrades)
   {
      if(EnableLogs) Print("ℹ️ Auto-execution disabilitata - trade analizzato solo");
      return;
   }

   bool result = false;

   if(action == "BUY")
   {
      result = trade.Buy(volume, brokerSymbol, 0, sl, tp, "AI Cash Revolution");
   }
   else if(action == "SELL")
   {
      result = trade.Sell(volume, brokerSymbol, 0, sl, tp, "AI Cash Revolution");
   }

   if(result)
   {
      if(EnableLogs)
      {
         Print("✅ Trade eseguito con successo!");
         Print("  Ticket: ", trade.ResultOrder());
         Print("  Volume: ", volume, " lotti");
         Print("  Symbol: ", brokerSymbol);
         Print("  Type: ", action);
         Print("  Entry: ", currentPrice);
         Print("  SL: ", sl);
         Print("  TP: ", tp);
      }
   }
   else
   {
      uint errorCode = trade.ResultRetcode();
      string errorDesc = trade.ResultRetcodeDescription();

      if(EnableLogs)
      {
         Print("❌ Errore esecuzione trade:");
         Print("  Error Code: ", errorCode);
         Print("  Description: ", errorDesc);
         Print("  Volume: ", volume, " lotti");
         Print("  Symbol: ", brokerSymbol);
         Print("  Entry: ", currentPrice);
         Print("  SL: ", sl);
         Print("  TP: ", tp);
      }
   }
}

//+------------------------------------------------------------------+
//| Verifica margine sufficiente                                    |
//+------------------------------------------------------------------+
bool CheckMarginEnough(string symbol, double volume)
{
   double marginRequired = 0;
   bool marginResult = OrderCalcMargin(ORDER_TYPE_BUY, symbol, volume, 0, marginRequired);
   double accountFreeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);

   if(!marginResult || marginRequired <= 0) return true; // Non posso verificare

   if(marginRequired > accountFreeMargin)
   {
      if(EnableLogs)
      {
         Print("❌ Margin insufficient:");
         Print("   Required: ", marginRequired);
         Print("   Available: ", accountFreeMargin);
      }
      return false;
   }

   return true;
}

//+------------------------------------------------------------------+
//| Estrae valore da JSON semplice                                  |
//+------------------------------------------------------------------+
string ExtractValue(string json, string key)
{
   string searchKey = "\"" + key + "\":";
   int pos = StringFind(json, searchKey);
   if(pos < 0) return "";

   int valueStart = pos + StringLen(searchKey);

   // Skip whitespace e quote
   while(valueStart < StringLen(json) &&
         (StringGetCharacter(json, valueStart) == ' ' ||
          StringGetCharacter(json, valueStart) == '"'))
      valueStart++;

   // Trova fine valore
   int valueEnd = valueStart;
   while(valueEnd < StringLen(json))
   {
      ushort ch = StringGetCharacter(json, valueEnd);
      if(ch == ',' || ch == '}' || ch == '"' || ch == ']')
         break;
      valueEnd++;
   }

   return StringSubstr(json, valueStart, valueEnd - valueStart);
}
//+------------------------------------------------------------------+