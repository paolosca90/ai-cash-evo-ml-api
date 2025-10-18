//+------------------------------------------------------------------+
//|                                     AI_Cash_Revolution_EA.mq5    |
//|                        Copyright 2024, AI Cash Revolution Team   |
//|                     https://ai-cash-revolution.lovableproject.com |
//+------------------------------------------------------------------+
#property copyright "AI Cash Revolution Team"
#property link      "https://ai-cash-revolution.lovableproject.com"
#property version   "2.00"
#property description "Expert Advisor completamente automatico con Machine Learning in tempo reale"

//--- Input parameters
input string    UserEmail = "";                    // Email dell'utente (OBBLIGATORIA)
input double    MaxRiskPercent = 2.0;              // Massimo rischio per trade (%)
input int       MagicNumber = 888777;              // Magic number per identificare trade
input int       HeartbeatInterval = 30;            // Intervallo heartbeat (secondi)
input int       SignalCheckInterval = 10;          // Intervallo controllo segnali (secondi)

//--- Server URLs
string ServerURL = "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/mt5-trade-signals";
string WebhookURL = "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/realtime-trade-webhook";
string OptimizationURL = "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/trading-auto-optimizer";

//--- Global variables
datetime LastSignalCheck = 0;
datetime LastHeartbeat = 0;
datetime LastMLUpdate = 0;
string LastProcessedSignalID = "";
bool ProcessingSignal = false;
const bool EnableMLTracking = true;                // ML sempre attivo
string ClientID = "";                               // ID generato automaticamente dall'account

//--- Trade tracking structure
struct TradeInfo
{
    ulong ticket;
    string symbol;
    string signal_id;
    ENUM_ORDER_TYPE order_type;
    double open_price;
    double volume;
    double sl;
    double tp;
    datetime open_time;
    double last_profit;
    double last_equity;
    int magic_number;
    string comment;
    bool ml_tracked;
    datetime last_update;
};

TradeInfo ActiveTrades[];
int ActiveTradesCount = 0;
const int MAX_TRADES = 100;

//--- Market data for ML
struct MarketContext
{
    double atr;
    double rsi;
    double macd_main;
    double macd_signal;
    double bb_upper;
    double bb_lower;
    double bb_middle;
    double volume_ratio;
    string session;
    int hour_of_day;
    int day_of_week;
    bool is_news_time;
};

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("🚀 AI Cash Revolution EA v2.0 - Inizializzazione con ML");
    
    // Validazione parametri
    if(StringLen(UserEmail) == 0)
    {
        Print("❌ ERRORE: UserEmail è obbligatoria!");
        Alert("ERRORE: Inserire UserEmail nelle impostazioni dell'EA!");
        return INIT_PARAMETERS_INCORRECT;
    }
    
    // Verifica connessione e permessi
    if(!TerminalInfoInteger(TERMINAL_CONNECTED))
    {
        Print("❌ Nessuna connessione internet");
        return INIT_FAILED;
    }
    
    if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
    {
        Print("❌ Trading non autorizzato nel terminale");
        return INIT_FAILED;
    }
    
    if(!MQLInfoInteger(MQL_TRADE_ALLOWED))
    {
        Print("❌ Trading automatico non abilitato");
        return INIT_FAILED;
    }
    
    // Inizializza array trade
    ArrayResize(ActiveTrades, MAX_TRADES);
    ActiveTradesCount = 0;
    
    // Genera ClientID unico basato sull'account
    ClientID = "MT5_" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
    
    // Carica trade esistenti
    LoadExistingTrades();
    
    // Registra account MT5
    RegisterMT5Account();
    
    // Avvia timer
    EventSetTimer(1); // Timer ogni 1 secondo per ML in tempo reale
    
    Print("✅ EA inizializzato correttamente");
    Print("📧 Email: ", UserEmail);
    Print("🆔 Client ID: ", ClientID);
    Print("📊 Trade attivi caricati: ", ActiveTradesCount);
    Print("🤖 ML Tracking: SEMPRE ATTIVO");
    
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                               |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    Print("🔄 Deinizializzazione EA - Motivo: ", reason);
    
    // Invia ultimo heartbeat
    SendHeartbeat(false);
    
    // Ferma timer
    EventKillTimer();
    
    Print("👋 EA deinizializzato");
}

