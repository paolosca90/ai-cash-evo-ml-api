//+------------------------------------------------------------------+
//|                                      AI Cash Revolution EA V2    |
//|                                           Versione Semplificata  |
//+------------------------------------------------------------------+
#property copyright "AI Cash Revolution 2025"
#property version   "2.00"
#property description "EA per esecuzione immediata trade da frontend"

#include <Trade\Trade.mqh>

//--- Input parameters
input string   SupabaseURL     = "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1";
input string   SupabaseKey     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDc4ODQsImV4cCI6MjA3NDEyMzg4NH0.snlFF1ChbYsA765gXE-cMGb11jHIaF2np_pNxIGLgW8";
input string   UserEmail       = "paoloscardia@gmail.com";
input int      MagicNumber     = 99999;
input int      PollingInterval = 2;  // Polling ogni 2 secondi
input bool     EnableLogs      = true;

//--- Global objects
CTrade trade;

//--- Global variables
datetime lastCheck = 0;

//+------------------------------------------------------------------+
//| Expert initialization                                            |
//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(10);
   trade.SetTypeFilling(ORDER_FILLING_FOK);

   if(EnableLogs) Print("🚀 AI Cash Revolution EA V2 Inizializzato");
   if(EnableLogs) Print("📧 Email: ", UserEmail);
   if(EnableLogs) Print("⏱️ Polling: ogni ", PollingInterval, " secondi");

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

   double volume = StringToDouble(ExtractValue(json, "volume"));

   if(EnableLogs)
   {
      Print("📊 Nuovo segnale:");
      Print("  ID: ", id);
      Print("  Symbol: ", symbol);
      Print("  Action: ", action);
      Print("  Volume: ", volume);
      Print("  Entry: ", entry);
      Print("  SL: ", sl);
      Print("  TP: ", tp);
   }

   // Validazione
   if(symbol == "" || action == "" || entry == 0 || volume == 0)
   {
      if(EnableLogs) Print("❌ Dati segnale incompleti");
      return;
   }

   // Normalizza prezzi
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   sl = NormalizeDouble(sl, digits);
   tp = NormalizeDouble(tp, digits);

   // USA PREZZO CORRENTE, non entry price fisso
   double currentPrice;
   if(action == "BUY")
      currentPrice = SymbolInfoDouble(symbol, SYMBOL_ASK);
   else
      currentPrice = SymbolInfoDouble(symbol, SYMBOL_BID);

   if(EnableLogs) Print("📈 Prezzo corrente: ", currentPrice);

   // Esegui trade al prezzo corrente
   bool result = false;

   if(action == "BUY")
   {
      result = trade.Buy(volume, symbol, 0, sl, tp, "AI Trade");
   }
   else if(action == "SELL")
   {
      result = trade.Sell(volume, symbol, 0, sl, tp, "AI Trade");
   }

   if(result)
   {
      if(EnableLogs) Print("✅ Trade eseguito con successo!");
      if(EnableLogs) Print("  Ticket: ", trade.ResultOrder());
   }
   else
   {
      uint errorCode = trade.ResultRetcode();
      if(EnableLogs) Print("❌ Errore esecuzione: ", errorCode, " - ", trade.ResultRetcodeDescription());
   }
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
