import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Eye, Database, Mail, Trash2, Settings, Lock } from 'lucide-react';

const PrivacyPolicy = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Panoramica', icon: <Shield className="w-4 h-4" /> },
    { id: 'data', title: 'Dati Raccolti', icon: <Database className="w-4 h-4" /> },
    { id: 'purpose', title: 'Finalità del Trattamento', icon: <Settings className="w-4 h-4" /> },
    { id: 'rights', title: 'Diritti dell\'Interessato', icon: <Eye className="w-4 h-4" /> },
    { id: 'contact', title: 'Contatti', icon: <Mail className="w-4 h-4" /> }
  ];

  const content = {
    overview: (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">🔒 Privacy Policy di AI CASH R-EVOLUTION</h3>
        <p className="text-muted-foreground">
          Ultimo aggiornamento: 19 Ottobre 2024
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Il Nostro Impegno</h4>
          <p className="text-blue-700">
            AI CASH R-EVOLUTION si impegna a proteggere la tua privacy e a trattare i tuoi dati personali
            in piena conformità con il Regolamento (UE) 2016/679 (GDPR) e il D.Lgs. 196/2003 (Codice Privacy Italiano).
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Titolare del Trattamento</h4>
          <p><strong>AI CASH R-EVOLUTION</strong></p>
          <p>Email: privacy@ai-cash-revolution.com</p>

          <h4 className="font-semibold">DPO (Data Protection Officer)</h4>
          <p>Email: dpo@ai-cash-revolution.com</p>
        </div>
      </div>
    ),

    data: (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">📊 Categorie di Dati Raccolti</h3>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📋 Dati Personali Obbligatori</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="text-sm space-y-1">
                <li>• Nome e cognome</li>
                <li>• Indirizzo email</li>
                <li>• Numero di telefono</li>
                <li>• Paese di residenza</li>
                <li>• Data di nascita</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Base giuridica: Esecuzione del contratto (Art. 6.1.b GDPR)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">💳 Dati di Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="text-sm space-y-1">
                <li>• Informazioni sulla carta di credito (tramite Stripe)</li>
                <li>• Dati di transazione crypto</li>
                <li>• Indirizzi wallet (solo se forniti)</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Nota: Questi dati sono trattati direttamente da fornitori terzi (Stripe, blockchain)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">📈 Dati Tecnici e di Utilizzo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="text-sm space-y-1">
                <li>• Indirizzo IP e dati di connessione</li>
                <li>• Browser e dispositivo utilizzato</li>
                <li>• Statistiche di utilizzo del servizio</li>
                <li>• Log di accesso e attività</li>
                <li>• Segnali generati per l'utente</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Base giuridica: Interesse legittimo (Art. 6.1.f GDPR)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    ),

    purpose: (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">🎯 Finalità del Trattamento</h3>

        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">1. Fornitura del Servizio</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Generazione e consegna segnali di trading</li>
              <li>• Gestione account utente</li>
              <li>• Autenticazione e sicurezza</li>
              <li>• Supporto tecnico</li>
            </ul>
            <p className="text-xs">Base giuridica: Esecuzione contratto</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">2. Analisi e Miglioramento</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Statistiche aggregate di utilizzo</li>
              <li>• Analisi delle performance dei segnali</li>
              <li>• Test A/B per migliorare il servizio</li>
              <li>• Monitoraggio della qualità</li>
            </ul>
            <p className="text-xs">Base giuridica: Interesse legittimo</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">3. Comunicazioni Marketing</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Newsletter e aggiornamenti (con consenso)</li>
              <li>• Materiale formativo e promozionale</li>
              <li>• Offerte speciali e sconti</li>
            </ul>
            <p className="text-xs">Base giuridica: Consenso esplicito</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">4. Adempimenti Legali</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Conservazione registri contabili (10 anni)</li>
              <li>• Conformità normativa antiriciclaggio</li>
              <li>• Risposte a richieste autorità</li>
            </ul>
            <p className="text-xs">Base giuridica: Obbligo legale</p>
          </div>
        </div>
      </div>
    ),

    rights: (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">👤 Diritti dell'Interessato (GDPR Artt. 15-22)</h3>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Diritto di Accesso (Art. 15)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Puoi richiedere copia di tutti i tuoi dati personali che trattiamo.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Diritto di Rettifica (Art. 16)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Puoi correggere dati inesatti o incompleti.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Diritto alla Cancellazione (Art. 17)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Puoi richiedere la cancellazione dei tuoi dati ("diritto all'oblio").
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Altri Diritti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                <li>• <strong>Limitazione</strong> (Art. 18): Limitare il trattamento</li>
                <li>• <strong>Portabilità</strong> (Art. 20): Ricevere dati in formato strutturato</li>
                <li>• <strong>Opposizione</strong> (Art. 21): Opporsi al trattamento</li>
                <li>• <strong>Reclamo</strong> (Art. 77): Rivolgersi al Garante Privacy</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Come Esercitare i Tuoi Diritti</h4>
          <p className="text-blue-700 text-sm mb-2">
            Invia una email a: <strong>privacy@ai-cash-revolution.com</strong>
          </p>
          <p className="text-blue-700 text-sm">
            Risponderemo entro 30 giorni come previsto dal GDPR.
          </p>
        </div>
      </div>
    ),

    contact: (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">📧 Contatti per la Privacy</h3>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📧 Email di Contatto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Privacy:</strong> privacy@ai-cash-revolution.com</p>
                <p><strong>DPO:</strong> dpo@ai-cash-revolution.com</p>
                <p><strong>Supporto:</strong> support@ai-cash-revolution.com</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">🏛️ Autorità di Controllo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Garante Privacy (Italia):</strong></p>
                <p>www.gpdp.it</p>
                <p>posta@gpdp.it</p>
                <p>Telefono: +39 06 6967 71</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">⚖️ Reclami e Controversie</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Se non sei soddisfatto della nostra risposta, hai diritto a presentare reclamo presso:
              </p>
              <ul className="text-sm mt-2 space-y-1">
                <li>• Il Garante per la Protezione dei Dati Personali</li>
                <li>• L'autità di controllo della tua giurisdizione</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Come raccogliamo, utilizziamo e proteggiamo i tuoi dati personali in conformità con GDPR e normativa italiana.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        activeSection === section.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {section.icon}
                      {section.title}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          <div className="flex-1">
            <Card>
              <CardContent className="p-6">
                {content[activeSection]}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            © 2024 AI CASH R-EVOLUTION. Tutti i diritti riservati.
          </p>
          <p className="mt-2">
            Questa Privacy Policy è stata aggiornata il 19 Ottobre 2024 e potrebbe essere modificata in futuro.
          </p>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPolicy;