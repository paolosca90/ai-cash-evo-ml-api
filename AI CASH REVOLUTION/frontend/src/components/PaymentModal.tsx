import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowRight,
  CreditCard,
  Bitcoin,
  X,
  Check,
  Shield,
  Clock,
  Mail,
  User,
  Phone
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Funzione per generare QR code da una stringa
const generateQRCode = async (text: string): Promise<string> => {
  try {
    // Usiamo un servizio gratuito per generare QR code
    const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`);
    return response.url;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
};

interface PaymentModalProps {
  plan: {
    name: string;
    price: string;
    period: string;
    features: string[];
    popular: boolean;
    trialText: string;
  };
  isAnnual: boolean;
  trigger?: React.ReactNode;
}

export const PaymentModal = ({ plan, isAnnual, trigger }: PaymentModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'crypto'>('stripe');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [cryptoData, setCryptoData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verifying' | 'success' | 'failed'>('pending');
  const [verificationInterval, setVerificationInterval] = useState<NodeJS.Timeout | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    country: '',
    cryptoMethod: 'usdt'
  });

  // Mappa dei nomi dei piani con i piani di Supabase
  const planMapping: { [key: string]: string } = {
    'Essenziale': 'essenziale',
    'Professional': 'professional',
    'Enterprise': 'professional'
  };

  const defaultTrigger = (
    <Button
      className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
      variant={plan.popular ? 'default' : 'outline'}
    >
      {plan.name === 'Enterprise' ? 'Contattaci' : 'Scegli Piano'}
      <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  );

  const registerUserIfNeeded = async () => {
    try {
      // Controlla se l'utente è già autenticato
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        return user;
      }

      // Crea account automaticamente con password temporanea
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: tempPassword,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            country: formData.country
          }
        }
      });

      if (signUpError && signUpError.message !== 'User already registered') {
        throw signUpError;
      }

      // Invia email di benvenuto con credenziali
      if (signUpData.user) {
        // Qui potresti chiamare una funzione per inviare email con le credenziali
        console.log('Utente registrato con successo:', signUpData.user.email);
      }

      return signUpData.user;
    } catch (error: any) {
      console.error('Errore registrazione utente:', error);
      throw error;
    }
  };

  const handleStripePayment = async () => {
    if (!formData.email || !formData.fullName) {
      toast.error('Compila tutti i campi richiesti');
      return;
    }

    setIsLoading(true);

    try {
      // Registra l'utente se necessario
      await registerUserIfNeeded();

      // Mappa il nome del piano al piano di Supabase
      const supabasePlan = planMapping[plan.name];
      if (!supabasePlan) {
        throw new Error('Piano non valido');
      }

      // Chiama la funzione create-checkout di Supabase
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: supabasePlan }
      });

      if (error) {
        throw error;
      }

      // Reindirizza al checkout di Stripe
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL del checkout non ricevuto');
      }

    } catch (error: any) {
      console.error('Errore durante il checkout:', error);
      toast.error(error.message || 'Errore durante l\'inizializzazione del pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  const startPaymentVerification = async () => {
    if (!cryptoData) return;

    setIsVerifying(true);
    setVerificationStatus('verifying');

    // Genera un request ID unico per questa transazione
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    try {
      // Chiama la funzione di verifica
      const { data, error } = await supabase.functions.invoke('verify-crypto-payment', {
        body: {
          requestId: requestId,
          paymentAmount: cryptoData.amountFormatted.replace(/[^\d.]/g, ''),
          paymentCurrency: cryptoData.tokenInfo.symbol,
          recipientAddress: cryptoData.recipient
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setVerificationStatus('success');
        toast.success('Pagamento verificato! Sottoscrizione attivata.');

        // Ferma il polling
        if (verificationInterval) {
          clearInterval(verificationInterval);
          setVerificationInterval(null);
        }

        // Chiudi il modale dopo 2 secondi
        setTimeout(() => {
          setIsOpen(false);
          // Potrebbe reindirizzare a una pagina di successo
          window.location.href = '/dashboard';
        }, 2000);

      } else {
        // Continua il polling se il pagamento non è ancora trovato
        console.log('Pagamento non ancora trovato, riprovo tra 30 secondi...');
      }

    } catch (error: any) {
      console.error('Errore verifica pagamento:', error);
      // Non mostriamo errore all'utente, potrebbe essere solo che il pagamento non è ancora confermato
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCryptoPayment = async () => {
    if (!formData.email || !formData.fullName) {
      toast.error('Compila tutti i campi richiesti');
      return;
    }

    setIsLoading(true);

    try {
      // Registra l'utente se necessario
      await registerUserIfNeeded();

      // Chiama la funzione per creare QR code crypto
      const { data, error } = await supabase.functions.invoke('create-payment-qr', {
        body: {
          paymentType: 'crypto',
          planName: plan.name,
          amount: plan.price,
          isAnnual: isAnnual,
          selectedToken: formData.cryptoMethod.toUpperCase()
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        // Genera QR code
        const qrUrl = await generateQRCode(data.paymentString);
        setQrCodeUrl(qrUrl);
        setCryptoData(data);
        toast.success('QR code generato con successo');

        // Avvia il polling per la verifica automatica
        // Inizia dopo 1 minuto, poi controlla ogni 30 secondi
        setTimeout(() => {
          startPaymentVerification();
          const interval = setInterval(startPaymentVerification, 30000); // Ogni 30 secondi
          setVerificationInterval(interval);
        }, 60000); // Aspetta 1 minuto prima di iniziare

      } else {
        throw new Error('Impossibile generare QR code');
      }

    } catch (error: any) {
      console.error('Errore durante il pagamento crypto:', error);
      toast.error(error.message || 'Errore durante la generazione del QR code');
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup del polling quando il modale si chiude
  useEffect(() => {
    return () => {
      if (verificationInterval) {
        clearInterval(verificationInterval);
      }
    };
  }, [verificationInterval]);

  if (plan.name === 'Enterprise') {
    return (
      <div onClick={() => setIsOpen(true)} className="cursor-pointer">
        {trigger || defaultTrigger}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Piano Enterprise</DialogTitle>
              <DialogDescription>
                Contattaci per una consulenza personalizzata
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto text-primary mb-2" />
                <p className="text-sm text-muted-foreground">
                  Invia una email a:
                </p>
                <a
                  href="mailto:info@ai-cash-revolution.com?subject=Richiesta%20Piano%20Enterprise"
                  className="text-primary font-medium hover:underline"
                >
                  info@ai-cash-revolution.com
                </a>
              </div>
              <Button onClick={() => setIsOpen(false)} className="w-full">
                Chiudi
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer">
          {trigger || defaultTrigger}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Completa l'acquisto - {plan.name}
          </DialogTitle>
          <DialogDescription>
            Piano {plan.name} - €{plan.price}{plan.period}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Riepilogo Piano */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{plan.name}</span>
                <Badge variant={plan.popular ? "default" : "secondary"}>
                  {plan.popular ? 'Più Popolare' : 'Standard'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-primary mb-2">
                €{plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="text-sm space-y-1">
                {plan.features.slice(0, 3).map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Form Dati Utente */}
          <div className="space-y-4">
            <h3 className="font-medium">Dati Personali</h3>

            <div className="space-y-3">
              <div>
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  placeholder="Mario Rossi"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mario.rossi@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+39 333 1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="country">Paese</Label>
                <Select value={formData.country} onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona paese" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT">🇮🇹 Italia</SelectItem>
                    <SelectItem value="FR">🇫🇷 Francia</SelectItem>
                    <SelectItem value="DE">🇩🇪 Germania</SelectItem>
                    <SelectItem value="ES">🇪🇸 Spagna</SelectItem>
                    <SelectItem value="GB">🇬🇧 Regno Unito</SelectItem>
                    <SelectItem value="US">🇺🇸 Stati Uniti</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Compliance Checkboxes - Obbligatorio per normativa italiana */}
          <div className="space-y-4">
            <h3 className="font-medium">📋 Dichiarazione di Presa Visione dei Rischi</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              <div className="text-sm">
                <p className="font-semibold text-yellow-800 mb-2">⚠️ AVVISO FONDAMENTALE:</p>
                <p className="text-yellow-700">
                  I segnali forniti sono strumenti di analisi tecnica e <strong>NON costituiscono consigli di investimento</strong>,
                  garanzie di profitto o raccomandazioni finanziarie.
                </p>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-yellow-800">⚠️ RISCHIO ELEVATO:</p>
                <p className="text-yellow-700">
                  Il trading comporta il rischio di perdita totale del capitale investito e non è adatto a tutti gli investitori.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  required
                />
                <span>
                  Ho letto e compreso l'avviso sui rischi finanziari e accetto che i segnali NON sono consigli di investimento
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  required
                />
                <span>
                  Sono consapevole del rischio di perdita totale del capitale e opero solo con fondi che mi posso permettere di perdere
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  required
                />
                <span>
                  Ho più di 18 anni, capacità giuridica piena e comprensione dei rischi del trading
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  required
                />
                <span>
                  Autorizzo il trattamento dei miei dati personali ai sensi del GDPR (Privacy Policy)
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-muted-foreground">
                  Desidero ricevere newsletter e materiale formativo (opzionale)
                </span>
              </label>
            </div>
          </div>

          {/* Scelta Metodo Pagamento */}
          <div className="space-y-4">
            <h3 className="font-medium">Metodo di Pagamento</h3>

            <Tabs value={selectedPaymentMethod} onValueChange={(value) => setSelectedPaymentMethod(value as 'stripe' | 'crypto')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stripe" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Carta di Credito
                </TabsTrigger>
                <TabsTrigger value="crypto" className="flex items-center gap-2">
                  <Bitcoin className="w-4 h-4" />
                  Criptovalute
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stripe" className="space-y-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <span className="font-medium">Pagamento Sicuro con Stripe</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>Pagamento 100% sicuro</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Attivazione immediata</span>
                      </div>
                      <p className="text-xs">Accettiamo: Visa, Mastercard, American Express</p>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleStripePayment}
                  disabled={isLoading || !formData.email || !formData.fullName}
                  className="w-full"
                >
                  {isLoading ? 'Elaborazione...' : `Paga €${plan.price} con Carta`}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </TabsContent>

              <TabsContent value="crypto" className="space-y-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Bitcoin className="w-5 h-5 text-primary" />
                      <span className="font-medium">Pagamento in Criptovalute</span>
                    </div>
                    <div className="space-y-3">
                      <Select value={formData.cryptoMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, cryptoMethod: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona criptovaluta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="usdt">Tether (USDT)</SelectItem>
                          <SelectItem value="usdc">USD Coin (USDC)</SelectItem>
                        </SelectContent>
                      </Select>

                      {qrCodeUrl && cryptoData && (
                        <div className="space-y-4 mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                          <div className="text-center">
                            <p className="text-sm font-medium mb-2">
                              {verificationStatus === 'success' ? '✅ Pagamento Verificato!' : 'QR Code per il pagamento'}
                            </p>
                            <div className="flex justify-center mb-3">
                              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 border-2 border-border rounded-lg" />
                            </div>
                            <div className="text-xs space-y-1">
                              <p className="font-medium">{cryptoData.tokenInfo.symbol} - {cryptoData.tokenInfo.name}</p>
                              <p>Importo: {cryptoData.amountFormatted}</p>
                              <p className="font-mono text-xs break-all mt-2 p-2 bg-background rounded border">
                                Wallet: {cryptoData.recipient}
                              </p>
                              <p className="text-muted-foreground">
                                Scade: {new Date(cryptoData.expiresAt).toLocaleString('it-IT')}
                              </p>
                            </div>

                            {/* Stato verifica */}
                            {verificationStatus !== 'pending' && (
                              <div className="mt-3 p-3 rounded text-xs">
                                {verificationStatus === 'verifying' && (
                                  <div className="flex items-center justify-center gap-2 text-blue-600">
                                    <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                    <span>Verifica pagamento in corso...</span>
                                  </div>
                                )}
                                {verificationStatus === 'success' && (
                                  <div className="text-green-600 font-medium">
                                    ✅ Pagamento verificato! Accesso attivato.
                                  </div>
                                )}
                                {verificationStatus === 'failed' && (
                                  <div className="text-red-600">
                                    ❌ Verifica fallita. Contatta il supporto.
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                              <p className="text-yellow-800">
                                <strong>Attenzione:</strong> Invia l'importo esatto tramite rete ERC20.
                                {verificationStatus === 'verifying' ? ' Verifica automatica in corso...' : ' Verifica automatica entro 1-3 minuti dopo il pagamento.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!qrCodeUrl && (
                        <p className="text-xs text-muted-foreground">
                          Il QR code verrà generato istantaneamente dopo la conferma
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleCryptoPayment}
                  disabled={isLoading || !formData.email || !formData.fullName}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? 'Generazione QR...' : qrCodeUrl ? 'QR Code Generato' : `Paga €${plan.price} con Crypto`}
                  <Bitcoin className="w-4 h-4 ml-2" />
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          <div className="text-center text-xs text-muted-foreground space-y-2">
            <p>🔒 Protezione dei dati conforme a GDPR Art. 6</p>
            <div className="flex justify-center gap-4">
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link to="/legal" className="text-primary hover:underline">
                Termini e Condizioni
              </Link>
              <span>•</span>
              <Link to="/legal#disclaimer" className="text-primary hover:underline">
                Disclaimer Finanziario
              </Link>
            </div>
            <p className="text-xs">
              Autorizzazione CONSOB per servizi di segnalazione non finanziaria
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};