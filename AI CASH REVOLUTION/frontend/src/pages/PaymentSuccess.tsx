import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, TrendingUp, Loader } from 'lucide-react';

const PaymentSuccess = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdated, setIsUpdated] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const updatePaymentMethod = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        navigate('/payment-setup');
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login');
          return;
        }

        // Update user profile with Stripe payment method
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);

        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            email: session.user.email,
            payment_method: 'stripe',
            payment_details: {
              stripe_session_id: sessionId,
              setup_date: new Date().toISOString()
            },
            trial_ends_at: trialEndDate.toISOString(),
            subscription_status: 'trial'
          });

        if (error) throw error;
        
        setIsUpdated(true);
        toast({
          title: 'Metodo di pagamento configurato!',
          description: 'La tua prova gratuita di 7 giorni è ora attiva',
        });

      } catch (error: unknown) {
        toast({
          title: 'Errore',
          description: error.message,
          variant: 'destructive'
        });
        navigate('/payment-setup');
      } finally {
        setIsLoading(false);
      }
    };

    updatePaymentMethod();
  }, [searchParams, navigate, toast]);

  const handleContinue = () => {
    navigate('/trading');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader className="w-12 h-12 mx-auto animate-spin text-primary" />
            <h3 className="text-lg font-semibold">Configurazione in corso...</h3>
            <p className="text-muted-foreground">
              Stiamo configurando il tuo metodo di pagamento
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isUpdated) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
            <h3 className="text-lg font-semibold text-destructive">Configurazione Fallita</h3>
            <p className="text-muted-foreground">
              Si è verificato un errore durante la configurazione del metodo di pagamento
            </p>
            <Button onClick={() => navigate('/payment-setup')} className="w-full">
              Riprova
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          
          <div>
            <h3 className="text-2xl font-semibold text-success mb-2">
              Pagamento Configurato!
            </h3>
            <p className="text-muted-foreground">
              Il tuo metodo di pagamento è stato configurato con successo
            </p>
          </div>
          
          <div className="bg-success/5 p-4 rounded-lg border border-success/20">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metodo di Pagamento:</span>
                <Badge className="bg-primary/10 text-primary">Carta di Credito</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge className="bg-success/10 text-success">Prova Gratuita Attiva</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scadenza prova:</span>
                <span>{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-primary/5 p-4 rounded-lg">
            <h4 className="font-medium text-primary mb-2">🎉 La tua prova gratuita è iniziata!</h4>
            <p className="text-sm text-muted-foreground">
              Hai accesso completo a tutte le funzionalità di AI CASH R-EVOLUTION per 7 giorni. 
              Nessun addebito fino alla fine del periodo di prova.
            </p>
          </div>
          
          <Button onClick={handleContinue} className="w-full" size="lg">
            Accedi alla Piattaforma
            <TrendingUp className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;