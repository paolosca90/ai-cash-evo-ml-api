import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Shield, Mail, Phone, MapPin, Clock, Database, Users, Lock } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Privacy Policy
          </CardTitle>
          <p className="text-center text-muted-foreground mt-2">
            Informativa sul trattamento dei dati personali ai sensi del GDPR
          </p>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-[600px] w-full rounded-md border p-6">
            <div className="space-y-8">
              
              {/* Titolare del Trattamento */}
              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  1. Titolare del Trattamento
                </h2>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p><strong>Ragione Sociale:</strong> Trading R-evolution</p>
                  <p><strong>Partita IVA:</strong> 04958630750</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span><strong>Sede Legale:</strong> Via Massimo D'Azeglio 25, Trepuzzi (LE)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span><strong>Email:</strong> privacy@tradingrevolution.it</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span><strong>Telefono:</strong> +39 XXX XXX XXXX</span>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Tipologie di Dati */}
              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Database className="w-6 h-6 text-primary" />
                  2. Tipologie di Dati Raccolti
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Dati forniti volontariamente:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                      <li>Nome, cognome, email (registrazione account)</li>
                      <li>Informazioni di contatto</li>
                      <li>Preferenze di trading e profilo di rischio</li>
                      <li>Dati relativi al conto MetaTrader 5 (numero conto, broker)</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Dati raccolti automaticamente:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                      <li>Indirizzo IP e dati di navigazione</li>
                      <li>Informazioni su dispositivo e browser</li>
                      <li>Cookie tecnici e di funzionalità</li>
                      <li>Log di accesso e utilizzo della piattaforma</li>
                      <li>Dati di performance dei segnali AI</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Dati NON raccolti:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                      <li>Credenziali di accesso ai broker</li>
                      <li>Informazioni bancarie o carte di credito</li>
                      <li>Dati sensibili (religione, orientamento politico, ecc.)</li>
                    </ul>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Finalità del Trattamento */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">3. Finalità del Trattamento</h2>
                
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold">Erogazione dei servizi (Base giuridica: Contratto)</h3>
                    <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                      <li>Fornitura di segnali di trading AI</li>
                      <li>Gestione account utente e autenticazione</li>
                      <li>Configurazione Expert Advisor MT5</li>
                      <li>Analisi di mercato e notifiche</li>
                    </ul>
                  </div>
                  
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold">Miglioramento servizi (Base giuridica: Interesse legittimo)</h3>
                    <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                      <li>Ottimizzazione algoritmi AI</li>
                      <li>Analisi performance e statistiche</li>
                      <li>Sviluppo nuove funzionalità</li>
                      <li>Ricerca e sviluppo</li>
                    </ul>
                  </div>
                  
                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-semibold">Obblighi legali (Base giuridica: Obbligo di legge)</h3>
                    <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                      <li>Conformità normativa CONSOB e MiFID II</li>
                      <li>Conservazione documentale</li>
                      <li>Adempimenti fiscali</li>
                      <li>Prevenzione frodi e riciclaggio</li>
                    </ul>
                  </div>
                  
                  <div className="border-l-4 border-amber-500 pl-4">
                    <h3 className="font-semibold">Marketing (Base giuridica: Consenso)</h3>
                    <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                      <li>Newsletter e comunicazioni commerciali</li>
                      <li>Offerte personalizzate</li>
                      <li>Inviti a webinar ed eventi</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      * Consenso sempre revocabile
                    </p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Condivisione Dati */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Condivisione dei Dati</h2>
                
                <div className="space-y-3">
                  <p className="text-sm">I tuoi dati possono essere condivisi esclusivamente con:</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium">Fornitori di servizi</h4>
                      <p className="text-sm text-muted-foreground">
                        Hosting (Supabase), email (Resend), analytics
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium">Autorità competenti</h4>
                      <p className="text-sm text-muted-foreground">
                        Su richiesta legale (CONSOB, Autorità Giudiziarie)
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm font-medium text-destructive">
                    ❌ Non vendiamo né cediamo i tuoi dati a terzi per scopi commerciali
                  </p>
                </div>
              </section>

              <Separator />

              {/* Conservazione */}
              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-primary" />
                  5. Tempi di Conservazione
                </h2>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-3 text-center">
                      <p className="font-semibold">Account attivi</p>
                      <p className="text-sm text-muted-foreground">Per tutta la durata del servizio</p>
                    </div>
                    
                    <div className="border rounded-lg p-3 text-center">
                      <p className="font-semibold">Account inattivi</p>
                      <p className="text-sm text-muted-foreground">Cancellati dopo 24 mesi</p>
                    </div>
                    
                    <div className="border rounded-lg p-3 text-center">
                      <p className="font-semibold">Dati conformità</p>
                      <p className="text-sm text-muted-foreground">5 anni (obbligo CONSOB)</p>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Diritti dell'Interessato */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">6. I Tuoi Diritti</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Diritti di accesso e controllo:</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Accesso ai tuoi dati</li>
                      <li>Rettifica dati inesatti</li>
                      <li>Cancellazione dati</li>
                      <li>Limitazione del trattamento</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Diritti di opposizione:</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Opposizione al marketing</li>
                      <li>Revoca consenso</li>
                      <li>Portabilità dei dati</li>
                      <li>Reclamo al Garante Privacy</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm">
                    <strong>Come esercitare i diritti:</strong> Invia una email a 
                    <span className="font-mono ml-1">privacy@tradingrevolution.it</span> 
                    con una copia del documento di identità.
                  </p>
                </div>
              </section>

              <Separator />

              {/* Sicurezza */}
              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-6 h-6 text-primary" />
                  7. Sicurezza dei Dati
                </h2>
                
                <div className="space-y-3">
                  <p className="text-sm">Adottiamo misure tecniche e organizzative appropriate:</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Misure Tecniche:</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Crittografia SSL/TLS</li>
                        <li>Autenticazione sicura</li>
                        <li>Backup automatici</li>
                        <li>Firewall e monitoraggio</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Misure Organizzative:</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Accesso su base "need-to-know"</li>
                        <li>Formazione del personale</li>
                        <li>Procedure di data breach</li>
                        <li>Audit periodici</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Cookie */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Cookie e Tecnologie Simili</h2>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium text-green-600">Cookie Tecnici</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Necessari per il funzionamento. Non richiedono consenso.
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium text-blue-600">Cookie di Performance</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Analytics anonimi per migliorare il servizio.
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium text-amber-600">Cookie di Marketing</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Solo con consenso esplicito.
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm">
                    Puoi gestire le preferenze cookie nelle impostazioni del browser o 
                    tramite il banner cookie della piattaforma.
                  </p>
                </div>
              </section>

              <Separator />

              {/* Trasferimenti Internazionali */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">9. Trasferimenti Internazionali</h2>
                
                <div className="space-y-3">
                  <p className="text-sm">
                    Alcuni fornitori di servizi potrebbero essere localizzati al di fuori dell'UE:
                  </p>
                  
                  <div className="bg-muted p-3 rounded-lg">
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li><strong>Supabase (USA):</strong> Adequacy Decision UE-USA o Standard Contractual Clauses</li>
                      <li><strong>Resend (USA):</strong> Standard Contractual Clauses e misure tecniche supplementari</li>
                    </ul>
                    
                    <p className="text-xs mt-2 text-muted-foreground">
                      Tutti i trasferimenti avvengono con adeguate garanzie di protezione.
                    </p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Modifiche */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">10. Modifiche alla Privacy Policy</h2>
                
                <p className="text-sm">
                  Ci riserviamo il diritto di modificare questa informativa per adeguarla 
                  a evoluzioni normative o del servizio. Le modifiche sostanziali saranno 
                  comunicate via email con almeno 30 giorni di preavviso.
                </p>
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm">
                    <strong>Versione corrente:</strong> 1.0 - Data di entrata in vigore: {new Date().toLocaleDateString('it-IT')}
                  </p>
                </div>
              </section>

              <Separator />

              {/* Contatti */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">11. Contatti</h2>
                
                <div className="space-y-3">
                  <p className="text-sm">Per qualsiasi domanda su questa Privacy Policy:</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium">Data Protection Officer</h4>
                      <div className="text-sm space-y-1 mt-2">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>privacy@tradingrevolution.it</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>Via Massimo D'Azeglio 25, Trepuzzi (LE)</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium">Garante Privacy</h4>
                      <div className="text-sm space-y-1 mt-2">
                        <p>Autorità di controllo competente:</p>
                        <p className="font-mono text-xs">www.garanteprivacy.it</p>
                        <p className="text-xs text-muted-foreground">
                          Per reclami e segnalazioni
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;