//+------------------------------------------------------------------+
//| Expert tick function - Monitoraggio continuo                   |
//+------------------------------------------------------------------+
void OnTick()
{
    // ML tracking ogni secondo per massima precisione
    datetime current_time = TimeCurrent();
    if(current_time - LastMLUpdate >= 1) // Ogni secondo
    {
        UpdateActiveTradesML();
        LastMLUpdate = current_time;
    }
}

//+------------------------------------------------------------------+
//| Timer function - Gestione periodica                           |
//+------------------------------------------------------------------+
void OnTimer()
{
    datetime current_time = TimeCurrent();
    
    // Heartbeat periodico
    if(current_time - LastHeartbeat >= HeartbeatInterval)
    {
        SendHeartbeat(true);
        LastHeartbeat = current_time;
    }
    
    // Controllo nuovi segnali
    if(current_time - LastSignalCheck >= SignalCheckInterval)
    {
        CheckForNewSignals();
        LastSignalCheck = current_time;
    }
    
    // Sincronizzazione trade
    SyncTradesWithMT5();
}

//+------------------------------------------------------------------+
//| Trade transaction event - Rilevamento eventi                   |
//+------------------------------------------------------------------+
void OnTrade()
{
    Print("🔄 Evento trade rilevato");
    
    // Aggiorna lista trade attivi
    UpdateTradesList();
    
    // Invia eventi al sistema ML (sempre attivo)
    SendTradeEventToML();
}

//+------------------------------------------------------------------+
//| Registra account MT5 nel sistema                              |
//+------------------------------------------------------------------+
void RegisterMT5Account()
{
    string json_data = "{";
    json_data += "\"user_email\":\"" + UserEmail + "\",";
    json_data += "\"client_id\":\"" + ClientID + "\",";
    json_data += "\"account_number\":\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
    json_data += "\"account_name\":\"" + AccountInfoString(ACCOUNT_NAME) + "\",";
    json_data += "\"server_name\":\"" + AccountInfoString(ACCOUNT_SERVER) + "\",";
    json_data += "\"ea_version\":\"2.0\",";
    json_data += "\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
    json_data += "\"currency\":\"" + AccountInfoString(ACCOUNT_CURRENCY) + "\"";
    json_data += "}";
    
    SendWebhookData("account_registration", json_data);
    Print("📝 Account registrato nel sistema");
}

//+------------------------------------------------------------------+
//| Invia heartbeat al sistema                                     |
//+------------------------------------------------------------------+
void SendHeartbeat(bool is_active)
{
    string json_data = "{";
    json_data += "\"event_type\":\"heartbeat\",";
    json_data += "\"client_id\":\"" + ClientID + "\",";
    json_data += "\"user_email\":\"" + UserEmail + "\",";
    json_data += "\"is_active\":" + (is_active ? "true" : "false") + ",";
    json_data += "\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
    json_data += "\"equity\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + ",";
    json_data += "\"margin_level\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_LEVEL), 2) + ",";
    json_data += "\"active_trades\":" + IntegerToString(ActiveTradesCount) + ",";
    json_data += "\"timestamp\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\"";
    json_data += "}";
    
    SendWebhookData("heartbeat", json_data);
}

//+------------------------------------------------------------------+
//| Controlla nuovi segnali dal server                            |
//+------------------------------------------------------------------+
void CheckForNewSignals()
{
    if(ProcessingSignal) return;
    ProcessingSignal = true;
    
    string url = ServerURL + "?client_id=" + ClientID + "&email=" + UserEmail;
    
    char post_data[];
    char result[];
    string result_headers;
    
    int res = WebRequest("GET", url, "Content-Type: application/json\r\n", 5000, post_data, result, result_headers);
    
    ProcessingSignal = false;
    
    if(res == 200)
    {
        string response = CharArrayToString(result);
        if(StringLen(response) > 10) // Response non vuota
        {
            ProcessSignalsResponse(response);
        }
    }
    else if(res == -1)
    {
        Print("⚠️ WebRequest non autorizzata. Aggiungere URL in Opzioni -> Consulenti Esperti");
    }
    else
    {
        Print("⚠️ Errore richiesta segnali: ", res);
    }
}

