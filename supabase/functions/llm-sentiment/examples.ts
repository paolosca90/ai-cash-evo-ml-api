/**
 * Examples and utilities for integrating with the LLM Sentiment Analysis function
 */

// Example TypeScript interfaces for integration
export interface TradingSignal {
  symbol: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  timestamp: string;
}

export interface EnhancedTradingSignal extends TradingSignal {
  sentiment_analysis?: {
    sentiment: number;
    risk: number;
    reasoning: string;
    confidence: number;
    key_factors: string[];
  };
  enhanced: boolean;
  sentiment_adjusted_confidence: number;
}

export interface NewsArticle {
  title: string;
  description: string;
  url?: string;
  source?: string;
  publishedAt?: string;
}

/**
 * Example 1: Basic LLM Sentiment Analysis
 */
export async function analyzeSentimentBasic(
  articles: NewsArticle[],
  supabaseUrl: string,
  supabaseAnonKey: string,
  symbol?: string
): Promise<unknown> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/llm-sentiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        articles: articles.slice(0, 5), // Limit to 5 articles
        symbol,
        context: 'Market sentiment analysis'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    // Return fallback analysis
    return {
      sentiment: 3,
      risk: 3,
      reasoning: 'Analysis failed - using neutral fallback',
      confidence: 0,
      timestamp: new Date().toISOString(),
      key_factors: ['Analysis error occurred']
    };
  }
}

/**
 * Example 2: Enhance Trading Signals with Sentiment Analysis
 */
