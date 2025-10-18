/**
 * DEPLOY AUTOMATICO DELLE FUNZIONI SUPABASE
 * Script alternativo per deployare tutte le funzioni quando Supabase CLI non funziona
 */

// Carica i moduli necessari usando il global scope di Deno
const { readFileSync, readdirSync, statSync } = await import('https://deno.land/std@0.168.0/fs/mod.ts');
const { join } = await import('https://deno.land/std@0.168.0/path/mod.ts');

// Configurazione dalle variabili d'ambiente
const SUPABASE_URL = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA';

// Directory delle funzioni
const FUNCTIONS_DIR = './supabase/functions';

// Funzioni principali da deployare in ordine prioritario
const PRIORITY_FUNCTIONS = [
  'generate-ai-signals',
  'mt5-trade-signals',
  'mt5-trade-signals-v2',
  'heartbeat',
  'execute-trade',
  'oanda-market-data',
  'trade-signals',
  'trade-update'
];

// Header comuni per le richieste API
const headers = {
  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Content-Type': 'application/json'
};

/**
 * Legge il contenuto di una funzione
 */
function readFunctionContent(functionName) {
  const indexPath = join(FUNCTIONS_DIR, functionName, 'index.ts');
  try {
    return readFileSync(indexPath, { encoding: 'utf8' });
  } catch (error) {
    console.error(`❌ Errore leggendo ${functionName}:`, error);
    throw error;
  }
}

/**
 * Deploy di una singola funzione via API REST
 */
async function deployFunction(functionName) {
  console.log(`\n🚀 Deploy della funzione: ${functionName}`);

  try {
    // 1. Leggi il codice sorgente
    const sourceCode = readFunctionContent(functionName);

    // 2. Verifica che sia una Edge Function valida
    if (!sourceCode.includes('serve')) {
      console.warn(`⚠️ Attenzione: ${functionName} non sembra essere una Edge Function valida`);
    }

    // 3. Prepara il payload per il deploy
    const deployPayload = {
      name: functionName,
      verify_jwt: functionName !== 'heartbeat' && functionName !== 'mt5-trade-signals', // Disabilita JWT per funzioni pubbliche
      import_map: null,
      secrets: {}
    };

    // 4. Crea/aggiorna la funzione
    console.log(`📤 Creazione/aggiornamento funzione ${functionName}...`);
    const createResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/functions?name=eq.${functionName}`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Prefer': 'resolution=ignore-duplicates'
        },
        body: JSON.stringify(deployPayload)
      }
    );

    if (!createResponse.ok && createResponse.status !== 409) {
      console.error(`❌ Errore creazione funzione ${functionName}:`, await createResponse.text());
      return false;
    }

    // 5. Deploy del codice sorgente
    console.log(`📤 Deploy codice sorgente per ${functionName}...`);
    const deployResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/functions/${functionName}/body`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'text/plain'
        },
        body: sourceCode
      }
    );

    if (!deployResponse.ok) {
      console.error(`❌ Errore deploy codice ${functionName}:`, await deployResponse.text());
      return false;
    }

    console.log(`✅ Funzione ${functionName} deployata con successo!`);
    return true;

  } catch (error) {
    console.error(`❌ Errore deploy ${functionName}:`, error);
    return false;
  }
}

/**
 * Ottieni tutte le funzioni disponibili nella cartella
 */
function getAllFunctions() {
  try {
    const items = readdirSync(FUNCTIONS_DIR);
    const functions = [];

    for (const item of items) {
      const itemPath = join(FUNCTIONS_DIR, item);
      const stats = statSync(itemPath);

      if (stats.isDirectory) {
        const indexPath = join(itemPath, 'index.ts');
        try {
          statSync(indexPath); // Verifica che esista index.ts
          functions.push(item);
        } catch {
          // Ignora directory senza index.ts
        }
      }
    }

    return functions.sort();
  } catch (error) {
    console.error('❌ Errore lettura directory funzioni:', error);
    return [];
  }
}

/**
 * Verifica lo stato di una funzione dopo il deploy
 */
async function verifyFunction(functionName) {
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
  } catch {
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🎯 AI Cash Revolution - Deploy Automatico Funzioni Supabase');
  console.log(`📂 Directory: ${FUNCTIONS_DIR}`);
  console.log(`🔗 URL: ${SUPABASE_URL}`);

  // 1. Verifica connessione con Supabase
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

  // 2. Ottieni tutte le funzioni disponibili
  const allFunctions = getAllFunctions();
  console.log(`\n📋 Trovate ${allFunctions.length} funzioni totali:`);
  allFunctions.forEach(name => console.log(`   - ${name}`));

  // 3. Crea l'ordine di deploy: priorità + resto
  const priorityDeploy = PRIORITY_FUNCTIONS.filter(name => allFunctions.includes(name));
  const remainingDeploy = allFunctions.filter(name => !PRIORITY_FUNCTIONS.includes(name));
  const deployOrder = [...priorityDeploy, ...remainingDeploy];

  console.log(`\n🚀 Ordine di deploy (${deployOrder.length} funzioni):`);
  priorityDeploy.forEach(name => console.log(`   ⭐ ${name} (priorità)`));
  remainingDeploy.forEach(name => console.log(`   📄 ${name}`));

  // 4. Deploy sequenziale
  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  console.log('\n⚡ Inizio deploy sequenziale...\n');

  for (const functionName of deployOrder) {
    try {
      const success = await deployFunction(functionName);
      if (success) {
        results.success.push(functionName);

        // Breve pausa tra un deploy e l'altro
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        results.failed.push(functionName);
      }
    } catch (error) {
      console.error(`❌ Errore fatale deploy ${functionName}:`, error);
      results.failed.push(functionName);
    }
  }

  // 5. Verifica finale delle funzioni deployate
  console.log('\n🔍 Verifica finale delle funzioni deployate...');
  const verified = [];

  for (const functionName of results.success) {
    const isVerified = await verifyFunction(functionName);
    if (isVerified) {
      verified.push(functionName);
      console.log(`   ✅ ${functionName} - VERIFICATA`);
    } else {
      console.log(`   ⚠️ ${functionName} - NON VERIFICATA`);
      results.failed.push(functionName);
    }
  }

  // 6. Report finale
  console.log('\n📊 REPORT FINALE DEL DEPLOY');
  console.log('================================');
  console.log(`✅ Successo: ${verified.length} funzioni`);
  verified.forEach(name => console.log(`   ✅ ${name}`));

  if (results.failed.length > 0) {
    console.log(`\n❌ Falliti: ${results.failed.length} funzioni`);
    results.failed.forEach(name => console.log(`   ❌ ${name}`));
  }

  console.log(`\n🎉 Deploy completato!`);
  console.log(`📈 Tasso di successo: ${Math.round((verified.length / deployOrder.length) * 100)}%`);

  if (verified.length > 0) {
    console.log('\n🌐 URL delle funzioni deployate:');
    verified.forEach(name => {
      console.log(`   ${name}: ${SUPABASE_URL}/functions/v1/${name}`);
    });
  }
}

// Esegui il main
if (import.meta.main) {
  await main().catch(error => {
    console.error('❌ Errore fatale:', error);
    Deno.exit(1);
  });
}