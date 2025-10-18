// Deno/Supabase Edge Function: fetch-investing-news-it
// Fetches Italian Investing.com RSS feed and returns parsed items

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewsItem {
  title: string | null;
  link: string | null;
  pubDate: string | null;
  author: string;
  image_url: string | null;
  source: string;
}

// Very small RSS parser for the fields we need
function parseInvestingRss(xml: string) {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const r = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
      const m = r.exec(block);
      return m ? m[1].trim() : null;
    };
    const enclosureMatch = /<enclosure[^>]*url="([^"]+)"/i.exec(block);

    items.push({
      title: get("title"),
      link: get("link"),
      pubDate: get("pubDate"),
      author: get("author") || "Investing.com",
      image_url: enclosureMatch ? enclosureMatch[1] : null,
      source: "Investing.com",
    });
  }
  return items;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use economic news RSS for more relevant calendar-related news
    const url = "https://it.investing.com/rss/news_14.rss"; // Economic news category
    const res = await fetch(url, {
      headers: {
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": "LovableBot/1.0 (+https://docs.lovable.dev)",
      },
    });

    if (!res.ok) {
      console.log("RSS fetch failed", res.status, res.statusText);
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const xml = await res.text();
    console.log("RSS fetch successful, parsing items...");
    const items = parseInvestingRss(xml).slice(0, 12);
    console.log(`Parsed ${items.length} news items`);

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Error fetching Investing.com RSS:", e);
    return new Response(JSON.stringify({ items: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});