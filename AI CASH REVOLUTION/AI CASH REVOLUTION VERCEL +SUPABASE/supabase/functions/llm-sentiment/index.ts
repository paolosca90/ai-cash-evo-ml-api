import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TypeScript interfaces
interface NewsArticle {
  title: string;
  description: string;
  url?: string;
  source?: string;
  publishedAt?: string;
}

interface LLMAnalysisRequest {
  articles: NewsArticle[];
  symbol?: string;
  context?: string;
}

interface LLMAnalysisResponse {
  sentiment: number; // 1-5 scale (1: very negative, 5: very positive)
  risk: number; // 1-5 scale (1: very low risk, 5: very high risk)
  reasoning: string;
  confidence: number; // 0-1 scale
  timestamp: string;
  symbol?: string;
  market_context?: string;
  key_factors?: string[];
}

interface DeepInfraResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// LLM Sentiment Analysis System
class LLMSentimentAnalyzer {
  private static readonly DEEPINFRA_API_URL = 'https://api.deepinfra.com/v1/openai/chat/completions';
  private static readonly MODEL = 'deepseek-ai/DeepSeek-V3';

  /**
   * Analyze sentiment and risk from news articles using DeepInfra API
   */
  static async analyzeSentiment(request: LLMAnalysisRequest): Promise<LLMAnalysisResponse> {
    const timestamp = new Date().toISOString();

    // Fallback response in case of API failure
    const fallbackResponse: LLMAnalysisResponse = {
      sentiment: 3,
      risk: 3,
      reasoning: 'Analysis unavailable - using neutral fallback values',
      confidence: 0,
      timestamp,
      symbol: request.symbol,
      market_context: request.context,
      key_factors: ['API service unavailable']
    };

    try {
      // Validate input
      if (!request.articles || request.articles.length === 0) {
        throw new Error('No articles provided for analysis');
      }

      // Prepare the prompt for LLM analysis
      const prompt = this.buildAnalysisPrompt(request);

      // Call DeepInfra API
      const apiResponse = await this.callDeepInfraAPI(prompt);

      // Parse and validate the response
      const analysis = this.parseLLMResponse(apiResponse, request);

      console.log('✅ LLM Analysis completed successfully');
      console.log('📊 Sentiment:', analysis.sentiment, '| Risk:', analysis.risk);
      console.log('🎯 Confidence:', (analysis.confidence * 100).toFixed(1) + '%');

      return analysis;

    } catch (error) {
      console.error('❌ LLM Analysis failed:', error);

      // Return fallback response with error context
      return {
        ...fallbackResponse,
        reasoning: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'} - using neutral fallback values`,
        key_factors: ['Analysis error occurred', 'Using default neutral values']
      };
    }
  }

  /**
   * Build structured prompt for LLM analysis
   */
  private static buildAnalysisPrompt(request: LLMAnalysisRequest): string {
    const articlesText = request.articles
      .slice(0, 5) // Limit to 5 articles as specified
      .map((article, index) => {
        return `Article ${index + 1}:
Title: ${article.title}
Description: ${article.description || 'No description available'}
Source: ${article.source || 'Unknown'}
Published: ${article.publishedAt || 'Unknown date'}`
      })
      .join('\n\n');

    const contextInfo = request.context ? `\nMarket Context: ${request.context}` : '';
    const symbolInfo = request.symbol ? ` for ${request.symbol}` : '';

    return `You are an expert financial sentiment and risk analyst specializing in cryptocurrency and trading markets. Analyze the following news articles${symbolInfo} and provide a structured assessment.

${articlesText}${contextInfo}

Provide your analysis in the following JSON format only:
{
  "sentiment": number (1-5 scale: 1=very negative, 2=negative, 3=neutral, 4=positive, 5=very positive),
  "risk": number (1-5 scale: 1=very low risk, 2=low risk, 3=moderate risk, 4=high risk, 5=very high risk),
  "reasoning": string (comprehensive analysis explaining your sentiment and risk assessment),
  "confidence": number (0-1 scale: your confidence in this analysis),
  "key_factors": string[] (list of 3-5 key factors influencing your decision),
  "market_context": string (brief summary of overall market conditions)
}

Important guidelines:
- Sentiment: Consider overall market mood, positive/negative news balance, and market reactions
- Risk: Assess volatility potential, uncertainty, regulatory concerns, and market stability
- Confidence: Base this on news quality, recency, and consistency of signals
- Consider the specific symbol/market context if provided
- Focus on trading-relevant insights that would affect trading decisions
- Be objective and data-driven in your assessment

JSON Response:`;
  }

