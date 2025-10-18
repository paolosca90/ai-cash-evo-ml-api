import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: {
    name: string;
  };
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

interface TranslatedNews {
  title: string;
  description: string;
}

// Function to translate text using Gemini API
async function translateToItalian(text: string, geminiApiKey: string): Promise<string> {
  if (!text || text.trim() === '') return text;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Traduci questo testo dall'inglese all'italiano mantenendo il significato tecnico e finanziario. Rispondi SOLO con la traduzione, senza spiegazioni o commenti:

"${text}"`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
        }
      })
    });

    if (!response.ok) {
      console.error('Translation API error:', response.status, response.statusText);
      return text; // Return original text if translation fails
    }

    const data = await response.json();
    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (translatedText) {
      // Clean up the translation - remove quotes if they wrap the entire text
      const cleaned = translatedText.replace(/^["']|["']$/g, '');
      return cleaned;
    }
    
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original text if translation fails
  }
}

// Function to translate news article
async function translateNews(article: NewsArticle, geminiApiKey: string): Promise<TranslatedNews> {
  console.log(`🔄 Translating: ${article.title.substring(0, 50)}...`);
  
  const [translatedTitle, translatedDescription] = await Promise.all([
    translateToItalian(article.title, geminiApiKey),
    translateToItalian(article.description || '', geminiApiKey)
  ]);

  console.log(`✅ Translated: ${translatedTitle.substring(0, 50)}...`);
  
  return {
    title: translatedTitle,
    description: translatedDescription
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting financial news fetch process...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const newsApiKey = Deno.env.get('NEWS_API_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

    if (!newsApiKey) {
      throw new Error('NEWS_API_KEY not found in environment variables');
    }

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Define news queries for financial markets
    const newsQueries = [
      // US Markets
      {
        query: 'stocks OR "stock market" OR "Wall Street" OR NYSE OR NASDAQ OR "Federal Reserve" OR "S&P 500" OR "Dow Jones"',
        market_type: 'us',
        category: 'business'
      },
      // European Markets
      {
        query: 'EUR OR "European Central Bank" OR "DAX" OR "FTSE" OR "CAC 40" OR "European Union" OR "euro zone"',
        market_type: 'eu', 
        category: 'business'
      },
      // General Financial News
      {
        query: 'trading OR forex OR cryptocurrency OR "financial markets" OR inflation OR "interest rates"',
        market_type: 'global',
        category: 'business'
      }
    ];

    const allArticles: NewsArticle[] = [];

    // Fetch news for each query
    for (const newsQuery of newsQueries) {
      try {
        console.log(`📡 Fetching ${newsQuery.market_type} market news...`);
        
        const newsUrl = new URL('https://newsapi.org/v2/everything');
        newsUrl.searchParams.set('q', newsQuery.query);
        newsUrl.searchParams.set('language', 'en');
        newsUrl.searchParams.set('sortBy', 'publishedAt');
        newsUrl.searchParams.set('pageSize', '10');
        newsUrl.searchParams.set('domains', 'reuters.com,bloomberg.com,cnbc.com,marketwatch.com,ft.com,wsj.com');
        
        const response = await fetch(newsUrl.toString(), {
          headers: {
            'X-API-Key': newsApiKey,
          },
        });

        if (!response.ok) {
          console.error(`❌ NewsAPI error for ${newsQuery.market_type}:`, response.status, response.statusText);
          continue;
        }

        const data: NewsApiResponse = await response.json();
        
        if (data.status === 'ok' && data.articles) {
          // Add market type to articles
          const articlesWithMarket = data.articles.map(article => ({
            ...article,
            market_type: newsQuery.market_type,
            category: newsQuery.category
          }));
          allArticles.push(...articlesWithMarket);
          console.log(`✅ Found ${data.articles.length} articles for ${newsQuery.market_type} market`);
        }
      } catch (error) {
        console.error(`❌ Error fetching news for ${newsQuery.market_type}:`, error);
      }
    }

    if (allArticles.length === 0) {
      console.warn('⚠️ No articles found from unknown source');
      return new Response(
        JSON.stringify({ success: true, message: 'No new articles found', inserted: 0 }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sort by publication date and take top 20
    allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const topArticles = allArticles.slice(0, 20);

    console.log(`📰 Processing ${topArticles.length} top articles...`);

    // Clear old news (keep only last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { error: deleteError } = await supabase
      .from('financial_news')
      .delete()
      .lt('published_at', twentyFourHoursAgo.toISOString());

    if (deleteError) {
      console.error('❌ Error deleting old news:', deleteError);
    } else {
      console.log('🗑️ Cleaned up old news articles');
    }

    // Insert new articles with translation
    let insertedCount = 0;
    
    for (const article of topArticles) {
      try {
        // Check if article already exists
        const { data: existing } = await supabase
          .from('financial_news')
          .select('id')
          .eq('url', article.url)
          .single();

        if (existing) {
          // Traduci e aggiorna se già presente (garantiamo italiano)
          const translated = await translateNews(article, geminiApiKey);
          const { error: updateError } = await supabase
            .from('financial_news')
            .update({
              title: translated.title,
              description: translated.description,
              image_url: article.urlToImage,
              published_at: article.publishedAt,
              source: article.source.name,
              market_type: (article as unknown).market_type || 'global',
              category: (article as unknown).category || 'general'
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error('❌ Error updating article:', updateError, translated.title);
          } else {
            insertedCount++;
            console.log(`♻️ Updated (IT): ${translated.title.substring(0, 50)}...`);
          }
          continue;
        }

        // Translate the article
        const translated = await translateNews(article, geminiApiKey);

        // Insert new article with Italian translation
        const { error: insertError } = await supabase
          .from('financial_news')
          .insert({
            title: translated.title,
            description: translated.description,
            url: article.url,
            image_url: article.urlToImage,
            published_at: article.publishedAt,
            source: article.source.name,
            market_type: (article as unknown).market_type || 'global',
            category: (article as unknown).category || 'general'
          });

        if (insertError) {
          console.error('❌ Error inserting article:', insertError, translated.title);
        } else {
          insertedCount++;
          console.log(`✅ Inserted (IT): ${translated.title.substring(0, 50)}...`);
        }
      } catch (error) {
        console.error('❌ Error processing article:', error, article.title);
      }
    }

    console.log(`🎉 Successfully translated and inserted ${insertedCount} new articles in Italian`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully processed and translated ${topArticles.length} articles`, 
        inserted: insertedCount,
        total_processed: topArticles.length,
        language: 'Italian'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in fetch-financial-news function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
