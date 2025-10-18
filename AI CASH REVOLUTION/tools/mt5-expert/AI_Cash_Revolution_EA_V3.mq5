//+------------------------------------------------------------------+
//|                                      AI Cash Revolution EA V3    |
//|                                           Advanced Volume Mgmt    |
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

//--- Input parameters
input group   "Connection Settings"
input string   SupabaseURL     = "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1";
input string   SupabaseKey     = ""; // Inserisci la tua API Key qui

input group   "User Settings"
input string   UserEmail       = ""; // Inserisci la tua email qui
input int      MagicNumber     = 888777;
input int      PollingInterval = 2;  // Polling ogni 2 secondi

input group   "Volume Management"
input VOLUME_MANAGEMENT_MODE VolumeManagementMode = PERCENTAGE;
input double   FixedVolume      = 0.01;        // Lotto fisso
input double   RiskPercentage   = 2.0;         // % rischio del conto
input double   RiskCurrency     = 100.0;       // Importo fisso valuta
input double   MinVolume        = 0.01;        // Volume minimo
input double   MaxVolume        = 10.0;        // Volume massimo

input group   "Risk Management"
input int      SlippagePoints   = 3;           // Slippage massimo
input bool     AutoExecuteTrades = true;        // Esecuzione automatica

input group   "Symbol Mapping"
input string   SymbolSuffix     = "";          // Suffisso simboli broker (.m, .c, .ecn)
input bool     EnableAutoMapping = true;       // Mapping automatico simboli

input group   "Debug"
input bool     EnableLogs       = true;
input bool     EnableDebugMode  = false;

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
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(SlippagePoints);
   trade.SetTypeFilling(ORDER_FILLING_IOC);

   // Inizializza mapping simboli
   InitializeSymbolMappings();

   if(EnableLogs)
   {
      Print("🚀 AI Cash Revolution EA V3 Inizializzato");
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
   if(EnableLogs) Print("👋 EA V3 Deinizializzato");
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
   ArrayResize(symbolMappings, 10);

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

   if(EnableDebugMode)
   {
      for(int i = 0; i < ArraySize(symbolMappings); i++)
      {
         if(symbolMappings[i].isActive)
         {
            Print("🗺️ Symbol mapping: ", symbolMappings[i].oandaSymbol, " -> ", symbolMappings[i].brokerSymbol);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Ottiene simbolo corretto del broker                               |
//+------------------------------------------------------------------+
string GetCorrectSymbol(string originalSymbol)
{
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
         if(IsSymbolTradeable(testSymbol))
         {
            if(EnableDebugMode) Print("✅ Auto-mapped: ", originalSymbol, " -> ", testSymbol);
            return testSymbol;
         }
      }
   }

   // 3. Usa simbolo originale come fallback
   if(EnableDebugMode) Print("⚠️ Using original symbol: ", originalSymbol);
   return originalSymbol;
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
   string url = SupabaseURL + "/mt5-trade-signals?email=" + UserEmail;
   string headers = "apikey: " + SupabaseKey + "\r\n";
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

   // Verifica margine sufficiente
   if(!CheckMarginEnough(brokerSymbol, volume))
   {
      if(EnableLogs) Print("❌ Margine insufficiente");
      return;
   }

   // Esegui trade se abilitato
   if(!AutoExecuteTrades)
   {
      if(EnableLogs) Print("ℹ️ Auto-execution disabilitata - trade analizzato solo");
      return;
   }

   bool result = false;

   if(action == "BUY")
   {
      result = trade.Buy(volume, brokerSymbol, 0, sl, tp, "AI Cash Revolution V3");
   }
   else if(action == "SELL")
   {
      result = trade.Sell(volume, brokerSymbol, 0, sl, tp, "AI Cash Revolution V3");
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
      }
   }
   else
   {
      uint errorCode = trade.ResultRetcode();
      if(EnableLogs) Print("❌ Errore esecuzione: ", errorCode, " - ", trade.ResultRetcodeDescription());
   }
}

//+------------------------------------------------------------------+
//| CheckSpread function removed - not needed                         |
//+------------------------------------------------------------------+

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