  /**
   * Call DeepInfra API with proper error handling
   */
  private static async callDeepInfraAPI(prompt: string): Promise<DeepInfraResponse> {
    const apiKey = Deno.env.get('DEEPINFRA_API_KEY');

    if (!apiKey) {
      throw new Error('DEEPINFRA_API_KEY not found in environment variables');
    }

    console.log('🤖 Calling DeepInfra API with DeepSeek-V3 model...');

    const response = await fetch(this.DEEPINFRA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DeepInfra API Error:', response.status, errorText);
      throw new Error(`DeepInfra API failed with status ${response.status}: ${errorText}`);
    }

    const data: DeepInfraResponse = await response.json();

    console.log('✅ DeepInfra API response received');
    console.log('📊 Tokens used:', data.usage.total_tokens);

    return data;
  }

  /**
   * Parse and validate LLM response
   */
  private static parseLLMResponse(apiResponse: DeepInfraResponse, request: LLMAnalysisRequest): LLMAnalysisResponse {
    try {
      const content = apiResponse.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in LLM response');
      }

      // Parse JSON response
      const parsed = JSON.parse(content);

      // Validate required fields
      const sentiment = this.validateNumber(parsed.sentiment, 1, 5, 'sentiment');
      const risk = this.validateNumber(parsed.risk, 1, 5, 'risk');
      const confidence = this.validateNumber(parsed.confidence, 0, 1, 'confidence');

      // Validate reasoning
      if (!parsed.reasoning || typeof parsed.reasoning !== 'string') {
        throw new Error('Invalid or missing reasoning in response');
      }

      return {
        sentiment,
        risk,
        reasoning: parsed.reasoning,
        confidence,
        timestamp: new Date().toISOString(),
        symbol: request.symbol,
        market_context: parsed.market_context || request.context,
        key_factors: Array.isArray(parsed.key_factors) ? parsed.key_factors : []
      };

    } catch (error) {
      console.error('❌ Failed to parse LLM response:', error);
      throw new Error(`Response parsing failed: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  /**
   * Validate number within range
   */
  private static validateNumber(value: unknown, min: number, max: number, fieldName: string): number {
    const num = Number(value);

    if (isNaN(num) || num < min || num > max) {
      console.warn(`⚠️ Invalid ${fieldName} value: ${value}, using fallback`);
      return Math.round((min + max) / 2); // Use middle value as fallback
    }

    return num;
  }

  /**
   * Get mock analysis for testing/fallback scenarios
   */
  static getMockAnalysis(symbol?: string): LLMAnalysisResponse {
    const sentimentOptions = [1, 2, 3, 4, 5];
    const riskOptions = [1, 2, 3, 4, 5];

    return {
      sentiment: sentimentOptions[Math.floor(Math.random() * sentimentOptions.length)],
      risk: riskOptions[Math.floor(Math.random() * riskOptions.length)],
      reasoning: 'Mock analysis for testing purposes',
      confidence: Math.random() * 0.5 + 0.5, // 0.5-1.0 range
      timestamp: new Date().toISOString(),
      symbol,
      market_context: 'Mock market context',
      key_factors: ['Mock factor 1', 'Mock factor 2', 'Mock factor 3']
    };
  }
}

// Edge Function Handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 LLM Sentiment Analysis Function Started');

    // Parse request
    const requestData: LLMAnalysisRequest = await req.json();
    console.log('📥 Request received:', {
      articlesCount: requestData.articles?.length || 0,
      symbol: requestData.symbol || 'Not specified',
      hasContext: !!requestData.context
    });

    // Validate required fields
    if (!requestData.articles || !Array.isArray(requestData.articles) || requestData.articles.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request: articles array is required and cannot be empty',
          timestamp: new Date().toISOString()
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log environment check
    const apiKey = Deno.env.get('DEEPINFRA_API_KEY');
    if (!apiKey) {
      console.warn('⚠️ DEEPINFRA_API_KEY not found in environment variables');
    }

    // Perform LLM analysis
    const analysis = await LLMSentimentAnalyzer.analyzeSentiment(requestData);

    console.log('✅ Analysis completed successfully');
    console.log('📊 Results:', {
      sentiment: analysis.sentiment,
      risk: analysis.risk,
      confidence: (analysis.confidence * 100).toFixed(1) + '%'
    });

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ LLM Sentiment Analysis Error:', error);

    // Return detailed error response
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        fallback_available: true
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});