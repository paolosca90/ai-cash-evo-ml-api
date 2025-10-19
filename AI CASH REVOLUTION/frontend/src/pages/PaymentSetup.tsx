import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  Zap,
  Lock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface PaymentMethod {
  type: 'stripe';
  details?: {
    stripe_customer_id?: string;
  };
}

const PaymentSetup = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);

      // Fetch subscription plans
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });
      setPlans(plansData || []);

      // Check if user already has payment method
      const { data: profile } = await supabase
        .from('profiles')
        .select('payment_method, subscription_status, trial_ends_at')
        .eq('id', session.user.id)
        .single();

      if (profile?.payment_method && profile?.subscription_status !== 'expired') {
        // User already has payment method, redirect to main app
        navigate('/trading');
        return;
      }

      // Check if a plan was selected from popup
      const state = location.state as any;
      if (state?.selectedPlan) {
        setSelectedPlan(state.selectedPlan);
        setCurrentStep(2); // Skip to plan selection
      }
    };

    checkAuth();
  }, [navigate, location.state]);

  
  const handleStripeSetup = async (planType?: string) => {
    setIsLoading(true);

    try {
      // Create Stripe checkout session for selected plan
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          user_id: user?.id,
          plan_type: planType || selectedPlan,
          success_url: `${window.location.origin}/payment-success`,
          cancel_url: `${window.location.origin}/payment-setup`
        }
      });

      if (error) throw error;

      // Redirect to Stripe checkout
      window.location.href = data.url;

    } catch (error: unknown) {
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore durante la configurazione del pagamento',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };

  const handlePlanSelect = (planType: string) => {
    setSelectedPlan(planType);
    handleStripeSetup(planType);
  };

  const completeSetup = () => {
    toast({
      title: 'Configurazione completata!',
      description: 'Benvenuto in AI CASH R-EVOLUTION. La tua prova gratuita di 7 giorni inizia ora.',
    });
    navigate('/trading');
  };

  // Step 1: Welcome & Explanation
  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display">
              Configura il Metodo di Pagamento
            </CardTitle>
            <CardDescription className="text-lg">
              Per iniziare la tua prova gratuita di 7 giorni, collega un metodo di pagamento valido
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Perché richiediamo un metodo di pagamento?
              </h3>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                  <span>Evita abusi delle prove gratuite</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                  <span>Transizione automatica dopo la prova</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                  <span>Accesso immediato a tutte le funzionalità</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                  <span><strong>Nessun addebito per i primi 7 giorni</strong></span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-success/5 rounded-lg border border-success/20">
                <TrendingUp className="w-5 h-5 text-success" />
                <div>
                  <div className="font-medium text-success">Prova Gratuita 7 Giorni</div>
                  <div className="text-sm text-muted-foreground">Accesso completo senza costi</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Zap className="w-5 h-5 text-warning" />
                <div>
                  <div className="font-medium">Cancella in Qualsiasi Momento</div>
                  <div className="text-sm text-muted-foreground">Nessun vincolo o commissioni di cancellazione</div>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button
                onClick={() => setCurrentStep(2)}
                className="w-full"
                size="lg"
              >
                Continua con Setup Completo
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Choose Payment Method
  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Progress value={66} className="w-32" />
              <span className="text-sm text-muted-foreground">Passo 2 di 3</span>
            </div>
            <CardTitle className="text-2xl font-display">
              Scegli il Metodo di Pagamento
            </CardTitle>
            <CardDescription>
              Seleziona come preferisci gestire i pagamenti
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="mt-6">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-muted-foreground" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Pagamento Tradizionale</h3>
                    <p className="text-muted-foreground">
                      Configura carta di credito o debito tramite Stripe
                    </p>
                  </div>
                  
                  <div className="bg-muted/20 p-4 rounded-lg">
                    <div className="text-sm space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <Shield className="w-4 h-4 text-success" />
                        <span>Pagamenti sicuri con crittografia SSL</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span>Supporto carte Visa, Mastercard, American Express</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleStripeSetup}
                    disabled={isLoading}
                    className="w-full max-w-md"
                    size="lg"
                  >
                    {isLoading ? 'Reindirizzamento...' : 'Configura Carta di Credito'}
                  </Button>
                </div>
              </div>

            <div className="mt-6 pt-6 border-t">
              <Button 
                onClick={() => setCurrentStep(1)} 
                variant="ghost" 
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Indietro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Success
  if (currentStep === 3) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-success mb-2">
                Configurazione Completata!
              </h3>
              <p className="text-muted-foreground">
                Il tuo metodo di pagamento è stato configurato con successo
              </p>
            </div>
            
            <div className="bg-success/5 p-4 rounded-lg border border-success/20">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Metodo:</span>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Carta di Credito</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prova Gratuita:</span>
                  <Badge className="bg-success/10 text-success">7 Giorni</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inizio fatturazione:</span>
                  <span>{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <Button onClick={completeSetup} className="w-full" size="lg">
              Inizia la Prova Gratuita
              <TrendingUp className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default PaymentSetup;