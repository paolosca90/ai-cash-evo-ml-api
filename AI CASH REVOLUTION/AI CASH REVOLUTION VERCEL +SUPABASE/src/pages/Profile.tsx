import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, CreditCard, Crown, Clock, ExternalLink, AlertTriangle, Activity } from "lucide-react";
import Navigation from "@/components/Navigation";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const Profile = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<unknown>(null);
  const [signalUsage, setSignalUsage] = useState<unknown>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<unknown[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        navigate("/login", { replace: true });
      } else {
        setUser(session.user);
        await fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        navigate("/login", { replace: true });
      } else {
        setUser(session.user);
        await fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profilo utente
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setProfile(profileData);

      // Fetch uso segnali oggi
      const { data: usageData } = await supabase
        .from('daily_signal_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

      setSignalUsage(usageData);

      // Fetch piani disponibili
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      setSubscriptionPlans(plansData || []);

    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleUpgrade = () => {
    navigate('/payment-setup');
  };

  const handleRenew = () => {
    navigate('/payment-setup');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="text-center">Caricamento...</div>
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const isExpiringSoon = () => {
    if (!profile?.subscription_expires_at) return false;
    const expiryDate = new Date(profile.subscription_expires_at);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = () => {
    if (!profile?.subscription_expires_at) return false;
    return new Date(profile.subscription_expires_at) < new Date();
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-primary text-primary-foreground';
      case 'professional': return 'bg-warning text-warning-foreground';
      case 'essenziale': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getCurrentPlan = () => {
    return subscriptionPlans.find(p => p.plan_type === profile?.subscription_plan);
  };

  const getSignalUsageText = () => {
    const currentPlan = getCurrentPlan();
    if (!currentPlan) return 'N/A';
    const used = signalUsage?.signals_used || 0;
    const limit = currentPlan.max_signals_per_day;
    return `${used}/${limit === 999 ? '∞' : limit}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto p-3 sm:p-6 max-w-4xl">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Profilo Utente</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gestisci le tue informazioni personali e abbonamento</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* User Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informazioni Personali
              </CardTitle>
              <CardDescription>
                I tuoi dati di registrazione
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-sm sm:text-base truncate">{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Membro dal</p>
                  <p className="font-medium text-sm sm:text-base">
                    {formatDate(user.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">ID Utente</p>
                  <p className="font-medium text-xs break-all">{user.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Piano Abbonamento
              </CardTitle>
              <CardDescription>
                Stato del tuo abbonamento attuale
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Piano attuale */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Crown className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Piano attuale</p>
                    <div className="flex items-center gap-2">
                      <Badge className={getPlanBadgeColor(profile?.subscription_plan)}>
                        {profile?.subscription_plan?.toUpperCase()}
                      </Badge>
                      {profile?.subscription_status === 'trial' && (
                        <Badge variant="outline" className="text-xs">PROVA</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    €{getCurrentPlan()?.price_monthly || 0}/mese
                  </p>
                </div>
              </div>

              {/* Scadenza */}
              {profile?.subscription_expires_at && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {profile?.subscription_status === 'trial' ? 'Prova scade il' : 'Abbonamento scade il'}
                    </p>
                    <p className="font-medium text-sm flex items-center gap-2">
                      {formatDate(profile.subscription_expires_at)}
                      {isExpired() && (
                        <Badge variant="destructive" className="text-xs">SCADUTO</Badge>
                      )}
                      {isExpiringSoon() && !isExpired() && (
                        <Badge variant="outline" className="text-xs border-warning text-warning">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          SCADE PRESTO
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Uso segnali */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Segnali utilizzati oggi</p>
                  <p className="font-medium text-sm">{getSignalUsageText()}</p>
                </div>
              </div>

              {/* Azioni */}
              <div className="flex flex-col sm:flex-row gap-2">
                {profile?.subscription_plan === 'essenziale' && (
                  <Button onClick={handleUpgrade} className="flex-1">
                    <Crown className="w-4 h-4 mr-2" />
                    Fai Upgrade
                  </Button>
                )}
                <Button variant="outline" onClick={handleRenew} className="flex-1">
                  <CreditCard className="w-4 h-4 mr-2" />
                  {isExpired() ? 'Rinnova Ora' : 'Gestisci Abbonamento'}
                </Button>
              </div>

              {/* Avviso scadenza */}
              {(isExpiringSoon() || isExpired()) && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-warning">
                        {isExpired() ? 'Abbonamento Scaduto' : 'Abbonamento in Scadenza'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isExpired() 
                          ? 'Il tuo accesso è limitato. Rinnova per continuare a usare tutte le funzionalità.'
                          : 'Rinnova ora per evitare interruzioni del servizio.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Piani disponibili per upgrade */}
        {profile?.subscription_plan === 'essenziale' && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upgrade Disponibili</CardTitle>
                <CardDescription>
                  Potenzia il tuo trading con piani superiori
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {subscriptionPlans
                    .filter(plan => plan.plan_type !== 'essenziale')
                    .map((plan) => (
                      <Card key={plan.plan_type} className="border-2 border-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Badge className={getPlanBadgeColor(plan.plan_type)}>
                              {plan.name}
                            </Badge>
                            <div className="text-right">
                              <p className="text-lg font-bold">€{plan.price_monthly}</p>
                              <p className="text-xs text-muted-foreground">/mese</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                          <p className="text-sm font-medium mb-3">
                            {plan.max_signals_per_day === 999 ? 'Segnali illimitati' : `${plan.max_signals_per_day} segnali/giorno`}
                          </p>
                          <Button onClick={handleUpgrade} size="sm" className="w-full">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Scegli Piano
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Funzionalità del piano attuale */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Funzionalità del Tuo Piano</CardTitle>
              <CardDescription>
                Cosa include il piano {profile?.subscription_plan}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getCurrentPlan()?.max_signals_per_day > 1 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">
                    {getCurrentPlan()?.max_signals_per_day === 999 ? 'Segnali illimitati' : `${getCurrentPlan()?.max_signals_per_day} segnale/giorno`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getCurrentPlan()?.can_access_premium_features ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">Analisi avanzate ML</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getCurrentPlan()?.can_download_ea ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">Expert Advisor MT5</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${profile?.subscription_plan !== 'essenziale' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">Supporto prioritario</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${profile?.subscription_plan === 'enterprise' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">Trading automatico</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${profile?.subscription_plan !== 'essenziale' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">Aggiornamenti beta</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;