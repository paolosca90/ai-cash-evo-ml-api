import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, 
  Download, 
  Crown, 
  AlertTriangle,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface SubscriptionLimitsProps {
  className?: string;
}

interface DailyUsage {
  signals_used: number;
  signals_limit: number;
}

interface UserProfile {
  subscription_plan: 'essenziale' | 'professional' | 'enterprise';
  subscription_expires_at: string | null;
}

interface Feature {
  name: string;
  description: string;
  enabled: boolean;
  limit?: number;
}

interface SubscriptionPlan {
  plan_type: string;
  name: string;
  max_signals_per_day: number;
  can_download_ea: boolean;
  can_access_premium_features: boolean;
  features: Feature[];
}

export const SubscriptionLimits = ({ className }: SubscriptionLimitsProps) => {
  const [loading, setLoading] = useState(true);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [planDetails, setPlanDetails] = useState<SubscriptionPlan | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_expires_at')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setUserProfile(profile);

      // Fetch plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_type', profile?.subscription_plan || 'essenziale')
        .single();

      if (planError) throw planError;

      // Cast Json type to Feature array (cast through unknown to avoid type errors)
      const typedPlan = plan ? {
        ...plan,
        features: (plan.features as unknown as Feature[]) || []
      } : null;

      setPlanDetails(typedPlan);

      // Fetch daily usage
      const { data: usage, error: usageError } = await supabase
        .from('daily_signal_usage')
        .select('signals_used, signals_limit')
        .eq('user_id', user.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (usageError) throw usageError;

      setDailyUsage(usage || {
        signals_used: 0,
        signals_limit: plan?.max_signals_per_day || 1
      });

    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Errore',
        description: 'Errore nel caricamento dei dati di abbonamento',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpgrade = () => {
    // Redirect to landing page with payment modal
    window.location.href = '/#pricing';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!planDetails || !dailyUsage) {
    return null;
  }

  const usagePercentage = Math.min((dailyUsage.signals_used / dailyUsage.signals_limit) * 100, 100);
  const isLimitReached = dailyUsage.signals_used >= dailyUsage.signals_limit;
  const isEssential = userProfile?.subscription_plan === 'essenziale';

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className={`w-5 h-5 ${isEssential ? 'text-muted-foreground' : 'text-warning'}`} />
            <CardTitle className="text-lg">Piano {planDetails.name}</CardTitle>
          </div>
          <Badge variant={isEssential ? 'secondary' : 'default'}>
            {isEssential ? 'Base' : 'Premium'}
          </Badge>
        </div>
        <CardDescription>
          Limiti e funzionalità del tuo abbonamento
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Daily Signals Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Segnali Giornalieri</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {dailyUsage.signals_used} / {dailyUsage.signals_limit}
            </span>
          </div>
          
          <Progress 
            value={usagePercentage} 
            className={`h-2 ${isLimitReached ? 'progress-danger' : ''}`}
          />
          
          {isLimitReached && (
            <div className="flex items-center gap-2 text-warning text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Limite giornaliero raggiunto</span>
            </div>
          )}
        </div>

        {/* Features List */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Funzionalità Incluse</h4>
          <div className="space-y-2">
            {Array.isArray(planDetails.features) && planDetails.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* EA Download Status */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Download className={`w-4 h-4 ${planDetails.can_download_ea ? 'text-success' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium">Expert Advisor</span>
          </div>
          <Badge variant={planDetails.can_download_ea ? 'default' : 'secondary'}>
            {planDetails.can_download_ea ? 'Disponibile' : 'Non incluso'}
          </Badge>
        </div>

        {/* Upgrade CTA for Essential users */}
        {isEssential && (
          <div className="p-4 bg-gradient-to-r from-primary/10 to-warning/10 rounded-lg border border-primary/20">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-primary">Passa a Professional</h4>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" />
                  <span>Segnali illimitati</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="w-3 h-3" />
                  <span>Expert Advisor scaricabile</span>
                </div>
                <div className="flex items-center gap-2">
                  <Crown className="w-3 h-3" />
                  <span>Funzionalità premium</span>
                </div>
              </div>
              <Button 
                onClick={handleUpgrade}
                className="w-full"
                size="sm"
              >
                Aggiorna a Professional
              </Button>
            </div>
          </div>
        )}

        {/* Subscription Status */}
        {userProfile?.subscription_expires_at && (
          <div className="text-xs text-muted-foreground text-center">
            Abbonamento attivo fino al{' '}
            {new Date(userProfile.subscription_expires_at).toLocaleDateString('it-IT')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};