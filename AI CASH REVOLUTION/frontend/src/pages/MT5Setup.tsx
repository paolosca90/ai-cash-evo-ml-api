import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Download, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Monitor, 
  Wifi,
  Shield,
  Zap,
  FileText,
  ExternalLink,
  Copy,
  Play
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const MT5Setup = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auth guard
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const loggedIn = !!session?.user;
      setIsAuthenticated(loggedIn);
      if (!loggedIn) {
        navigate("/login", { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const loggedIn = !!session?.user;
      setIsAuthenticated(loggedIn);
      if (!loggedIn) {
        navigate("/login", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!isAuthenticated) return null;

  const handleDownloadEA = async (fileType: 'source' | 'compiled') => {
    try {
      const fileName = fileType === 'compiled' ? 'AI_Cash_Revolution_EA_DISTRIBUTION.ex5' : 'AI_Cash_Revolution_EA_DISTRIBUTION.mq5';
      const filePath = `/${fileName}`;

      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error('EA file not found');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "✅ Download Completato",
        description: `${fileType === 'compiled' ? 'File compilato' : 'Codice sorgente'} scaricato con successo!`,
      });
    } catch (error) {
      toast({
        title: "❌ Errore Download",
        description: "File non trovato. Contatta il supporto tecnico.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "📋 Copiato!",
      description: "Testo copiato negli appunti",
    });
  };

  const steps = [
    {
      id: 1,
      title: "Download Expert Advisor",
      icon: Download,
      description: "Scarica l'EA sul tuo computer"
    },
    {
      id: 2,
      title: "Configurazione MT5",
      icon: Settings,
      description: "Configura MetaTrader 5"
    },
    {
      id: 3,
      title: "Installazione EA",
      icon: Monitor,
      description: "Installa l'Expert Advisor"
    },
    {
      id: 4,
      title: "Test & Attivazione",
      icon: Play,
      description: "Attiva il trading automatico"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            🤖 Setup MetaTrader 5
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto px-2">
            Connetti il tuo conto MetaTrader 5 per ricevere automaticamente i segnali AI 
            e far eseguire i trade dal nostro sistema intelligente.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-6 sm:mb-8 overflow-x-auto pb-2">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-max px-4">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div 
                  className={`flex items-center space-x-1 sm:space-x-2 cursor-pointer transition-all duration-200 ${
                    activeStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  onClick={() => setActiveStep(step.id)}
                >
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                    activeStep >= step.id 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : 'border-muted-foreground'
                  }`}>
                    {activeStep > step.id ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <step.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>
                  <div className="hidden lg:block">
                    <div className="font-medium text-sm">{step.title}</div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-6 sm:w-12 h-0.5 transition-all duration-200 ${
                    activeStep > step.id ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeStep.toString()} onValueChange={(value) => setActiveStep(parseInt(value))}>
          {/* Step 1: Download EA */}
          <TabsContent value="1" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-6 h-6" />
                  Step 1: Download Expert Advisor
                </CardTitle>
                <CardDescription>
                  Scarica l'Expert Advisor che si collegherà automaticamente al nostro sistema AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold">🚀 AI Cash Revolution EA</h3>
                    <ul className="space-y-2 text-xs sm:text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        <span>Trading automatico basato su AI</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        <span>Gestione rischio avanzata</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        <span>Connessione sicura al server</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        <span>Notifiche push integrate</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4">
                    <Alert>
                      <Shield className="w-4 h-4" />
                      <AlertDescription className="text-xs sm:text-sm">
                        <strong>Sicurezza Garantita:</strong> L'EA utilizza connessiones criptate 
                        e non accede mai ai tuoi dati personali o password di trading.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold text-xs sm:text-sm">Download Expert Advisor:</h4>
                      
                      {/* Compiled Version - Only Option */}
                      <div className="border rounded-lg p-3 sm:p-4 bg-gradient-to-r from-primary/5 to-primary/10">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Badge variant="default" className="text-xs">Pronto all'uso</Badge>
                            <span className="font-medium text-xs sm:text-sm truncate">Expert Advisor (.ex5)</span>
                          </div>
                          <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Installazione semplificata - Basta un doppio click!
                        </p>
                        <Button 
                          onClick={() => handleDownloadEA('compiled')}
                          className="w-full" 
                          size="sm"
                        >
                          <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          <span className="text-xs sm:text-sm">Scarica Expert Advisor</span>
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Versione: 1.0 • Ultima modifica: {new Date().toLocaleDateString('it-IT')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 2: MT5 Configuration */}
          <TabsContent value="2" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-6 h-6" />
                  Step 2: Configurazione MetaTrader 5
                </CardTitle>
                <CardDescription>
                  Configura MT5 per permettere il trading automatico e le connessioni web
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Wifi className="w-5 h-5" />
                      1. Abilita WebRequest
                    </h3>
                    <div className="bg-muted p-4 rounded-lg space-y-3">
                      <p className="text-sm">
                        1. Apri MetaTrader 5<br/>
                        2. Vai su <strong>Strumenti → Opzioni → Expert Advisors</strong><br/>
                        3. Nella sezione "WebRequest", aggiungi questo URL:
                      </p>
                      <div className="flex items-center gap-2 bg-background p-2 rounded border">
                        <code className="flex-1 text-sm">https://rvopmdflnecyrwrzhyfy.supabase.co</code>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyToClipboard('https://rvopmdflnecyrwrzhyfy.supabase.co')}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      2. Abilita Trading Automatico
                    </h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm">
                        Nella stessa finestra <strong>Strumenti → Opzioni → Expert Advisors</strong>, 
                        assicurati che siano abilitati:
                      </p>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>✅ "Consenti trading automatico"</li>
                        <li>✅ "Consenti import di DLL"</li>
                        <li>✅ "Consenti WebRequest per URL elencati"</li>
                      </ul>
                    </div>
                  </div>

                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Importante:</strong> Dopo aver aggiunto l'URL, riavvia MetaTrader 5 
                      per applicare le modifiche.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 3: EA Installation */}
          <TabsContent value="3" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-6 h-6" />
                  Step 3: Installazione Expert Advisor
                </CardTitle>
                <CardDescription>
                  Installa e compila l'EA nel tuo MetaTrader 5
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">📁 Installazione EA</h3>
                    
                    <Tabs defaultValue="compiled" className="space-y-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="compiled">File Compilato (.ex5)</TabsTrigger>
                        <TabsTrigger value="source">Codice Sorgente (.mq5)</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="compiled" className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg space-y-3">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Installazione Automatica</span>
                          </div>
                          <p className="text-sm">
                            <strong>Metodo semplice:</strong> Fai doppio click sul file <code>AI_Cash_Revolution_EA_DISTRIBUTION.ex5</code> scaricato.
                            MetaTrader 5 si aprirà automaticamente e installerà l'Expert Advisor.
                          </p>
                          <Alert>
                            <CheckCircle className="w-4 h-4" />
                            <AlertDescription>
                              <strong>Nota:</strong> Non è necessario copiare manualmente il file in nessuna cartella. 
                              Il doppio click gestisce tutto automaticamente!
                            </AlertDescription>
                          </Alert>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="source" className="space-y-4">
                        <Alert className="bg-destructive/10 border-destructive/20">
                          <AlertTriangle className="w-4 h-4" />
                          <AlertDescription>
                            <strong>Solo per sviluppatori esperti:</strong> Il file sorgente richiede 
                            conoscenze avanzate di MQL5 e non è supportato dall'assistenza tecnica standard.
                          </AlertDescription>
                        </Alert>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <Alert>
                    <CheckCircle className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Successo!</strong> Se la compilazione è andata a buon fine, 
                      l'EA apparirà nella sezione "Expert Advisors" del Navigatore di MT5.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 4: Test & Activation */}
          <TabsContent value="4" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-6 h-6" />
                  Step 4: Test & Attivazione
                </CardTitle>
                <CardDescription>
                  Attiva l'EA e testa la connessione con il nostro sistema AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">🎯 Attivazione EA</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <ol className="text-sm space-y-2">
                        <li>1. Trascina <strong>AI_Cash_Revolution_EA</strong> su un grafico (es. EURUSD)</li>
                        <li>2. Nella finestra parametri, configura:</li>
                        <ul className="ml-4 mt-2 space-y-1 text-xs">
                          <li>• <strong>ClientID:</strong> Inserisci un ID univoco (es. "TuoNome_001")</li>
                          <li>• <strong>MaxRiskPercent:</strong> 2.0 (massimo 2% del conto per trade)</li>
                          <li>• <strong>EnableTrading:</strong> true (per trading automatico)</li>
                          <li>• <strong>EnableNotifications:</strong> true (per notifiche)</li>
                        </ul>
                        <li>3. Clicca <strong>OK</strong> per attivare</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">📊 Verifica Connessione</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm mb-2">
                        Nella scheda <strong>"Esperti"</strong> di MT5 dovresti vedere:
                      </p>
                      <div className="bg-background p-3 rounded border space-y-1">
                        <div className="text-xs text-green-600">🤖 AI Cash Revolution EA - Inizializzazione...</div>
                        <div className="text-xs text-blue-600">✅ AI Cash Revolution EA inizializzato con successo</div>
                        <div className="text-xs text-gray-600">📡 Server: https://rvopmdflnecyrwrzhyfy.supabase.co/...</div>
                        <div className="text-xs text-gray-600">📡 Polling segnali da: ...</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">🧪 Test del Sistema</h3>
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border">
                      <p className="text-sm mb-3">
                        <strong>Ora sei pronto!</strong> Torna alla pagina di trading e:
                      </p>
                      <ol className="text-sm space-y-1">
                        <li>1. Inserisci un importo da rischiare (es. €50)</li>
                        <li>2. Clicca "Esegui Trade su MT5"</li>
                        <li>3. L'EA riceverà automaticamente il segnale</li>
                        <li>4. Vedrai l'esecuzione del trade nei log MT5</li>
                      </ol>
                      
                      <div className="mt-4">
                        <Button asChild>
                          <a href="/">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Vai alla Pagina Trading
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button 
            variant="outline" 
            onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
            disabled={activeStep === 1}
          >
            ← Precedente
          </Button>
          
          <Button 
            onClick={() => setActiveStep(Math.min(4, activeStep + 1))}
            disabled={activeStep === 4}
          >
            Successivo →
          </Button>
        </div>

        {/* Support Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Serve Aiuto?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">📞 Supporto Tecnico</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Se hai problemi con l'installazione o la configurazione, il nostro team 
                  è disponibile per assisterti.
                </p>
                <Button variant="outline" size="sm">
                  Contatta Supporto
                </Button>
              </div>
              <div>
                <h4 className="font-semibold mb-2">📚 Documentazione</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Consulta la documentazione completa per troubleshooting avanzato 
                  e configurazioni personalizzate.
                </p>
                <Button variant="outline" size="sm">
                  Vai alla Docs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MT5Setup;