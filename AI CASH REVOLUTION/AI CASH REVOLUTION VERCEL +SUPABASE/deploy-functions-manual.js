/**
 * DEPLOY MANUALE DELLE FUNZIONI SUPABASE
 * Script semplificato per deployare le funzioni principali
 */

const SUPABASE_URL = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA';

// Lista delle funzioni principali da deployare
const MAIN_FUNCTIONS = [
  'generate-ai-signals',
  'mt5-trade-signals',
  'mt5-trade-signals-v2',
  'heartbeat',
  'execute-trade',
  'oanda-market-data',
  'trade-signals',
  'trade-update'
];

// Headers comuni
const headers = {
  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Content-Type': 'application/json'
};

/**
 * Legge il contenuto di una funzione
 */
async function readFunctionContent(functionName) {
  try {
    const filePath = `./supabase/functions/${functionName}/index.ts`;
    const content = await Deno.readTextFile(filePath);
    return content;
  } catch (error) {
    console.error(`❌ Errore leggendo ${functionName}:`, error);
    throw error;
  }
}

/**
 * Deploy di una singola funzione
 */
async function deployFunction(functionName) {
  console.log(`\n🚀 Deploy della funzione: ${functionName}`);

  try {
    // 1. Leggi il codice sorgente
    const sourceCode = await readFunctionContent(functionName);
    console.log(`📄 Codice sorgente letto (${sourceCode.length} caratteri)`);

    // 2. Verifica che sia una Edge Function valida
    if (!sourceCode.includes('serve')) {
      console.warn(`⚠️ Attenzione: ${functionName} non sembra essere una Edge Function valida`);
    }

    // 3. Deploy diretto via API
    console.log(`📤 Deploy codice per ${functionName}...`);

    const deployResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'text/plain'
        },
        body: sourceCode
      }
    );

    if (deployResponse.ok) {
      console.log(`✅ Funzione ${functionName} deployata con successo!`);
      return true;
    } else {
      const errorText = await deployResponse.text();
      console.error(`❌ Errore deploy ${functionName}:`, errorText);

      // Try alternative approach - update existing function
      console.log(`🔄 Tentativo update della funzione esistente...`);
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/functions/${functionName}`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'text/plain'
          },
          body: sourceCode
        }
      );

      if (updateResponse.ok) {
        console.log(`✅ Funzione ${functionName} aggiornata con successo!`);
        return true;
      } else {
        const updateError = await updateResponse.text();
        console.error(`❌ Errore anche nell'update ${functionName}:`, updateError);
        return false;
      }
    }

  } catch (error) {
    console.error(`❌ Errore deploy ${functionName}:`, error);
    return false;
  }
}

/**
 * Verifica se una funzione esiste
 */
async function checkFunctionExists(functionName) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/functions?name=eq.${functionName}`,
      { headers }
    );

    if (response.ok) {
      const data = await response.json();
      return data && data.length > 0;
    }
    return false;
  } catch (error) {
    console.error(`❌ Errore verifica ${functionName}:`, error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🎯 AI Cash Revolution - Deploy Manuale Funzioni Supabase');
  console.log(`🔗 URL: ${SUPABASE_URL}`);

  // 1. Verifica connessione
  console.log('\n🔍 Verifica connessione con Supabase...');
  try {
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers });
    if (!testResponse.ok) {
      throw new Error(`HTTP ${testResponse.status}`);
    }
    console.log('✅ Connessione a Supabase attiva!');
  } catch (error) {
    console.error('❌ Errore connessione Supabase:', error);
    Deno.exit(1);
  }

  // 2. Deploy delle funzioni principali
  const results = {
    success: [],
    failed: []
  };

  console.log(`\n🚀 Inizio deploy di ${MAIN_FUNCTIONS.length} funzioni principali...\n`);

  for (const functionName of MAIN_FUNCTIONS) {
    try {
      const success = await deployFunction(functionName);
      if (success) {
        results.success.push(functionName);
      } else {
        results.failed.push(functionName);
      }

      // Pausa tra un deploy e l'altro
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Errore fatale deploy ${functionName}:`, error);
      results.failed.push(functionName);
    }
  }

  // 3. Verifica finale
  console.log('\n🔍 Verifica finale delle funzioni...');
  const verified = [];

  for (const functionName of results.success) {
    const exists = await checkFunctionExists(functionName);
    if (exists) {
      verified.push(functionName);
      console.log(`   ✅ ${functionName} - VERIFICATA`);
    } else {
      console.log(`   ⚠️ ${functionName} - NON TROVATA`);
      results.failed.push(functionName);
    }
  }

  // 4. Report finale
  console.log('\n📊 REPORT FINALE');
  console.log('==================');
  console.log(`✅ Successo: ${verified.length} funzioni`);
  verified.forEach(name => console.log(`   ✅ ${name}`));

  if (results.failed.length > 0) {
    console.log(`\n❌ Falliti: ${results.failed.length} funzioni`);
    results.failed.forEach(name => console.log(`   ❌ ${name}`));
  }

  console.log(`\n🎉 Deploy completato!`);
  console.log(`📈 Tasso di successo: ${Math.round((verified.length / MAIN_FUNCTIONS.length) * 100)}%`);

  if (verified.length > 0) {
    console.log('\n🌐 URL delle funzioni deployate:');
    verified.forEach(name => {
      console.log(`   ${name}: ${SUPABASE_URL}/functions/v1/${name}`);
    });
  }
}

// Esegui il main
await main().catch(error => {
  console.error('❌ Errore fatale:', error);
  Deno.exit(1);
});