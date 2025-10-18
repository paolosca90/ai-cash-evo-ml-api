#!/usr/bin/env node

// Auto Trading Daemon - Sistema trading 24/7 su OANDA demo
// Esegue trade automatici con intervalli irregolari per aumentare campione ML

const SUPABASE_URL = 'https://rvopmdflnecyrwrzhyfy.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDc4ODQsImV4cCI6MjA3NDEyMzg4NH0.snlFF1ChbYsA765gXE-cMGb11jHIaF2np_pNxIGLgW8'

let totalTrades = 0
let successfulTrades = 0
let failedTrades = 0

console.log('🚀 Auto Trading System - OANDA Demo')
console.log('====================================')
console.log(`Started at: ${new Date().toISOString()}`)
console.log('Trading: Major, Minor, Metals (12 symbols)')
console.log('Interval: 10-30 minutes (random)')
console.log('Mode: 24/7 continuous\n')

// Funzione per eseguire un trade
async function executeTrade() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/auto-oanda-trader`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        mode: 'single'
      })
    })

    const data = await response.json()

    if (data.success && data.results && data.results[0]) {
      const result = data.results[0]

      if (result.success) {
        successfulTrades++
        console.log(`✅ [${new Date().toLocaleTimeString()}] TRADE EXECUTED`)
        console.log(`   Symbol: ${result.symbol}`)
        console.log(`   Type: ${result.type}`)
        console.log(`   Confidence: ${result.confidence}%`)
        console.log(`   OANDA ID: ${result.tradeId}`)
        console.log(`   DB ID: ${result.signalId}`)
      } else {
        failedTrades++
        console.log(`⏭️  [${new Date().toLocaleTimeString()}] SKIPPED: ${result.symbol} - ${result.reason}`)
      }
    } else {
      failedTrades++
      console.log(`❌ [${new Date().toLocaleTimeString()}] ERROR: ${data.error || 'Unknown error'}`)
    }

    totalTrades++

    // Stats ogni 10 trade
    if (totalTrades % 10 === 0) {
      console.log(`\n📊 STATS (${totalTrades} attempts)`)
      console.log(`   Successful: ${successfulTrades}`)
      console.log(`   Failed/Skipped: ${failedTrades}`)
      console.log(`   Success Rate: ${((successfulTrades/totalTrades)*100).toFixed(1)}%\n`)
    }

  } catch (error) {
    failedTrades++
    console.error(`❌ [${new Date().toLocaleTimeString()}] EXCEPTION:`, error.message)
  }

  // Intervallo random 10-30 minuti (600-1800 secondi)
  const intervalSeconds = 600 + Math.floor(Math.random() * 1200)
  const intervalMinutes = Math.round(intervalSeconds / 60)

  console.log(`⏳ Next trade in ~${intervalMinutes} minutes\n`)

  setTimeout(executeTrade, intervalSeconds * 1000)
}

// Gestione graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down...')
  console.log(`\n📊 FINAL STATS:`)
  console.log(`   Total Attempts: ${totalTrades}`)
  console.log(`   Successful Trades: ${successfulTrades}`)
  console.log(`   Failed/Skipped: ${failedTrades}`)
  console.log(`   Success Rate: ${totalTrades > 0 ? ((successfulTrades/totalTrades)*100).toFixed(1) : 0}%`)
  console.log(`\nStopped at: ${new Date().toISOString()}\n`)
  process.exit(0)
})

// Start trading
console.log('🎯 Starting first trade...\n')
executeTrade()
