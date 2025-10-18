import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Monitor, Mail, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface MT5Account {
  id: string;
  account_number: string;
  account_name?: string;
  server_name?: string;
  is_active: boolean;
  last_heartbeat: string;
  ea_version?: string;
}

const MT5Setup = () => {
  const [mt5Account, setMT5Account] = useState<MT5Account | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Ottieni dati utente
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        
        // Ottieni profilo per email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single();
        
        if (profile?.email) {
          setUserEmail(profile.email);
        }
      }

      // Ottieni conto MT5 se presente
      const { data: mt5Data } = await supabase
        .from('mt5_accounts')
        .select('*')
        .single();

      if (mt5Data) {
        setMT5Account(mt5Data);
      }
    } catch (error: unknown) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadEA = () => {
    // Crea link per download
    const link = document.createElement('a');
    link.href = '/mt5-expert/AI_Cash_Revolution_EA.mq5';
    link.download = 'AI_Cash_Revolution_EA.mq5';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download Avviato",
      description: "Expert Advisor scaricato. Segui le istruzioni per installarlo.",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Setup MT5</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Caricamento...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stato connessione MT5 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Stato Connessione MT5
          </CardTitle>
          <CardDescription>
            Stato della connessione tra il tuo MT5 e il sistema AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mt5Account ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Conto MT5:</span>
                <Badge variant="default">{mt5Account.account_number}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Stato:</span>
                <Badge variant={mt5Account.is_active ? "default" : "secondary"}>
                  {mt5Account.is_active ? "Attivo" : "Inattivo"}
                </Badge>
              </div>
              {mt5Account.server_name && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Server:</span>
                  <span className="text-sm text-muted-foreground">{mt5Account.server_name}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-medium">Ultimo heartbeat:</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(mt5Account.last_heartbeat).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Nessun conto MT5 collegato. Configura l'Expert Advisor per iniziare.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Istruzioni semplificate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Setup Semplificato
          </CardTitle>
          <CardDescription>
            Configura il tuo Expert Advisor in 3 semplici passi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Passo 1 */}
          <div className="border-l-4 border-primary pl-4">
            <h3 className="font-semibold text-lg mb-2">1. Scarica Expert Advisor</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Scarica il file .mq5 e installalo nel tuo MT5
            </p>
            <Button 
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/AI_Cash_Revolution_EA-2.ex5';
                link.download = 'AI_Cash_Revolution_EA-2.ex5';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                toast({
                  title: "Download Avviato",
                  description: "Expert Advisor scaricato. Segui le istruzioni per installarlo.",
                });
              }}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Scarica AI_Cash_Revolution_EA.ex5
            </Button>
          </div>

          {/* Passo 2 */}
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold text-lg mb-2">2. Setup MetaTrader 5</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <div>
                <p className="font-medium text-foreground mb-1">Se non hai MT5:</p>
                <p>• Scarica da <a href="https://www.metatrader5.com/it/download" target="_blank" className="text-primary underline">metatrader5.com</a></p>
                <p>• Fai login con il tuo conto broker</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Installa l'EA:</p>
                <p>• Apri MetaTrader 5</p>
                <p>• Vai su File → Apri cartella dati</p>
                <p>• Naviga in MQL5 → Experts</p>
                <p>• Copia il file .ex5 scaricato nella cartella Experts</p>
                <p>• Riavvia MT5</p>
              </div>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold text-lg mb-2">3. Configura l'EA</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• Trascina l'EA sul grafico</p>
              <p>• Nella finestra di configurazione, inserisci:</p>
              <div className="bg-muted p-3 rounded-lg mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  <span className="font-medium">UserEmail:</span>
                </div>
                <code className="text-sm bg-background px-2 py-1 rounded">
                  {userEmail || "tua-email@esempio.com"}
                </code>
                <p className="text-xs mt-1 text-muted-foreground">
                  ⚠️ OBBLIGATORIO: Usa la stessa email con cui ti sei registrato
                </p>
              </div>
              <p>• Abilita "Consenti trading automatico"</p>
              <p>• Clicca OK per attivare</p>
            </div>
          </div>

          {/* Avvisi importanti */}
          <Alert>
            <AlertDescription>
              <strong>Importante:</strong> L'EA può essere utilizzato su un solo conto MT5 per volta. 
              Se lo attivi su un nuovo conto, quello precedente verrà automaticamente disattivato.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default MT5Setup;