# LLM Sentiment Function Deployment Guide

## Prerequisites

1. **Supabase CLI** installed on your system
2. **Supabase project** created and configured
3. **DeepInfra API Key** obtained from [DeepInfra](https://deepinfra.com/)

## Environment Setup

### 1. Install Supabase CLI (if not already installed)

```bash
# Using npm
npm install -g supabase

# Using brew (macOS)
brew install supabase/tap/supabase

# Using winget (Windows)
winget install Supabase.CLI
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Set Environment Variables

Add your DeepInfra API key to your Supabase project environment variables:

```bash
# Method 1: Using Supabase Dashboard
# 1. Go to your Supabase project dashboard
# 2. Navigate to Settings → Edge Functions
# 3. Add environment variable: DEEPINFRA_API_KEY = your_api_key_here

# Method 2: Using CLI
supabase secrets set DEEPINFRA_API_KEY=your_api_key_here
```

## Deployment Steps

### 1. Navigate to Supabase Directory

```bash
cd "C:\Users\USER\Downloads\ai-cash-evo funzionante\ai-cash-evo-main\supabase"
```

### 2. Deploy the Function

```bash
supabase functions deploy llm-sentiment
```

### 3. Verify Deployment

```bash
# List deployed functions
supabase functions list llm-sentiment

# Check function logs
supabase functions logs llm-sentiment --follow
```

## Testing the Deployed Function

### 1. Using curl

```bash
# Replace with your actual Supabase URL and anon key
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"

curl -X POST "${SUPABASE_URL}/functions/v1/llm-sentiment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{
    "articles": [
      {
        "title": "Bitcoin reaches new all-time high",
        "description": "Bitcoin surged past $70,000 as institutional adoption increases",
        "source": "Financial Times",
        "publishedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "symbol": "BTCUSD",
    "context": "Cryptocurrency market analysis"
  }'
```

### 2. Using JavaScript

```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/llm-sentiment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`
  },
  body: JSON.stringify({
    articles: [
      {
        title: "Test news article",
        description: "This is a test article for LLM analysis",
        source: "Test Source"
      }
    ],
    symbol: "TEST"
  })
});

const result = await response.json();
console.log(result);
```

## Troubleshooting

### Common Issues

1. **DEEPINFRA_API_KEY not found**
   ```bash
   # Set the environment variable
   supabase secrets set DEEPINFRA_API_KEY=your_api_key_here
   ```

2. **Function deployment fails**
   ```bash
   # Check Supabase CLI status
   supabase status

   # Relink project if needed
   supabase link --project-ref your-project-ref
   ```

3. **API timeout or connection issues**
   ```bash
   # Check function logs
   supabase functions logs llm-sentiment --follow
   ```

### Function Logs

Monitor your function logs to troubleshoot issues:

```bash
# View real-time logs
supabase functions logs llm-sentiment --follow

# View recent logs
supabase functions logs llm-sentiment
```

### Environment Variables

Verify your environment variables are set correctly:

```bash
# List all secrets
supabase secrets list

# Test API key (optional)
curl -H "Authorization: Bearer $DEEPINFRA_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model": "deepseek-ai/DeepSeek-V3", "messages": [{"role": "user", "content": "Hello"}]}' \
     https://api.deepinfra.com/v1/openai/chat/completions
```

## Integration Examples

### With Trading Bot

```javascript
class TradingBot {
  constructor(supabaseUrl, supabaseAnonKey) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
  }

  async analyzeMarketSentiment(symbol, newsArticles) {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/llm-sentiment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseAnonKey}`
        },
        body: JSON.stringify({
          articles: newsArticles.slice(0, 5),
          symbol,
          context: 'Trading decision support'
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return {
        sentiment: 3,
        risk: 3,
        confidence: 0,
        reasoning: 'Analysis failed - using neutral fallback'
      };
    }
  }

  async makeTradingDecision(baseSignal, newsArticles) {
    const sentiment = await this.analyzeMarketSentiment(baseSignal.symbol, newsArticles);

    // Adjust trading decision based on sentiment
    const sentimentMultiplier = sentiment.sentiment > 3 ? 1.2 : sentiment.sentiment < 3 ? 0.8 : 1.0;
    const riskAdjustment = sentiment.risk > 4 ? 0.7 : sentiment.risk < 2 ? 1.1 : 1.0;

    return {
      ...baseSignal,
      confidence: Math.min(100, baseSignal.confidence * sentimentMultiplier * riskAdjustment),
      sentimentAnalysis: sentiment
    };
  }
}
```

### With News API Integration

```javascript
class NewsSentimentAnalyzer {
  constructor(supabaseUrl, supabaseAnonKey, newsApiKey) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
    this.newsApiKey = newsApiKey;
  }

  async fetchAndAnalyzeNews(symbol) {
    try {
      // Fetch news from News API
      const newsResponse = await fetch(
        `https://newsapi.org/v2/everything?q=${symbol}&pageSize=5&sortBy=publishedAt&language=en`,
        {
          headers: { 'X-API-Key': this.newsApiKey }
        }
      );

      const newsData = await newsResponse.json();

      if (newsData.status !== 'ok') {
        throw new Error('News API request failed');
      }

      // Format articles for LLM analysis
      const articles = newsData.articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt
      }));

      // Get sentiment analysis
      const sentimentResponse = await fetch(`${this.supabaseUrl}/functions/v1/llm-sentiment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseAnonKey}`
        },
        body: JSON.stringify({
          articles,
          symbol,
          context: 'Real-time market sentiment analysis'
        })
      });

      return await sentimentResponse.json();

    } catch (error) {
      console.error('News sentiment analysis failed:', error);
      return {
        sentiment: 3,
        risk: 3,
        confidence: 0,
        reasoning: 'News fetch failed - using neutral fallback'
      };
    }
  }
}
```

## Monitoring and Maintenance

### Performance Monitoring

1. **Monitor Function Usage**
   ```bash
   supabase functions logs llm-sentiment --follow
   ```

2. **Check API Costs**
   - Monitor your DeepInfra dashboard for usage and costs
   - Implement caching to reduce API calls

3. **Error Tracking**
   - Set up alerts for function failures
   - Monitor error rates and response times

### Updates and Maintenance

1. **Function Updates**
   ```bash
   # After making changes to the function
   supabase functions deploy llm-sentiment
   ```

2. **Environment Variable Updates**
   ```bash
   # Update API key or other secrets
   supabase secrets set DEEPINFRA_API_KEY=new_api_key_here
   ```

3. **Version Control**
   - Keep your function code in version control
   - Track changes and deployments

## Security Considerations

1. **API Key Security**
   - Never commit API keys to version control
   - Use environment variables for sensitive data
   - Regularly rotate API keys

2. **Function Security**
   - The function is configured with `verify_jwt = false` for easy testing
   - Consider enabling JWT verification for production use
   - Implement rate limiting if needed

3. **Input Validation**
   - The function includes input validation
   - All inputs are sanitized before processing
   - Fallback mechanisms prevent errors from breaking functionality

## Support

For issues or questions:

1. Check the function logs for error messages
2. Verify your DeepInfra API key and account status
3. Review the Supabase Edge Functions documentation
4. Test with the provided test cases

## Next Steps

After successful deployment:

1. Integrate the function with your trading bot or application
2. Set up monitoring and alerting
3. Implement caching for news articles to reduce API costs
4. Consider adding additional features like historical sentiment tracking