export async function enhanceTradingSignalWithSentiment(
  baseSignal: TradingSignal,
  newsArticles: NewsArticle[],
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<EnhancedTradingSignal> {
  try {
    // Get sentiment analysis
    const sentimentAnalysis = await analyzeSentimentBasic(
      newsArticles,
      supabaseUrl,
      supabaseAnonKey,
      baseSignal.symbol
    );

    // Calculate sentiment-based adjustments
    const sentimentMultiplier = getSentimentMultiplier(sentimentAnalysis.sentiment);
    const riskAdjustment = getRiskAdjustment(sentimentAnalysis.risk);
    const confidenceAdjustment = sentimentAnalysis.confidence;

    // Apply adjustments to base signal
    const adjustedConfidence = Math.min(
      100,
      baseSignal.confidence * sentimentMultiplier * riskAdjustment * confidenceAdjustment
    );

    return {
      ...baseSignal,
      sentiment_analysis: sentimentAnalysis,
      enhanced: true,
      sentiment_adjusted_confidence: adjustedConfidence
    };

  } catch (error) {
    console.error('Error enhancing trading signal:', error);
    // Return original signal without enhancement
    return {
      ...baseSignal,
      enhanced: false,
      sentiment_adjusted_confidence: baseSignal.confidence
    };
  }
}

/**
 * Example 3: Batch Analysis for Multiple Symbols
 */
export async function analyzeMultipleSymbols(
  symbolsData: Array<{
    symbol: string;
    articles: NewsArticle[];
    context?: string;
  }>,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<Array<{ symbol: string; analysis: unknown }>> {
  const results = [];

  for (const { symbol, articles, context } of symbolsData) {
    try {
      const analysis = await analyzeSentimentBasic(
        articles,
        supabaseUrl,
        supabaseAnonKey,
        symbol
      );

      results.push({ symbol, analysis });

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
      results.push({
        symbol,
        analysis: {
          sentiment: 3,
          risk: 3,
          reasoning: `Analysis failed for ${symbol}`,
          confidence: 0,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  return results;
}

/**
 * Example 4: Real-time Sentiment Monitoring
 */
export class SentimentMonitor {
  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private intervalId?: NodeJS.Timeout;
  private callback?: (analysis: unknown) => void;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
  }

  /**
   * Start monitoring sentiment for a symbol
   */
  startMonitoring(
    symbol: string,
    intervalMs: number = 300000, // 5 minutes
    getNewsArticles: () => Promise<NewsArticle[]>,
    callback: (analysis: unknown) => void
  ) {
    this.callback = callback;

    const monitor = async () => {
      try {
        const articles = await getNewsArticles();
        const analysis = await analyzeSentimentBasic(
          articles,
          this.supabaseUrl,
          this.supabaseAnonKey,
          symbol
        );

        if (this.callback) {
          this.callback(analysis);
        }

        console.log(`Sentiment check for ${symbol}:`, {
          sentiment: analysis.sentiment,
          risk: analysis.risk,
          confidence: analysis.confidence
        });

      } catch (error) {
        console.error(`Error monitoring ${symbol}:`, error);
      }
    };

    // Initial check
    monitor();

    // Set up periodic checks
    this.intervalId = setInterval(monitor, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

/**
 * Helper functions for sentiment-based adjustments
 */
function getSentimentMultiplier(sentiment: number): number {
  switch (sentiment) {
    case 1: return 0.6; // Very negative
    case 2: return 0.8; // Negative
    case 3: return 1.0; // Neutral
    case 4: return 1.2; // Positive
    case 5: return 1.4; // Very positive
    default: return 1.0;
  }
}

function getRiskAdjustment(risk: number): number {
  switch (risk) {
    case 1: return 1.2; // Very low risk
    case 2: return 1.1; // Low risk
    case 3: return 1.0; // Moderate risk
    case 4: return 0.8; // High risk
    case 5: return 0.6; // Very high risk
    default: return 1.0;
  }
}

/**
 * Example 5: News API Integration
 */
export class NewsSentimentIntegrator {
  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private newsApiKey?: string;

  constructor(supabaseUrl: string, supabaseAnonKey: string, newsApiKey?: string) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
    this.newsApiKey = newsApiKey;
  }

  /**
   * Fetch recent news and analyze sentiment
   */
  async fetchAndAnalyzeNews(
    symbol: string,
    maxArticles: number = 5
  ): Promise<unknown> {
    try {
      let articles: NewsArticle[] = [];

      if (this.newsApiKey) {
        // Fetch from News API
        const newsResponse = await fetch(
          `https://newsapi.org/v2/everything?q=${symbol}&pageSize=${maxArticles}&sortBy=publishedAt&language=en`,
          {
            headers: { 'X-API-Key': this.newsApiKey }
          }
        );

        if (newsResponse.ok) {
          const newsData = await newsResponse.json();
          articles = newsData.articles.map((article: unknown) => ({
            title: article.title,
            description: article.description,
            url: article.url,
            source: article.source.name,
            publishedAt: article.publishedAt
          }));
        }
      }

      // Fallback to mock data if no news API key or fetch failed
      if (articles.length === 0) {
        articles = this.generateMockNews(symbol);
      }

      return await analyzeSentimentBasic(
        articles,
        this.supabaseUrl,
        this.supabaseAnonKey,
        symbol
      );

    } catch (error) {
      console.error('Error fetching and analyzing news:', error);
      return {
        sentiment: 3,
        risk: 3,
        reasoning: 'News fetch failed - using neutral fallback',
        confidence: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate mock news for testing/fallback
   */
  private generateMockNews(symbol: string): NewsArticle[] {
    const mockNews = [
      {
        title: `${symbol} market shows mixed signals`,
        description: `Technical analysis suggests consolidation for ${symbol} as traders await clearer direction`,
        source: 'Market Analysis',
        publishedAt: new Date().toISOString()
      },
      {
        title: `Trading volume for ${symbol} remains steady`,
        description: `${symbol} continues to trade within recent ranges with moderate trading activity`,
        source: 'Trading Desk',
        publishedAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      }
    ];

    return mockNews;
  }
}

/**
 * Usage Examples
 */

// Example usage in a trading bot
export async function tradingBotExample() {
  const supabaseUrl = 'https://your-project.supabase.co';
  const supabaseAnonKey = 'your-anon-key';
  const newsApiKey = 'your-news-api-key';

  const newsIntegrator = new NewsSentimentIntegrator(supabaseUrl, supabaseAnonKey, newsApiKey);
  const sentimentMonitor = new SentimentMonitor(supabaseUrl, supabaseAnonKey);

  // Analyze sentiment for a specific symbol
  const sentiment = await newsIntegrator.fetchAndAnalyzeNews('BTCUSD');
  console.log('BTCUSD Sentiment:', sentiment);

  // Start monitoring a symbol
  sentimentMonitor.startMonitoring(
    'EURUSD',
    300000, // 5 minutes
    async () => {
      // This function would fetch real news articles
      return await newsIntegrator.fetchAndAnalyzeNews('EURUSD').then(() => []);
    },
    (analysis) => {
      console.log('EURUSD Sentiment Update:', analysis);
    }
  );

  // Stop monitoring after some time
  setTimeout(() => {
    sentimentMonitor.stopMonitoring();
  }, 3600000); // 1 hour
}

// Export all examples and utilities
export default {
  analyzeSentimentBasic,
  enhanceTradingSignalWithSentiment,
  analyzeMultipleSymbols,
  SentimentMonitor,
  NewsSentimentIntegrator,
  tradingBotExample
};