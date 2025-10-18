# LLM Sentiment Analysis Function

## Overview

This Supabase Edge Function provides AI-powered sentiment and risk analysis for trading and investment decisions using the DeepInfra API with DeepSeek-V3 model.

## Features

- **Sentiment Analysis**: 1-5 scale sentiment scoring of market news
- **Risk Assessment**: 1-5 scale risk evaluation based on news content
- **LLM Integration**: Uses DeepSeek-V3 model for advanced natural language processing
- **Fallback Mechanism**: Safe fallback to neutral values (3,3,0) on API errors
- **Structured Response**: Consistent JSON output with confidence metrics
- **Error Handling**: Comprehensive error handling and logging

## API Endpoint

```
POST /functions/v1/llm-sentiment
```

## Request Format

```json
{
  "articles": [
    {
      "title": "Bitcoin reaches new all-time high",
      "description": "Bitcoin surged past $70,000 as institutional adoption increases",
      "url": "https://example.com/news/btc-high",
      "source": "Financial Times",
      "publishedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "symbol": "BTCUSD",
  "context": "Cryptocurrency market analysis for trading decisions"
}
```

## Response Format

```json
{
  "sentiment": 4,
  "risk": 3,
  "reasoning": "The news indicates positive market sentiment with Bitcoin reaching new highs...",
  "confidence": 0.85,
  "timestamp": "2024-01-15T10:35:00Z",
  "symbol": "BTCUSD",
  "market_context": "Cryptocurrency market analysis for trading decisions",
  "key_factors": [
    "Institutional adoption increasing",
    "New all-time high reached",
    "Market momentum positive"
  ]
}
```

## Scoring Scales

### Sentiment (1-5)
- **1**: Very Negative - Strong bearish signals, major concerns
- **2**: Negative - Bearish indicators, cautious outlook
- **3**: Neutral - Balanced outlook, mixed signals
- **4**: Positive - Bullish indicators, optimistic outlook
- **5**: Very Positive - Strong bullish signals, highly optimistic

### Risk (1-5)
- **1**: Very Low Risk - Stable conditions, low volatility expected
- **2**: Low Risk - Generally stable, minor concerns
- **3**: Moderate Risk - Balanced risk profile, normal volatility
- **4**: High Risk - Significant concerns, high volatility expected
- **5**: Very High Risk - Extreme conditions, very high volatility

### Confidence (0-1)
- **0.0-0.3**: Low confidence - Limited data or conflicting signals
- **0.3-0.7**: Moderate confidence - Adequate data but some uncertainty
- **0.7-1.0**: High confidence - Strong data patterns and clear signals

## Environment Variables

Required environment variables:

```bash
DEEPINFRA_API_KEY=your_deepinfra_api_key_here
```

## Usage Examples

### JavaScript/TypeScript

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
        title: "Federal Reserve announces interest rate decision",
        description: "The Federal Reserve maintains current interest rates, signaling potential cuts later this year",
        source: "Bloomberg",
        publishedAt: new Date().toISOString()
      }
    ],
    symbol: "EURUSD",
    context: "Forex market analysis"
  })
});

const analysis = await response.json();
console.log('Sentiment:', analysis.sentiment);
console.log('Risk:', analysis.risk);
console.log('Confidence:', analysis.confidence);
```

### Integration with Trading Systems

```javascript
async function enhanceTradingSignal(baseSignal, newsArticles) {
  const sentimentResponse = await fetch('/functions/v1/llm-sentiment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      articles: newsArticles,
      symbol: baseSignal.symbol,
      context: 'Trading signal enhancement'
    })
  });

  const sentiment = await sentimentResponse.json();

  // Adjust signal based on sentiment and risk
  const sentimentMultiplier = sentiment.sentiment > 3 ? 1.2 : sentiment.sentiment < 3 ? 0.8 : 1.0;
  const riskAdjustment = sentiment.risk > 4 ? 0.7 : sentiment.risk < 2 ? 1.1 : 1.0;

  return {
    ...baseSignal,
    confidence: baseSignal.confidence * sentiment.confidence,
    strength: baseSignal.strength * sentimentMultiplier * riskAdjustment,
    sentiment_analysis: sentiment,
    enhanced: true
  };
}
```

## Error Handling

The function includes comprehensive error handling:

1. **API Key Missing**: Returns error if DEEPINFRA_API_KEY is not configured
2. **Invalid Input**: Validates request structure and article data
3. **API Failures**: Graceful fallback to neutral values (sentiment: 3, risk: 3, confidence: 0)
4. **Response Parsing**: Validates and sanitizes LLM responses
5. **Network Issues**: Handles timeouts and connection errors

## Fallback Behavior

When the LLM API is unavailable or returns errors, the function automatically falls back to:

```json
{
  "sentiment": 3,
  "risk": 3,
  "reasoning": "Analysis unavailable - using neutral fallback values",
  "confidence": 0,
  "timestamp": "2024-01-15T10:35:00Z",
  "key_factors": ["API service unavailable"]
}
```

## Performance Considerations

- **Rate Limiting**: DeepInfra API has rate limits - implement appropriate caching
- **Article Limit**: Processes maximum 5 articles per request for optimal performance
- **Timeout**: Built-in timeout handling for API calls
- **Cost**: Monitor token usage as DeepInfra charges per token

## Monitoring

The function provides detailed logging:

- Request validation status
- API call success/failure
- Token usage metrics
- Response validation results
- Error details with timestamps

## Security

- Environment variable protection for API keys
- Input validation and sanitization
- CORS configuration for web access
- JWT verification configuration (disabled by default for this function)

## Deployment

The function is configured in `supabase/config.toml` with:

```toml
[functions.llm-sentiment]
verify_jwt = false
```

Deploy using:

```bash
supabase functions deploy llm-sentiment
```

## Testing

### Test with Mock Data

```javascript
const testResponse = await fetch('/functions/v1/llm-sentiment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
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

console.log(await testResponse.json());
```

## Integration Examples

### News API Integration

```javascript
async function analyzeLatestNews(symbol) {
  // Fetch recent news from your news API
  const newsResponse = await fetch(`https://newsapi.org/v2/everything?q=${symbol}&pageSize=5&sortBy=publishedAt`);
  const newsData = await newsResponse.json();

  // Format articles for LLM analysis
  const articles = newsData.articles.map(article => ({
    title: article.title,
    description: article.description,
    url: article.url,
    source: article.source.name,
    publishedAt: article.publishedAt
  }));

  // Get sentiment analysis
  return await fetch('/functions/v1/llm-sentiment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      articles,
      symbol,
      context: 'Real-time market sentiment analysis'
    })
  });
}
```

This function provides a robust foundation for AI-powered sentiment analysis in trading applications, with proper error handling and fallback mechanisms to ensure reliable operation.