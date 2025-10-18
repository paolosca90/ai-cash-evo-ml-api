import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings, 
  CreditCard, 
  Calendar, 
  AlertTriangle,
  ExternalLink,
  Shield,
  RefreshCw
} from 'lucide-react';

interface ProductId {
  id: string;
  type: string;
  [key: string]: unknown;
}

interface SubscriptionManagerProps {
  subscribed?: boolean;
  subscriptionEnd?: string | null;
  productId?: string | ProductId | null;
  onRefresh?: () => void;
}

export const SubscriptionManager = ({ 
  subscribed = false, 
  subscriptionEnd = null,
  productId = null,
  onRefresh 
}: SubscriptionManagerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleManageSubscription = async () => {
    setIsLoading(true);
    
    try {
      // Se è un abbonamento crypto, mostra istruzioni diverse
      if (productId === 'crypto' || (typeof productId === 'object' && productId !== null && 'type' in productId && productId.type === 'crypto')) {
        toast({
          title: 'Abbonamento Crypto',
          description: 'Per modificare l\'abbonamento crypto, contatta il supporto o effettua un nuovo pagamento quando scade.',
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Apri il Customer Portal in una nuova finestra
        window.open(data.url, '_blank');
        
        toast({
          title: 'Reindirizzamento al portale clienti',
          description: 'Gestisci il tuo abbonamento nella nuova finestra',
        });
      }
    } catch (error: unknown) {
      console.error('Errore gestione abbonamento:', error);
      const errorMessage = error instanceof Error ? error.message : 'Impossibile accedere alla gestione abbonamento';
      toast({
        title: 'Errore',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isExpiringSoon = () => {
    if (!subscriptionEnd) return false;
    const endDate = new Date(subscriptionEnd);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Gestione Abbonamento
        </CardTitle>
        <CardDescription>
          Gestisci il tuo piano e le impostazioni di pagamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stato abbonamento */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <p className="font-medium">Stato abbonamento</p>
            <div className="flex items-center gap-2">
              <Badge variant={subscribed ? "default" : "secondary"}>
                {subscribed ? 'Attivo' : 'Non attivo'}
              </Badge>
              {subscribed && subscriptionEnd && (
                <Badge variant={isExpiringSoon() ? "destructive" : "outline"}>
                  {isExpiringSoon() && <AlertTriangle className="w-3 h-3 mr-1" />}
                  Scade il {formatDate(subscriptionEnd)}
                </Badge>
              )}
            </div>
          </div>
          
          <Button
            onClick={onRefresh}
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Azioni disponibili */}
        <div className="space-y-3">
          {subscribed ? (
            <>
              <Button
                onClick={handleManageSubscription}
                disabled={isLoading}
                className="w-full justify-between"
                variant="outline"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>
                    {productId === 'crypto' || (typeof productId === 'object' && productId !== null && 'type' in productId && productId.type === 'crypto') 
                      ? 'Info Abbonamento Crypto' 
                      : 'Gestisci Abbonamento'
                    }
                  </span>
                </div>
                <ExternalLink className="w-4 h-4" />
              </Button>
              
              <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                {productId === 'crypto' || (typeof productId === 'object' && productId !== null && 'type' in productId && productId.type === 'crypto') ? (
                  <>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Pagamento tramite criptovalute</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Rinnovo manuale richiesto alla scadenza</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      <span>Contatta supporto per modifiche</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Aggiorna metodo di pagamento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Modifica o cancella abbonamento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      <span>Scarica fatture e ricevute</span>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              <p>Nessun abbonamento attivo</p>
              <p className="text-sm">Sottoscrivi un piano per accedere a tutte le funzionalità</p>
            </div>
          )}
        </div>

        {/* Avviso scadenza */}
        {subscribed && isExpiringSoon() && (
          <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-destructive">Abbonamento in scadenza</h4>
              <p className="text-sm text-muted-foreground">
                Il tuo abbonamento scadrà il {formatDate(subscriptionEnd)}. 
                Gestisci il rinnovo dal portale clienti.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};