//+------------------------------------------------------------------+
//| Processa risposta segnali                                     |
//+------------------------------------------------------------------+
void ProcessSignalsResponse(string response)
{
    Print("📨 Processando segnali ricevuti");
    
    // Parse JSON semplificato
    int signals_start = StringFind(response, "\"signals\":[", 0);
    if(signals_start == -1) return;
    
    signals_start += 11; // Salta "signals":["
    int signals_end = StringFind(response, "]", signals_start);
    if(signals_end == -1) return;
    
    string signals_json = StringSubstr(response, signals_start, signals_end - signals_start);
    
    // Processa ogni segnale
    string signals[];
    int count = StringSplit(signals_json, '}', signals);
    
    for(int i = 0; i < count - 1; i++)
    {
        string signal = signals[i];
        if(i > 0) signal = StringSubstr(signal, 1); // Rimuovi virgola
        signal += "}";
        
        ProcessSingleSignal(signal);
    }
}

//+------------------------------------------------------------------+
//| Processa singolo segnale                                      |
//+------------------------------------------------------------------+
void ProcessSingleSignal(string signal_json)
{
    // Estrai campi principali
    string signal_id = ExtractJsonString(signal_json, "id");
    string symbol = ExtractJsonString(signal_json, "symbol");
    string action = ExtractJsonString(signal_json, "signal");
    double entry = ExtractJsonDouble(signal_json, "entry");
    double sl = ExtractJsonDouble(signal_json, "stop_loss");
    double tp = ExtractJsonDouble(signal_json, "take_profit");
    double confidence = ExtractJsonDouble(signal_json, "confidence");
    
    if(StringLen(signal_id) == 0 || signal_id == LastProcessedSignalID)
    {
        return; // Segnale già processato o non valido
    }
    
    Print("🎯 Nuovo segnale: ", signal_id, " | ", symbol, " | ", action);
    
    // Esegui segnale automaticamente (sempre attivo)
    ExecuteSignal(signal_id, symbol, action, entry, sl, tp, confidence);
    
    LastProcessedSignalID = signal_id;
}

//+------------------------------------------------------------------+
//| Esegue segnale di trading                                     |
//+------------------------------------------------------------------+
void ExecuteSignal(string signal_id, string symbol, string action, double entry, double sl, double tp, double confidence)
{
    // Determina tipo ordine
    ENUM_ORDER_TYPE order_type;
    if(StringCompare(action, "BUY", false) == 0)
        order_type = ORDER_TYPE_BUY;
    else if(StringCompare(action, "SELL", false) == 0)
        order_type = ORDER_TYPE_SELL;
    else return;
    
    // Calcola volume
    double volume = CalculateVolume(symbol, entry, sl);
    if(volume <= 0) return;
    
    // Prepara richiesta
    MqlTradeRequest request;
    MqlTradeResult result;
    ZeroMemory(request);
    ZeroMemory(result);
    
    request.action = TRADE_ACTION_DEAL;
    request.symbol = symbol;
    request.volume = volume;
    request.type = order_type;
    request.price = (order_type == ORDER_TYPE_BUY) ? SymbolInfoDouble(symbol, SYMBOL_ASK) : SymbolInfoDouble(symbol, SYMBOL_BID);
    request.sl = sl;
    request.tp = tp;
    request.magic = MagicNumber;
    request.comment = "AI_" + signal_id;
    request.deviation = 10;
    
    // Esegui ordine
    bool success = OrderSend(request, result);
    
    if(success && result.retcode == TRADE_RETCODE_DONE)
    {
        Print("✅ Ordine eseguito: #", result.order);
        
        // Aggiungi al tracking
        AddTradeToTracking(result.order, signal_id, symbol, order_type, request.price, volume, sl, tp);
        
        // Notifica esecuzione
        NotifyTradeExecution(signal_id, result.order, "EXECUTED", request.price, volume, confidence);
    }
    else
    {
        Print("❌ Errore esecuzione: ", result.retcode, " - ", result.comment);
        NotifyTradeExecution(signal_id, 0, "FAILED", 0, 0, confidence);
    }
}

