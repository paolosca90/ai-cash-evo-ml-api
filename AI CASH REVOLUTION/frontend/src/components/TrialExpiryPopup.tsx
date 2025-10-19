import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Crown,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap,
  TrendingUp,
  Calendar,
  CreditCard,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface TrialExpiryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
}

const TrialExpiryPopup = ({ isOpen, onClose, userProfile }: TrialExpiryPopupProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });
      setPlans(plansData || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const isExpired = () => {
    if (!userProfile?.subscription_expires_at) return false;
    return new Date(userProfile.subscription_expires_at) < new Date();
  };

  const getDaysUntilExpiry = () => {
    if (!userProfile?.subscription_expires_at) return 0;
    const expiryDate = new Date(userProfile.subscription_expires_at);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysUntilExpiry);
  };

  const handleUpgrade = async (planType: string) => {
    setLoading(true);
    try {
      // Navigate to payment setup with selected plan
      navigate('/payment-setup', { state: { selectedPlan: planType } });
      onClose();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile procedere con l'upgrade. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const daysLeft = getDaysUntilExpiry();
  const expired = isExpired();
  const isTrial = userProfile?.subscription_status === 'trial';

  // Get recommended plan (professional) with real pricing
  const recommendedPlan = plans.find(p => p.plan_type === 'professional');
  const currentPlan = plans.find(p => p.plan_type === userProfile?.subscription_plan);

  // Parse features from JSON
  const parseFeatures = (featuresJson: string | null) => {
    try {
      return featuresJson ? JSON.parse(featuresJson) : [];
    } catch {
      return [];
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-full ${
              expired
                ? 'bg-red-100 text-red-600'
                : daysLeft <= 3
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-yellow-100 text-yellow-600'
            }`}>
              {expired ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <Clock className="w-8 h-8" />
              )}
            </div>
          </div>

          <DialogTitle className="text-2xl font-bold">
            {expired
              ? '⚠️ Prova Gratuita Scaduta'
              : isTrial
                ? `🎯 La tua prova scade in ${daysLeft} giorni`
                : '⚠️ Abbonamento in Scadenza'
            }
          </DialogTitle>

          <DialogDescription className="text-base mt-2">
            {expired
              ? 'Il tuo periodo di prova di 7 giorni è terminato. Scegli un piano per continuare a usare AI Cash Revolution.'
              : daysLeft <= 3
                ? 'Il tuo periodo di prova sta per scadere. Non perdere l\'accesso alle funzionalità premium!'
                : 'Approfitta dell\'offerta speciale per passare a un piano premium.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Periodo di prova</span>
            <span>{expired ? 'Scaduto' : `${daysLeft} giorni rimanenti`}</span>
          </div>
          <Progress
            value={expired ? 100 : Math.max(0, 100 - (daysLeft / 7 * 100))}
            className={`h-2 ${expired ? 'bg-red-100' : daysLeft <= 3 ? 'bg-orange-100' : 'bg-yellow-100'}`}
          />
        </div>

        {/* Current limitations */}
        {expired && (
          <Card className="mt-4 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Accesso Limitato - Solo Piano Essenziale</span>
              </div>
              <ul className="text-sm text-red-600 space-y-1">
                <li>• Solo {currentPlan?.max_signals_per_day || 1} segnale al giorno</li>
                <li>• Expert Advisor MT5 {currentPlan?.can_download_ea ? 'incluso' : 'non disponibile'}</li>
                <li>• Analisi ML {currentPlan?.can_access_premium_features ? 'avanzate' : 'di base'}</li>
                <li>• Supporto email standard</li>
                <li>• Nessuna personalizzazione</li>
              </ul>
              <div className="mt-2 text-xs text-red-600 font-medium">
                Upgrade al piano Professional per riattivare tutte le funzionalità premium!
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommended Plan */}
        {recommendedPlan && (
          <Card className="mt-4 border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground">
                    PIÙ POPOLARE
                  </Badge>
                  <h3 className="font-bold text-lg">{recommendedPlan.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    €{recommendedPlan?.price_monthly || '97.00'}
                  </div>
                  <div className="text-sm text-muted-foreground">/mese</div>
                  {recommendedPlan?.price_annual && recommendedPlan.price_annual > 0 && (
                    <div className="text-xs text-green-600">
                      Risparmia €{((recommendedPlan.price_monthly * 12) - recommendedPlan.price_annual).toFixed(2)} all'anno
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {recommendedPlan?.description || 'Piano avanzato con segnali illimitati e ML'}
              </p>

              <div className="space-y-2 mb-4">
                {recommendedPlan?.features ?
                  parseFeatures(recommendedPlan.features).map((feature: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))
                  : (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{recommendedPlan?.max_signals_per_day === 999 ? 'Segnali illimitati' : `${recommendedPlan?.max_signals_per_day || 999} segnali/giorno`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Expert Advisor MT5 {recommendedPlan?.can_download_ea ? 'incluso' : 'non disponibile'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Analisi ML avanzate {recommendedPlan?.can_access_premium_features ? 'incluse' : 'non disponibili'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Supporto prioritario</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Trading automatico</span>
                      </div>
                    </>
                  )
                }
              </div>

              <Button
                onClick={() => handleUpgrade('professional')}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <Crown className="w-4 h-4 mr-2" />
                {loading ? 'Caricamento...' : 'Scegli Piano Professional'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Alternative Plans */}
        <div className="mt-4 grid grid-cols-1 gap-3">
          {plans
            .filter(plan => plan.plan_type !== 'professional' && plan.plan_type !== 'essenziale')
            .map((plan) => (
              <Card key={plan.plan_type} className="border border-gray-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{plan.name}</h4>
                    <div className="text-right">
                      <div className="font-bold">€{plan.price_monthly}</div>
                      <div className="text-xs text-muted-foreground">/mese</div>
                      {plan.price_annual && plan.price_annual > 0 && (
                        <div className="text-xs text-green-600">
                          Risparmia €{((plan.price_monthly * 12) - plan.price_annual).toFixed(2)}/anno
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{plan.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpgrade(plan.plan_type)}
                    disabled={loading}
                    className="w-full"
                  >
                    <CreditCard className="w-3 h-3 mr-1" />
                    Scegli {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))
          }

          {/* Show current plan limitations if on essenziale */}
          {userProfile?.subscription_plan === 'essenziale' && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-orange-800">Piano Attuale: Essenziale</h4>
                  <div className="text-right">
                    <div className="font-bold text-orange-800">€{currentPlan?.price_monthly || '29.99'}</div>
                    <div className="text-xs text-muted-foreground">/mese</div>
                  </div>
                </div>
                <div className="text-xs text-orange-700 space-y-1">
                  <div>• {currentPlan?.max_signals_per_day || 1} segnale al giorno</div>
                  <div>• {currentPlan?.can_download_ea ? 'EA incluso' : 'EA non disponibile'}</div>
                  <div>• Supporto email base</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
          {!expired && (
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Forse più tardi
            </Button>
          )}
          <Button
            variant="default"
            onClick={() => navigate('/payment-setup')}
            className="w-full sm:w-auto"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Vedi Tutti i Piani
          </Button>
        </DialogFooter>

        {/* Trust indicators */}
        <div className="mt-4 pt-4 border-t text-center">
          <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Cancellazione gratuita</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Upgrade in qualsiasi momento</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Supporto 24/7</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrialExpiryPopup;