// Analisi completa dei simboli nel sistema e confronto con EA

console.log("🔍 Analisi Simboli nel Sistema vs EA\n");

// Simboli trovati nel sistema dashboard/backend
const systemSymbols = {
    // Da auto-oanda-trader: ALL_SYMBOLS
    majorPairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF'],
    minorPairs: ['AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'],
    metals: ['XAUUSD', 'XAGUSD'],

    // Da altri file (test, dashboard, etc.)
    crypto: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'SOLUSDT', 'BTCUSD', 'ETHUSD'],
    stocks: ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN'],

    // Da test files
    testSymbols: ['AUDUSD', 'NZDUSD', 'EURCAD', 'CHFJPY']
};

// Simboli attualmente nell'EA
const currentEASymbols = [
    'EURUSD', 'XAUUSD', 'GBPUSD', 'USDJPY', // Major pairs (4)
    'CADCHF', 'AUDCHF', 'NZDCHF', 'AUDCAD', 'NZDCAD', 'AUDNZD', // Cross pairs (6)
    'EURGBP', 'NZDJPY', 'EURCHF', 'EURAUD', 'GBPJPY', 'GBPCHF', // Cross pairs (6)
    'GBPCAD', 'GBPNZD', 'GBPAUD', 'CHFJPY' // Cross pairs (4)
];

// Unione tutti i simboli del sistema
const allSystemSymbols = [
    ...systemSymbols.majorPairs,
    ...systemSymbols.minorPairs,
    ...systemSymbols.metals,
    ...systemSymbols.crypto,
    ...systemSymbols.stocks,
    ...systemSymbols.testSymbols
];

// Rimuovi duplicati
const uniqueSystemSymbols = [...new Set(allSystemSymbols)];

console.log("📊 Statistiche Simboli:");
console.log(`   Sistema (tutti): ${uniqueSystemSymbols.length} simboli unici`);
console.log(`   EA (attuale): ${currentEASymbols.length} simboli`);
console.log();

// Categorie sistema
console.log("🗂️ Categorie Simboli Sistema:");
console.log(`   Major Pairs: ${systemSymbols.majorPairs.join(', ')}`);
console.log(`   Minor Pairs: ${systemSymbols.minorPairs.join(', ')}`);
console.log(`   Metals: ${systemSymbols.metals.join(', ')}`);
console.log(`   Crypto: ${systemSymbols.crypto.join(', ')}`);
console.log(`   Stocks: ${systemSymbols.stocks.join(', ')}`);
console.log(`   Test Symbols: ${systemSymbols.testSymbols.join(', ')}`);
console.log();

// Simboli mancanti nell'EA
const missingFromEA = uniqueSystemSymbols.filter(symbol => !currentEASymbols.includes(symbol));

console.log("❌ Simboli Mancanti nell'EA:");
if (missingFromEA.length === 0) {
    console.log("   ✅ Tutti i simboli del sistema sono presenti nell'EA");
} else {
    missingFromEA.forEach(symbol => {
        let category = "Unknown";
        if (systemSymbols.majorPairs.includes(symbol)) category = "Major Pair";
        else if (systemSymbols.minorPairs.includes(symbol)) category = "Minor Pair";
        else if (systemSymbols.metals.includes(symbol)) category = "Metal";
        else if (systemSymbols.crypto.includes(symbol)) category = "Crypto";
        else if (systemSymbols.stocks.includes(symbol)) category = "Stock";
        else if (systemSymbols.testSymbols.includes(symbol)) category = "Test Symbol";

        console.log(`   ${symbol} (${category})`);
    });
}

console.log();

// Simboli extra nell'EA (non nel sistema)
const extraInEA = currentEASymbols.filter(symbol => !uniqueSystemSymbols.includes(symbol));

console.log("➕ Simboli Extra nell'EA:");
if (extraInEA.length === 0) {
    console.log("   ✅ Tutti i simboli dell'EA sono nel sistema");
} else {
    extraInEA.forEach(symbol => {
        console.log(`   ${symbol} (cross pair solo nell'EA)`);
    });
}

console.log();

// Raccomandazioni
console.log("💡 Raccomandazioni per EA:");
console.log("1. ✅ L'EA ha già tutti i cross pairs forex importanti");
console.log("2. ⚠️ Manca USDCHF (major pair)");
console.log("3. ⚠️ Manca USDCAD (minor pair)");
console.log("4. ⚠️ Manca AUDUSD (minor pair)");
console.log("5. ⚠️ Manca NZDUSD (minor pair)");
console.log("6. ⚠️ Manca EURJPY (minor pair)");
console.log("7. 🚀 Aggiungere XAGUSD (Argento) per completezza metalli");
console.log("8. 🚀 Considerare crypto se il broker supporta");

// Lista finale dei simboli consigliati da aggiungere
const recommendedSymbols = [
    'USDCHF',    // Major pair mancante
    'USDCAD',    // Minor pair
    'AUDUSD',    // Minor pair
    'NZDUSD',    // Minor pair
    'EURJPY',    // Minor pair
    'XAGUSD'     // Metal (Argento)
];

console.log("\n🎯 Simboli Consigliati da Aggiungere:");
recommendedSymbols.forEach(symbol => {
    console.log(`   ${symbol}`);
});