//+------------------------------------------------------------------+
//| Calcola volume basato su rischio                              |
//+------------------------------------------------------------------+
double CalculateVolume(string symbol, double entry, double sl)
{
    if(sl <= 0) return 0.01;
    
    double balance = AccountInfoDouble(ACCOUNT_BALANCE);
    double risk_amount = balance * MaxRiskPercent / 100.0;
    double sl_distance = MathAbs(entry - sl);
    
    if(sl_distance <= 0) return 0.01;
    
    double tick_value = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
    double tick_size = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
    double volume = risk_amount / (sl_distance / tick_size * tick_value);
    
    // Normalizza volume
    double min_vol = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
    double max_vol = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
    double step_vol = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
    
    volume = MathMax(volume, min_vol);
    volume = MathMin(volume, max_vol);
    volume = NormalizeDouble(volume / step_vol, 0) * step_vol;
    
    return volume;
}

//+------------------------------------------------------------------+
//| Aggiunge trade al tracking                                    |
//+------------------------------------------------------------------+
void AddTradeToTracking(ulong ticket, string signal_id, string symbol, ENUM_ORDER_TYPE order_type, 
                       double price, double volume, double sl, double tp)
{
    if(ActiveTradesCount >= MAX_TRADES) return;
    
    ActiveTrades[ActiveTradesCount].ticket = ticket;
    ActiveTrades[ActiveTradesCount].signal_id = signal_id;
    ActiveTrades[ActiveTradesCount].symbol = symbol;
    ActiveTrades[ActiveTradesCount].order_type = order_type;
    ActiveTrades[ActiveTradesCount].open_price = price;
    ActiveTrades[ActiveTradesCount].volume = volume;
    ActiveTrades[ActiveTradesCount].sl = sl;
    ActiveTrades[ActiveTradesCount].tp = tp;
    ActiveTrades[ActiveTradesCount].open_time = TimeCurrent();
    ActiveTrades[ActiveTradesCount].last_profit = 0;
    ActiveTrades[ActiveTradesCount].last_equity = AccountInfoDouble(ACCOUNT_EQUITY);
    ActiveTrades[ActiveTradesCount].magic_number = MagicNumber;
    ActiveTrades[ActiveTradesCount].comment = "AI_" + signal_id;
    ActiveTrades[ActiveTradesCount].ml_tracked = true;
    ActiveTrades[ActiveTradesCount].last_update = TimeCurrent();
    
    ActiveTradesCount++;
    
    Print("➕ Trade aggiunto al tracking: #", ticket);
}

//+------------------------------------------------------------------+
//| Carica trade esistenti                                        |
//+------------------------------------------------------------------+
void LoadExistingTrades()
{
    int total = PositionsTotal();
    
    for(int i = 0; i < total; i++)
    {
        if(PositionGetTicket(i) > 0)
        {
            ulong ticket = PositionGetInteger(POSITION_TICKET);
            int magic = (int)PositionGetInteger(POSITION_MAGIC);
            
            if(magic == MagicNumber)
            {
                string comment = PositionGetString(POSITION_COMMENT);
                string signal_id = "";
                
                if(StringFind(comment, "AI_", 0) == 0)
                    signal_id = StringSubstr(comment, 3);
                
                AddTradeToTracking(
                    ticket,
                    signal_id,
                    PositionGetString(POSITION_SYMBOL),
                    (ENUM_ORDER_TYPE)PositionGetInteger(POSITION_TYPE),
                    PositionGetDouble(POSITION_PRICE_OPEN),
                    PositionGetDouble(POSITION_VOLUME),
                    PositionGetDouble(POSITION_SL),
                    PositionGetDouble(POSITION_TP)
                );
            }
        }
    }
    
    Print("📋 Caricati ", ActiveTradesCount, " trade esistenti");
}

