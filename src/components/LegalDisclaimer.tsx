import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Shield, FileText, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const LegalDisclaimer = () => {
  const [activeSection, setActiveSection] = useState<string>("risks");

  const sections = {
    risks: {
      title: "Avvertenza sui Rischi",
      icon: AlertTriangle,
      content: (
        <div className="space-y-4">
          <Alert className="border-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-semibold">
              AVVERTENZA IMPORTANTE: Il trading comporta un alto livello di rischio e non è adatto a tutti gli investitori.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Rischi Principali del Trading</h3>
            
            <div className="space-y-2 text-sm">
              <p className="font-medium text-destructive">• Le perdite possono superare il deposito iniziale</p>
              <p>• Il trading di CFD, Forex e strumenti derivati comporta un rischio elevato di perdite rapide dovuto alla leva finanziaria</p>
              <p>• I mercati finanziari sono volatili e imprevedibili</p>
              <p>• Le performance passate non garantiscono risultati futuri</p>
              <p>• Non investire mai denaro che non puoi permetterti di perdere</p>
            </div>

            <h3 className="font-semibold mt-4">Rischi della Tecnologia AI</h3>
            <div className="space-y-2 text-sm">
              <p>• Gli algoritmi AI possono produrre risultati imprevisti o errati</p>
              <p>• I segnali automatici non sostituiscono l'analisi e il giudizio personale</p>
              <p>• Possibili malfunzionamenti tecnici o interruzioni del servizio</p>
              <p>• L'intelligenza artificiale si basa su dati storici che potrebbero non riflettere condizioni future</p>
            </div>

            <h3 className="font-semibold mt-4">Percentuali di Perdita - Dati di Mercato</h3>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium text-destructive">
                Tra il 74% e l'89% dei conti degli investitori al dettaglio perde denaro quando negozia CFD.
              </p>
              <p className="text-xs mt-1">
                (Fonte: Dati medi broker europei regolamentati, conformi a MiFID II)
              </p>
            </div>
          </div>
        </div>
      )
    },
    
    services: {
      title: "Natura dei Servizi",
      icon: FileText,
      content: (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Cosa Offriamo</h3>
          
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium">Segnali di Trading AI</h4>
              <p>• Analisi automatizzata dei mercati finanziari tramite intelligenza artificiale</p>
              <p>• Suggerimenti di operazioni con parametri di ingresso, stop loss e take profit</p>
              <p>• Non costituiscono consulenza finanziaria personalizzata</p>
            </div>

            <div>
              <h4 className="font-medium">Expert Advisor (EA) per MT5</h4>
              <p>• Software per l'esecuzione automatica di operazioni su MetaTrader 5</p>
              <p>• L'utente mantiene il controllo completo del proprio conto di trading</p>
              <p>• Possibilità di disabilitare l'esecuzione automatica in qualsiasi momento</p>
            </div>

            <div>
              <h4 className="font-medium">Analisi di Mercato</h4>
              <p>• Informazioni sui mercati finanziari a scopo educativo</p>
              <p>• Notizie economiche e calendari degli eventi</p>
              <p>• Dati storici e statistiche di performance</p>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Importante:</strong> Tutti i servizi sono forniti a scopo informativo ed educativo. 
              Non costituiscono consulenza finanziaria, raccomandazioni di investimento o sollecitazione al trading.
            </AlertDescription>
          </Alert>
        </div>
      )
    },

    compliance: {
      title: "Conformità Normativa",
      icon: Shield,
      content: (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Conformità alle Normative</h3>
          
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium">Normativa Italiana (CONSOB)</h4>
              <p>• Servizio conforme alle disposizioni CONSOB sui servizi informativi finanziari</p>
              <p>• Non forniamo servizi di investimento soggetti ad autorizzazione</p>
              <p>• Rispetto delle normative sui disclaimer di rischio</p>
            </div>

            <div>
              <h4 className="font-medium">Direttiva MiFID II</h4>
              <p>• Conformità ai requisiti europei di trasparenza</p>
              <p>• Adeguata informativa sui rischi degli strumenti finanziari</p>
              <p>• Protezione degli investitori al dettaglio</p>
            </div>

            <div>
              <h4 className="font-medium">Tecnologia e AI</h4>
              <p>• Sviluppo conforme alle future normative UE sull'Intelligenza Artificiale</p>
              <p>• Trasparenza negli algoritmi utilizzati</p>
              <p>• Controllo umano sui processi automatizzati</p>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium">
              Non siamo un broker o intermediario finanziario autorizzato
            </p>
            <p className="text-xs mt-1">
              Per operare sui mercati, utilizza esclusivamente broker autorizzati CONSOB o da autorità UE equivalenti.
            </p>
          </div>
        </div>
      )
    },

    responsibilities: {
      title: "Responsabilità dell'Utente",
      icon: Users,
      content: (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Le Tue Responsabilità</h3>
          
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium">Prima di Iniziare</h4>
              <p>• Valuta la tua situazione finanziaria e i tuoi obiettivi di investimento</p>
              <p>• Comprendi i rischi associati al trading</p>
              <p>• Assicurati di avere esperienza e conoscenze adeguate</p>
              <p>• Consulta un consulente finanziario indipendente se necessario</p>
            </div>

            <div>
              <h4 className="font-medium">Durante l'Utilizzo</h4>
              <p>• Monitora costantemente le tue posizioni e il rischio</p>
              <p>• Non fare affidamento esclusivamente sui segnali automatici</p>
              <p>• Imposta sempre limiti di perdita appropriati</p>
              <p>• Opera solo con capitali che puoi permetterti di perdere</p>
            </div>

            <div>
              <h4 className="font-medium">Broker e Conti di Trading</h4>
              <p>• Scegli broker autorizzati e regolamentati</p>
              <p>• Verifica le condizioni contrattuali del tuo broker</p>
              <p>• Mantieni il controllo delle credenziali del tuo conto</p>
              <p>• Sei responsabile delle operazioni eseguite sul tuo conto</p>
            </div>
          </div>

          <Alert className="border-amber-500">
            <AlertDescription>
              <strong>Ricorda:</strong> Ogni decisione di trading è di tua esclusiva responsabilità. 
              I nostri servizi forniscono solo informazioni e strumenti di supporto.
            </AlertDescription>
          </Alert>
        </div>
      )
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Informazioni Legali e Disclaimer
          </CardTitle>
          <CardDescription className="text-center">
            Informazioni obbligatorie sui rischi e responsabilità - Leggere attentamente
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Navigation */}
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(sections).map(([key, section]) => {
              const Icon = section.icon;
              return (
                <Button
                  key={key}
                  variant={activeSection === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveSection(key)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {section.title}
                </Button>
              );
            })}
          </div>

          <Separator className="mb-6" />

          {/* Content */}
          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
            {sections[activeSection as keyof typeof sections].content}
          </ScrollArea>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</p>
            <p className="mt-1">
              Questi disclaimer sono conformi alla normativa italiana e europea vigente
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegalDisclaimer;