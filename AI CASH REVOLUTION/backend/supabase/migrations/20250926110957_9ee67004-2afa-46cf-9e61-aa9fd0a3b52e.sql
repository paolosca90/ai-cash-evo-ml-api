-- Create table for storing financial news
CREATE TABLE public.financial_news (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    image_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    source TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    market_type TEXT DEFAULT 'global', -- 'us', 'eu', 'global'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.financial_news ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (news are public information)
CREATE POLICY "Financial news are publicly readable" 
ON public.financial_news 
FOR SELECT 
USING (true);

-- Create index for better performance on queries
CREATE INDEX idx_financial_news_published_at ON public.financial_news(published_at DESC);
CREATE INDEX idx_financial_news_market_type ON public.financial_news(market_type);
CREATE INDEX idx_financial_news_created_at ON public.financial_news(created_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_financial_news_updated_at
    BEFORE UPDATE ON public.financial_news
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();