//+------------------------------------------------------------------+
//| Aggiorna trade attivi per ML                                  |
//+------------------------------------------------------------------+
void UpdateActiveTradesML()
{
    if(ActiveTradesCount == 0) return;
    
    static datetime last_ml_update = 0;
    datetime current_time = TimeCurrent();
    
    // Aggiorna ogni 5 secondi
    if(current_time - last_ml_update < 5) return;
    last_ml_update = current_time;
    
    for(int i = 0; i < ActiveTradesCount; i++)
    {
        if(!ActiveTrades[i].ml_tracked) continue;
        
        // Verifica se il trade esiste ancora
        if(PositionSelectByTicket(ActiveTrades[i].ticket))
        {
            double current_profit = PositionGetDouble(POSITION_PROFIT);
            double current_equity = AccountInfoDouble(ACCOUNT_EQUITY);
            
            // Invia aggiornamento se profit cambiato significativamente
            if(MathAbs(current_profit - ActiveTrades[i].last_profit) > 0.10)
            {
                SendTradeUpdateML(i, current_profit);
                ActiveTrades[i].last_profit = current_profit;
                ActiveTrades[i].last_equity = current_equity;
                ActiveTrades[i].last_update = current_time;
            }
        }
        else
        {
            // Trade chiuso, invia evento finale
            SendTradeCloseML(i);
            RemoveTradeFromTracking(i);
            i--; // Aggiusta indice
        }
    }
}

//+------------------------------------------------------------------+
//| Invia aggiornamento trade per ML                              |
//+------------------------------------------------------------------+
void SendTradeUpdateML(int trade_index, double current_profit)
{
    MarketContext context = GetMarketContext(ActiveTrades[trade_index].symbol);
    
    string json_data = "{";
    json_data += "\"event_type\":\"trade_update\",";
    json_data += "\"client_id\":\"" + ClientID + "\",";
    json_data += "\"user_email\":\"" + UserEmail + "\",";
    json_data += "\"ticket\":" + IntegerToString((int)ActiveTrades[trade_index].ticket) + ",";
    json_data += "\"signal_id\":\"" + ActiveTrades[trade_index].signal_id + "\",";
    json_data += "\"symbol\":\"" + ActiveTrades[trade_index].symbol + "\",";
    json_data += "\"current_profit\":" + DoubleToString(current_profit, 2) + ",";
    json_data += "\"current_pips\":" + DoubleToString(CalculatePips(ActiveTrades[trade_index]), 1) + ",";
    json_data += "\"duration_minutes\":" + IntegerToString((int)((TimeCurrent() - ActiveTrades[trade_index].open_time) / 60)) + ",";
    json_data += "\"market_context\":" + MarketContextToJson(context) + ",";
    json_data += "\"timestamp\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\"";
    json_data += "}";
    
    SendWebhookData("trade_update", json_data);
}

//+------------------------------------------------------------------+
//| Invia chiusura trade per ML                                   |
//+------------------------------------------------------------------+
void SendTradeCloseML(int trade_index)
{
    string json_data = "{";
    json_data += "\"event_type\":\"trade_closed\",";
    json_data += "\"client_id\":\"" + ClientID + "\",";
    json_data += "\"user_email\":\"" + UserEmail + "\",";
    json_data += "\"ticket\":" + IntegerToString((int)ActiveTrades[trade_index].ticket) + ",";
    json_data += "\"signal_id\":\"" + ActiveTrades[trade_index].signal_id + "\",";
    json_data += "\"symbol\":\"" + ActiveTrades[trade_index].symbol + "\",";
    json_data += "\"final_profit\":" + DoubleToString(ActiveTrades[trade_index].last_profit, 2) + ",";
    json_data += "\"final_pips\":" + DoubleToString(CalculatePips(ActiveTrades[trade_index]), 1) + ",";
    json_data += "\"duration_minutes\":" + IntegerToString((int)((TimeCurrent() - ActiveTrades[trade_index].open_time) / 60)) + ",";
    json_data += "\"timestamp\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\"";
    json_data += "}";
    
    SendWebhookData("trade_closed", json_data);
    Print("📊 Trade chiuso inviato per ML: #", ActiveTrades[trade_index].ticket);
}

