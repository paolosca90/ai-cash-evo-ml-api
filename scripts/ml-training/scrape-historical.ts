/**
 * Script to scrape historical data for ML training
 * 
 * Usage:
 *   npm run scrape-historical
 */

import { HistoricalDataScraper } from '../../src/lib/ml-training/HistoricalDataScraper';

async function main() {
  console.log('🚀 Historical Data Scraper');
  console.log('=========================\n');

  const scraper = new HistoricalDataScraper();

  // Configuration: 6 months of data for major pairs
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const config = {
    symbols: [
      'EURUSD',
      'GBPUSD', 
      'USDJPY',
      'AUDUSD',
      'USDCAD',
      'NZDUSD'
    ],
    granularities: ['M5', 'M15', 'H1', 'H4'] as ('M5' | 'M15' | 'M1' | 'H1' | 'H4' | 'D1')[],
    startDate: sixMonthsAgo,
    endDate: new Date(),
    batchSize: 5000
  };

  console.log('📋 Configuration:');
  console.log(`   Symbols: ${config.symbols.join(', ')}`);
  console.log(`   Timeframes: ${config.granularities.join(', ')}`);
  console.log(`   Start Date: ${config.startDate.toISOString()}`);
  console.log(`   End Date: ${config.endDate.toISOString()}`);
  console.log('');

  // Start scraping
  const result = await scraper.scrapeHistoricalData(config);

  if (result.success) {
    console.log('\n✅ Scraping completed successfully!');
    console.log(`   Total candles: ${result.totalCandles}`);
    console.log(`   Batch ID: ${result.batchId}`);

    // Show statistics
    const stats = await scraper.getScrapingStats();
    console.log('\n📊 Database Statistics:');
    console.log(`   Total candles: ${stats.totalCandles}`);
    console.log(`   Symbols: ${stats.symbolsCount}`);
    console.log(`   Timeframes: ${stats.granularitiesCount}`);
    if (stats.dateRange) {
      console.log(`   Date range: ${stats.dateRange.start.toISOString()} to ${stats.dateRange.end.toISOString()}`);
    }
  } else {
    console.error('\n❌ Scraping failed:', result.error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
