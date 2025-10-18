import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, TrendingUp, Globe, DollarSign, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FinancialNewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url: string | null;
  published_at: string;
  source: string;
  market_type: string;
  category: string;
  created_at: string;
}

interface CalendarEvent {
  id?: string;
  date: string;
  time: string;
  event: string;
  currency: string;
  country?: string;
  impact?: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  category?: string;
}

const FinancialNews = () => {
  const [news, setNews] = useState<FinancialNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchNews = useCallback(async () => {
    try {
      // Usa il Calendario Economico (eventi reali) via Edge Function
      const { data, error } = await supabase.functions.invoke('fetch-economic-calendar', {
        body: { impact_filter: 'HIGH', days_ahead: 1, force_refresh: false }
      });
      if (error) throw error;

      const items = (data?.events || []).map((e: CalendarEvent, idx: number) => ({
        id: e.id || `${e.date}-${e.time}-${idx}`,
        title: `${e.event} (${e.currency})`,
        description: [
          e.country ? `Paese: ${e.country}` : null,
          e.impact ? `Impatto: ${e.impact}` : null,
          e.actual ? `Attuale: ${e.actual}` : null,
          e.forecast ? `Previsto: ${e.forecast}` : null,
          e.previous ? `Precedente: ${e.previous}` : null,
        ].filter(Boolean).join(' • '),
        url: null,
        image_url: null,
        published_at: new Date(`${e.date}T${e.time}Z`).toISOString(),
        source: 'Calendario Economico',
        market_type: 'global',
        category: e.category || 'calendar',
        created_at: new Date().toISOString(),
      }));

      setNews(items);
    } catch (error) {
      console.error('Error fetching news:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le news finanziarie",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const refreshNews = async () => {
    setRefreshing(true);
    try {
      await fetchNews();
      toast({
        title: "✅ Eventi aggiornati",
        description: "Calendario Economico (alto impatto)",
      });
    } catch (error) {
      console.error('Error refreshing news:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare le news",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const getMarketIcon = (marketType: string) => {
    switch (marketType) {
      case 'us':
        return <DollarSign className="w-4 h-4" />;
      case 'eu':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getMarketLabel = (marketType: string) => {
    switch (marketType) {
      case 'us':
        return 'US Markets';
      case 'eu':
        return 'EU Markets';
      default:
        return 'Global';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const publishedDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m fa`;
    } else if (diffInMinutes < 1440) { // Less than 24 hours
      return `${Math.floor(diffInMinutes / 60)}h fa`;
    } else {
      return publishedDate.toLocaleDateString('it-IT');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Eventi Calendario Economico (IT)</h3>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshNews}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Aggiornando...' : 'Aggiorna'}
        </Button>
      </div>

      {news.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nessuna news disponibile al momento.
            </p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={refreshNews}
              disabled={refreshing}
            >
              {refreshing ? 'Caricando...' : 'Carica News'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow duration-200 group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </CardTitle>
                  <Badge 
                    variant="secondary" 
                    className="shrink-0 text-xs gap-1"
                  >
                    {getMarketIcon(item.market_type)}
                    {getMarketLabel(item.market_type)}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(item.published_at)} • {item.source}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {item.description}
                  </p>
                )}
                
                {item.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-xs hover:bg-primary/10"
                    onClick={() => window.open(item.url!, '_blank', 'noopener,noreferrer')}
                  >
                    Dettagli articolo
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {news.length > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          Eventi ad alto impatto dal Calendario Economico
        </div>
      )}
    </div>
  );
};

export default FinancialNews;