//+------------------------------------------------------------------+
//| Ottiene contesto di mercato per ML                           |
//+------------------------------------------------------------------+
MarketContext GetMarketContext(string symbol)
{
    MarketContext context;
    
    // Indicatori tecnici
    double atr_values[], rsi_values[];
    int atr_handle = iATR(symbol, PERIOD_M15, 14);
    int rsi_handle = iRSI(symbol, PERIOD_M15, 14, PRICE_CLOSE);
    
    if(CopyBuffer(atr_handle, 0, 0, 1, atr_values) > 0)
        context.atr = atr_values[0];
    else
        context.atr = 0.0;
        
    if(CopyBuffer(rsi_handle, 0, 0, 1, rsi_values) > 0)
        context.rsi = rsi_values[0];
    else
        context.rsi = 50.0;
    
    double macd_main[], macd_signal[];
    CopyBuffer(iMACD(symbol, PERIOD_M15, 12, 26, 9, PRICE_CLOSE), 0, 0, 1, macd_main);
    CopyBuffer(iMACD(symbol, PERIOD_M15, 12, 26, 9, PRICE_CLOSE), 1, 0, 1, macd_signal);
    context.macd_main = macd_main[0];
    context.macd_signal = macd_signal[0];
    
    double bb_upper[], bb_lower[], bb_middle[];
    CopyBuffer(iBands(symbol, PERIOD_M15, 20, 0, 2, PRICE_CLOSE), 0, 0, 1, bb_middle);
    CopyBuffer(iBands(symbol, PERIOD_M15, 20, 0, 2, PRICE_CLOSE), 1, 0, 1, bb_upper);
    CopyBuffer(iBands(symbol, PERIOD_M15, 20, 0, 2, PRICE_CLOSE), 2, 0, 1, bb_lower);
    context.bb_upper = bb_upper[0];
    context.bb_lower = bb_lower[0];
    context.bb_middle = bb_middle[0];
    
    // Contesto temporale
    MqlDateTime dt;
    TimeToStruct(TimeCurrent(), dt);
    context.hour_of_day = dt.hour;
    context.day_of_week = dt.day_of_week;
    
    // Sessione di mercato
    if((dt.hour >= 22 && dt.hour <= 23) || (dt.hour >= 0 && dt.hour <= 6))
        context.session = "Sydney";
    else if(dt.hour >= 7 && dt.hour <= 15)
        context.session = "London";
    else if(dt.hour >= 16 && dt.hour <= 21)
        context.session = "NewYork";
    else
        context.session = "Overlap";
    
    // Volume e volatilità
    long volume[];
    CopyTickVolume(symbol, PERIOD_M15, 0, 20, volume);
    context.volume_ratio = (volume[0] > 0) ? (double)volume[0] / (double)volume[10] : 1.0;
    
    context.is_news_time = false; // Da implementare con calendario economico
    
    return context;
}

//+------------------------------------------------------------------+
//| Converte contesto mercato in JSON                             |
//+------------------------------------------------------------------+
string MarketContextToJson(MarketContext &context)
{
    string json = "{";
    json += "\"atr\":" + DoubleToString(context.atr, 5) + ",";
    json += "\"rsi\":" + DoubleToString(context.rsi, 2) + ",";
    json += "\"macd_main\":" + DoubleToString(context.macd_main, 5) + ",";
    json += "\"macd_signal\":" + DoubleToString(context.macd_signal, 5) + ",";
    json += "\"bb_upper\":" + DoubleToString(context.bb_upper, 5) + ",";
    json += "\"bb_lower\":" + DoubleToString(context.bb_lower, 5) + ",";
    json += "\"bb_middle\":" + DoubleToString(context.bb_middle, 5) + ",";
    json += "\"volume_ratio\":" + DoubleToString(context.volume_ratio, 2) + ",";
    json += "\"session\":\"" + context.session + "\",";
    json += "\"hour_of_day\":" + IntegerToString(context.hour_of_day) + ",";
    json += "\"day_of_week\":" + IntegerToString(context.day_of_week) + ",";
    json += "\"is_news_time\":" + (context.is_news_time ? "true" : "false");
    json += "}";
    
    return json;
}

