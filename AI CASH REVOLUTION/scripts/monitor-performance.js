/**
 * Performance Monitoring Script
 * Queries database for V3 performance metrics
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rvopmdflnecyrwrzhyfy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDc4ODQsImV4cCI6MjA3NDEyMzg4NH0.snlFF1ChbYsA765gXE-cMGb11jHIaF2np_pNxIGLgW8'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function getRecentSignals(limit = 50) {
  console.log(`\n📊 Fetching last ${limit} signals from database...`)
  
  const { data, error } = await supabase
    .from('ai_signals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.log('❌ Error fetching signals:', error.message)
    return []
  }

  console.log(`✅ Found ${data.length} signals`)
  return data
}

async function getTradesWithOutcomes(limit = 50) {
  console.log(`\n💼 Fetching last ${limit} trades with outcomes...`)
  
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .not('status', 'eq', 'PENDING')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.log('❌ Error fetching trades:', error.message)
    return []
  }

  console.log(`✅ Found ${data.length} completed trades`)
  return data
}

function analyzeSignals(signals) {
  console.log('\n' + '='.repeat(70))
  console.log('📈 SIGNAL ANALYSIS')
  console.log('='.repeat(70))

  // Group by regime
  const byRegime = {
    TREND: signals.filter(s => s.metadata?.regime === 'TREND'),
    RANGE: signals.filter(s => s.metadata?.regime === 'RANGE'),
    UNCERTAIN: signals.filter(s => s.metadata?.regime === 'UNCERTAIN'),
    UNKNOWN: signals.filter(s => !s.metadata?.regime)
  }

  console.log('\n📊 Signals by Regime:')
  Object.entries(byRegime).forEach(([regime, sigs]) => {
    if (sigs.length > 0) {
      const avgConf = (sigs.reduce((sum, s) => sum + (s.confidence || 0), 0) / sigs.length).toFixed(1)
      const buyCount = sigs.filter(s => s.type === 'BUY').length
      const sellCount = sigs.filter(s => s.type === 'SELL').length
      const holdCount = sigs.filter(s => s.type === 'HOLD').length
      
      console.log(`   ${regime}: ${sigs.length} signals (${((sigs.length / signals.length) * 100).toFixed(1)}%)`)
      console.log(`      Avg Confidence: ${avgConf}%`)
      console.log(`      Directions: BUY=${buyCount}, SELL=${sellCount}, HOLD=${holdCount}`)
    }
  })

  // Group by symbol
  const bySymbol = {}
  signals.forEach(s => {
    if (!bySymbol[s.symbol]) bySymbol[s.symbol] = []
    bySymbol[s.symbol].push(s)
  })

  console.log('\n📊 Signals by Symbol:')
  Object.entries(bySymbol)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([symbol, sigs]) => {
      const avgConf = (sigs.reduce((sum, s) => sum + (s.confidence || 0), 0) / sigs.length).toFixed(1)
      console.log(`   ${symbol}: ${sigs.length} signals, Avg Conf: ${avgConf}%`)
    })

  // Session analysis
  const bySessions = {
    ASIAN: signals.filter(s => s.metadata?.session === 'ASIAN'),
    LONDON: signals.filter(s => s.metadata?.session === 'LONDON'),
    NEWYORK: signals.filter(s => s.metadata?.session === 'NEWYORK'),
    OVERLAP: signals.filter(s => s.metadata?.session === 'OVERLAP')
  }

  console.log('\n📊 Signals by Session:')
  Object.entries(bySessions).forEach(([session, sigs]) => {
    if (sigs.length > 0) {
      console.log(`   ${session}: ${sigs.length} signals (${((sigs.length / signals.length) * 100).toFixed(1)}%)`)
    }
  })

  // Open breakout analysis
  const withBreakout = signals.filter(s => s.metadata?.openBreakout && s.metadata.openBreakout !== 'No')
  console.log(`\n📊 Open Breakout Signals: ${withBreakout.length} (${((withBreakout.length / signals.length) * 100).toFixed(1)}%)`)
  if (withBreakout.length > 0) {
    const bullish = withBreakout.filter(s => s.metadata.openBreakout === 'BULLISH').length
    const bearish = withBreakout.filter(s => s.metadata.openBreakout === 'BEARISH').length
    console.log(`   BULLISH: ${bullish}, BEARISH: ${bearish}`)
  }
}

function analyzeTrades(trades) {
  console.log('\n' + '='.repeat(70))
  console.log('💰 TRADE PERFORMANCE')
  console.log('='.repeat(70))

  const completed = trades.filter(t => t.status === 'CLOSED' || t.status === 'STOPPED')
  
  if (completed.length === 0) {
    console.log('\n⚠️  No completed trades found')
    return
  }

  // Calculate wins/losses
  const wins = completed.filter(t => {
    if (!t.close_price || !t.entry_price) return false
    const pnl = t.type === 'BUY' 
      ? (t.close_price - t.entry_price) 
      : (t.entry_price - t.close_price)
    return pnl > 0
  })

  const losses = completed.filter(t => {
    if (!t.close_price || !t.entry_price) return false
    const pnl = t.type === 'BUY' 
      ? (t.close_price - t.entry_price) 
      : (t.entry_price - t.close_price)
    return pnl < 0
  })

  const winRate = (wins.length / completed.length * 100).toFixed(1)

  console.log(`\n📊 Overall Performance:`)
  console.log(`   Total Trades: ${completed.length}`)
  console.log(`   Wins: ${wins.length}`)
  console.log(`   Losses: ${losses.length}`)
  console.log(`   Win Rate: ${winRate}%`)

  // Calculate P&L
  const totalPnL = completed.reduce((sum, t) => {
    if (!t.close_price || !t.entry_price) return sum
    const pnl = t.type === 'BUY' 
      ? (t.close_price - t.entry_price) 
      : (t.entry_price - t.close_price)
    return sum + pnl
  }, 0)

  console.log(`   Total P&L: ${totalPnL > 0 ? '+' : ''}${totalPnL.toFixed(5)}`)

  // Performance by regime (if metadata exists)
  const tradesWithRegime = completed.filter(t => t.metadata?.regime)
  if (tradesWithRegime.length > 0) {
    console.log(`\n📊 Performance by Regime:`)
    
    const regimes = ['TREND', 'RANGE', 'UNCERTAIN']
    regimes.forEach(regime => {
      const regimeTrades = tradesWithRegime.filter(t => t.metadata.regime === regime)
      if (regimeTrades.length > 0) {
        const regimeWins = regimeTrades.filter(t => {
          const pnl = t.type === 'BUY' 
            ? (t.close_price - t.entry_price) 
            : (t.entry_price - t.close_price)
          return pnl > 0
        })
        const regimeWinRate = (regimeWins.length / regimeTrades.length * 100).toFixed(1)
        console.log(`   ${regime}: ${regimeTrades.length} trades, Win Rate: ${regimeWinRate}%`)
      }
    })
  }

  // Recent trades
  console.log(`\n📋 Last 10 Trades:`)
  console.log('| Symbol  | Type | Entry   | Close   | P&L      | Status  | Regime    |')
  console.log('|---------|------|---------|---------|----------|---------|-----------|')
  
  trades.slice(0, 10).forEach(t => {
    const pnl = t.close_price && t.entry_price
      ? t.type === 'BUY' 
        ? (t.close_price - t.entry_price) 
        : (t.entry_price - t.close_price)
      : 0
    
    const pnlStr = pnl > 0 ? `+${pnl.toFixed(5)}` : pnl.toFixed(5)
    const regime = t.metadata?.regime || 'N/A'
    
    console.log(
      `| ${t.symbol.padEnd(7)} | ${t.type.padEnd(4)} | ` +
      `${(t.entry_price?.toFixed(5) || 'N/A').padStart(7)} | ` +
      `${(t.close_price?.toFixed(5) || 'N/A').padStart(7)} | ` +
      `${pnlStr.padStart(8)} | ${t.status.padEnd(7)} | ${regime.padEnd(9)} |`
    )
  })
}

async function checkSystemHealth() {
  console.log('\n' + '='.repeat(70))
  console.log('🏥 SYSTEM HEALTH CHECK')
  console.log('='.repeat(70))

  // Check if signals are being generated
  const { data: recentSignals, error: signalsError } = await supabase
    .from('ai_signals')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)

  if (signalsError) {
    console.log('❌ Error checking signals:', signalsError.message)
  } else if (recentSignals && recentSignals.length > 0) {
    const lastSignalTime = new Date(recentSignals[0].created_at)
    const timeSinceLastSignal = Date.now() - lastSignalTime.getTime()
    const minutesAgo = Math.floor(timeSinceLastSignal / 60000)
    
    console.log(`\n✅ Last signal generated: ${minutesAgo} minutes ago`)
    if (minutesAgo > 60) {
      console.log('   ⚠️  Warning: No signals generated in the last hour')
    }
  } else {
    console.log('\n⚠️  No signals found in database')
  }

  // Check if trades are being executed
  const { data: recentTrades, error: tradesError } = await supabase
    .from('trades')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)

  if (tradesError) {
    console.log('❌ Error checking trades:', tradesError.message)
  } else if (recentTrades && recentTrades.length > 0) {
    const lastTradeTime = new Date(recentTrades[0].created_at)
    const timeSinceLastTrade = Date.now() - lastTradeTime.getTime()
    const hoursAgo = Math.floor(timeSinceLastTrade / 3600000)
    
    console.log(`✅ Last trade executed: ${hoursAgo} hours ago`)
  } else {
    console.log('⚠️  No trades found in database')
  }
}

async function main() {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 AI CASH EVOLUTION - PERFORMANCE MONITOR')
  console.log('   V3 Adaptive System Performance Analysis')
  console.log('='.repeat(70))

  // System health
  await checkSystemHealth()

  // Get and analyze signals
  const signals = await getRecentSignals(100)
  if (signals.length > 0) {
    analyzeSignals(signals)
  }

  // Get and analyze trades
  const trades = await getTradesWithOutcomes(100)
  if (trades.length > 0) {
    analyzeTrades(trades)
  }

  console.log('\n✅ Monitoring complete!')
  console.log('\nTip: Run this script regularly to track V3 system performance')
}

main().catch(console.error)