//+------------------------------------------------------------------+
//| Calcola pips per trade                                        |
//+------------------------------------------------------------------+
double CalculatePips(TradeInfo &trade)
{
    if(!PositionSelectByTicket(trade.ticket)) return 0;
    
    double current_price = PositionGetDouble(POSITION_PRICE_CURRENT);
    double pip_size = SymbolInfoDouble(trade.symbol, SYMBOL_POINT);
    
    // Aggiusta per coppie JPY
    if(StringFind(trade.symbol, "JPY", 0) != -1)
        pip_size *= 10;
    else
        pip_size *= 10000;
    
    double pips = 0;
    if(trade.order_type == ORDER_TYPE_BUY)
        pips = (current_price - trade.open_price) / pip_size;
    else
        pips = (trade.open_price - current_price) / pip_size;
    
    return pips;
}

//+------------------------------------------------------------------+
//| Invia dati webhook                                            |
//+------------------------------------------------------------------+
//+------------------------------------------------------------------+
//| Invia dati webhook                                            |
//+------------------------------------------------------------------+
void SendWebhookData(string event_type, string json_data)
{
    char post_data[];
    StringToCharArray(json_data, post_data, 0, WHOLE_ARRAY, CP_UTF8);
    ArrayResize(post_data, ArraySize(post_data) - 1); // Rimuovi null terminator
    
    char result[];
    string result_headers;
    string headers = "Content-Type: application/json\r\n";
    headers += "User-Agent: MT5-EA/2.0\r\n";
    
    int res = WebRequest("POST", WebhookURL, headers, 5000, post_data, result, result_headers);
    
    if(res == 200)
    {
        Print("✅ Webhook ", event_type, " inviato con successo");
    }
    else if(res == -1)
    {
        Print("⚠️ WebRequest non autorizzata per webhook. Verificare URL in Opzioni MT5");
    }
    else
    {
        Print("⚠️ Errore webhook ", event_type, ": ", res);
        if(ArraySize(result) > 0)
        {
            string response = CharArrayToString(result);
            Print("   Risposta: ", response);
        }
    }
}

//+------------------------------------------------------------------+
//| Notifica esecuzione trade                                     |
//+------------------------------------------------------------------+
void NotifyTradeExecution(string signal_id, ulong ticket, string status, double price, double volume, double confidence)
{
    string json_data = "{";
    json_data += "\"event_type\":\"trade_execution\",";
    json_data += "\"client_id\":\"" + ClientID + "\",";
    json_data += "\"user_email\":\"" + UserEmail + "\",";
    json_data += "\"signal_id\":\"" + signal_id + "\",";
    json_data += "\"ticket\":" + IntegerToString((int)ticket) + ",";
    json_data += "\"status\":\"" + status + "\",";
    json_data += "\"execution_price\":" + DoubleToString(price, 5) + ",";
    json_data += "\"volume\":" + DoubleToString(volume, 2) + ",";
    json_data += "\"confidence\":" + DoubleToString(confidence, 2) + ",";
    json_data += "\"timestamp\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\"";
    json_data += "}";
    
    SendWebhookData("trade_execution", json_data);
}

//+------------------------------------------------------------------+
//| Invia evento trade per ML                                     |
//+------------------------------------------------------------------+
void SendTradeEventToML()
{
    string json_data = "{";
    json_data += "\"event_type\":\"trade_event\",";
    json_data += "\"client_id\":\"" + ClientID + "\",";
    json_data += "\"user_email\":\"" + UserEmail + "\",";
    json_data += "\"timestamp\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\"";
    json_data += "}";
    
    SendWebhookData("trade_event", json_data);
}

//+------------------------------------------------------------------+
//| Aggiorna lista trade                                          |
//+------------------------------------------------------------------+
void UpdateTradesList()
{
    // Rimuovi trade chiusi dalla lista
    for(int i = ActiveTradesCount - 1; i >= 0; i--)
    {
        if(!PositionSelectByTicket(ActiveTrades[i].ticket))
        {
            RemoveTradeFromTracking(i);
        }
    }
}

//+------------------------------------------------------------------+
//| Rimuove trade dal tracking                                    |
//+------------------------------------------------------------------+
void RemoveTradeFromTracking(int index)
{
    if(index < 0 || index >= ActiveTradesCount) return;
    
    Print("➖ Rimuovo trade dal tracking: #", ActiveTrades[index].ticket);
    
    // Sposta elementi
    for(int i = index; i < ActiveTradesCount - 1; i++)
    {
        ActiveTrades[i] = ActiveTrades[i + 1];
    }
    
    ActiveTradesCount--;
}

//+------------------------------------------------------------------+
//| Sincronizza trade con MT5                                     |
//+------------------------------------------------------------------+
void SyncTradesWithMT5()
{
    static datetime last_sync = 0;
    if(TimeCurrent() - last_sync < 60) return; // Sync ogni minuto
    last_sync = TimeCurrent();
    
    Print("🔄 Sincronizzazione trade con MT5");
    
    // Verifica trade nella lista che non esistono più in MT5
    UpdateTradesList();
    
    // Verifica trade in MT5 che non sono nella lista
    int total = PositionsTotal();
    for(int i = 0; i < total; i++)
    {
        if(PositionGetTicket(i) > 0)
        {
            ulong ticket = PositionGetInteger(POSITION_TICKET);
            int magic = (int)PositionGetInteger(POSITION_MAGIC);
            
            if(magic == MagicNumber)
            {
                // Verifica se già in lista
                bool found = false;
                for(int j = 0; j < ActiveTradesCount; j++)
                {
                    if(ActiveTrades[j].ticket == ticket)
                    {
                        found = true;
                        break;
                    }
                }
                
                // Aggiungi se non trovato
                if(!found)
                {
                    string comment = PositionGetString(POSITION_COMMENT);
                    string signal_id = "";
                    
                    if(StringFind(comment, "AI_", 0) == 0)
                        signal_id = StringSubstr(comment, 3);
                    
                    AddTradeToTracking(
                        ticket,
                        signal_id,
                        PositionGetString(POSITION_SYMBOL),
                        (ENUM_ORDER_TYPE)PositionGetInteger(POSITION_TYPE),
                        PositionGetDouble(POSITION_PRICE_OPEN),
                        PositionGetDouble(POSITION_VOLUME),
                        PositionGetDouble(POSITION_SL),
                        PositionGetDouble(POSITION_TP)
                    );
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Estrae stringa da JSON                                        |
//+------------------------------------------------------------------+
string ExtractJsonString(string json, string key)
{
    string search = "\"" + key + "\":\"";
    int start = StringFind(json, search, 0);
    if(start == -1) return "";
    
    start += StringLen(search);
    int end = StringFind(json, "\"", start);
    if(end == -1) return "";
    
    return StringSubstr(json, start, end - start);
}

//+------------------------------------------------------------------+
//| Estrae double da JSON                                         |
//+------------------------------------------------------------------+
double ExtractJsonDouble(string json, string key)
{
    string search = "\"" + key + "\":";
    int start = StringFind(json, search, 0);
    if(start == -1) return 0;
    
    start += StringLen(search);
    
    // Salta spazi
    while(start < StringLen(json) && StringGetCharacter(json, start) == ' ')
        start++;
    
    int end = start;
    while(end < StringLen(json))
    {
        ushort char_code = StringGetCharacter(json, end);
        if(char_code == ',' || char_code == '}' || char_code == ' ')
            break;
        end++;
    }
    
    if(end <= start) return 0;
    
    string value = StringSubstr(json, start, end - start);
    return StringToDouble(value);
}

//+------------------------------------------------------------------+