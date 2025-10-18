import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PaymentModal } from "@/components/PaymentModal";

import { 
  TrendingUp, 
  Brain, 
  Zap, 
  Target, 
  Shield, 
  BarChart3, 
  Clock, 
  DollarSign,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Star,
  QrCode
} from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      name: "Marco R.",
      role: "Professional Trader",
      content: "AI CASH R-EVOLUTION ha aumentato la mia profitabilità del 340% in 6 mesi. L'accuratezza è incredibile!",
      rating: 5
    },
    {
      name: "Elena S.",
      role: "Hedge Fund Manager",
      content: "Il sistema di ML è il più avanzato che abbia mai visto. Signals in tempo reale con 96% di accuratezza.",
      rating: 5
    },
    {
      name: "Giuseppe M.",
      role: "Swing Trader",
      content: "Grazie all'auto-apprendimento ogni 15 minuti, i segnali migliorano costantemente. ROI straordinario!",
      rating: 5
    }
  ];

  const features = [
    {
      icon: <Brain className="w-8 h-8 text-primary" />,
      title: "AI Machine Learning",
      description: "Sistema di apprendimento automatico che si aggiorna ogni 15 minuti",
      stats: "96.8% Accuratezza"
    },
    {
      icon: <Zap className="w-8 h-8 text-warning" />,
      title: "Segnali Real-Time",
      description: "Analisi istantanea con latenza di 0.05ms per trading ad alta frequenza",
      stats: "< 0.05ms Latency"
    },
    {
      icon: <Target className="w-8 h-8 text-success" />,
      title: "Precision Trading",
      description: "Algoritmi istituzionali con gestione dinamica del rischio",
      stats: "3.4:1 Risk/Reward"
    },
    {
      icon: <Shield className="w-8 h-8 text-danger" />,
      title: "Risk Management",
      description: "Protezione avanzata del capitale con stop-loss adattivi",
      stats: "Max 2% Drawdown"
    }
  ];

  const [isAnnual, setIsAnnual] = useState(false);

  const pricingPlans = [
    {
      name: "Essenziale",
      price: isAnnual ? "22" : "27",
      originalPrice: isAnnual ? "27" : null,
      period: isAnnual ? "/mese (fatturato annualmente)" : "/mese",
      description: "Perfetto per iniziare",
      features: [
        "1 Segnale al giorno",
        "Analisi tecnica base", 
        "Supporto via email",
        "7 giorni di prova gratuita",
        "Dashboard web"
      ],
      popular: false,
      trialText: "7 giorni gratis"
    },
    {
      name: "Professional",
      price: isAnnual ? "78" : "97", 
      originalPrice: isAnnual ? "97" : null,
      period: isAnnual ? "/mese (fatturato annualmente)" : "/mese",
      description: "La scelta più popolare",
      features: [
        "Segnali illimitati",
        "Expert Advisor MT5 incluso",
        "Machine Learning avanzato",
        "Tutte le coppie valutarie + Crypto",
        "Trading automatico",
        "Risk management dinamico",
        "Supporto prioritario 24/7",
        "Performance analytics avanzate",
        "7 giorni di prova gratuita"
      ],
      popular: true,
      trialText: "7 giorni gratis"
    },
    {
      name: "Enterprise",
      price: "Su misura",
      originalPrice: null,
      period: "",
      description: "Per istituzioni e grandi trader",
      features: [
        "Tutto del piano Professional",
        "API dedicata",
        "Strategie personalizzate",
        "White label solution",
        "Account manager dedicato",
        "Training ML personalizzato",
        "Multi-account management",
        "SLA garantito",
        "Implementazione su misura"
      ],
      popular: false,
      trialText: "Consultazione gratuita"
    }
  ];

  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <header>
        <nav className="glass border-b border-border/30 sticky top-0 z-50 transition-smooth">
          <div className="container mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-primary animate-float" />
              <h1 className="text-lg md:text-xl font-display font-black tracking-tight text-primary">
                <span className="hidden sm:inline">AI CASH R-EVOLUTION</span>
                <span className="sm:hidden">AI CASH</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <Link to="/login">
                <Button variant="outline" size="sm" className="hidden sm:flex glass-hover">Accedi</Button>
              </Link>
              <Link to="/login">
                <Button className="bg-gradient-primary hover:shadow-glow transition-smooth" size="sm">
                  <span className="hidden sm:inline">Inizia Ora</span>
                  <span className="sm:hidden">Inizia</span>
                  <ArrowRight className="w-4 h-4 ml-1 md:ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-background/95"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <Badge className="mb-4 md:mb-6 glass pulse-glow animate-fade-in" variant="outline">
            <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
            <span className="hidden sm:inline">Sistema ML più Avanzato del 2024</span>
            <span className="sm:hidden">Sistema ML 2024</span>
          </Badge>
          
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-display font-black mb-4 md:mb-6 text-foreground leading-none tracking-tighter animate-scale-in">
            <span className="hidden sm:inline">AI CASH R-EVOLUTION</span>
            <span className="sm:hidden">AI CASH<br />R-EVOLUTION</span>
          </h2>
          
          <p className="text-base sm:text-xl md:text-2xl text-muted-foreground mb-6 md:mb-8 max-w-3xl mx-auto px-4 font-medium leading-relaxed">
            Il primo sistema di trading completamente autonomo con <strong className="text-foreground font-semibold">Machine Learning</strong> 
            che si aggiorna ogni 15 minuti. Accuratezza del <strong className="text-primary font-bold">96.8%</strong> verificata.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-mono font-bold text-success">96.8%</div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Accuratezza</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-mono font-bold text-warning">15min</div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Auto-Update</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-mono font-bold text-primary">340%</div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">ROI Medio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-mono font-bold text-danger">0.05ms</div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Latenza</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4">
            <Link to="/login">
              <Button size="lg" className="bg-gradient-primary hover:shadow-glow interactive px-6 md:px-8 py-4 md:py-6 text-base md:text-lg w-full sm:w-auto font-display font-bold tracking-tight">
                <DollarSign className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                <span className="hidden sm:inline">Inizia a Guadagnare</span>
                <span className="sm:hidden">Inizia Ora</span>
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="glass-hover px-6 md:px-8 py-4 md:py-6 text-base md:text-lg w-full sm:w-auto border-primary/20 font-display font-semibold">
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              <span className="hidden sm:inline">Vedi Performance Live</span>
              <span className="sm:hidden">Performance</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Performance Dashboard */}
      <section className="py-16 bg-card/50 relative">
        <div className="container mx-auto px-4">
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black mb-4 text-foreground tracking-tight">Performance in Tempo Reale</h2>
              <p className="text-muted-foreground text-lg font-medium">I nostri algoritmi ML lavorano 24/7 per massimizzare i profitti</p>
            </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="glass-hover border-success/30 shadow-success animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success font-display">
                  <TrendingUp className="w-5 h-5 animate-pulse" />
                  Profitto Oggi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success animate-pulse-glow">+12.7%</div>
                <div className="text-sm text-muted-foreground">vs -0.3% mercato</div>
                <Progress value={87} className="mt-2" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <Clock className="w-5 h-5" />
                  Segnali Attivi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning">47</div>
                <div className="text-sm text-muted-foreground">Ultimo aggiornamento: 2min fa</div>
                <Progress value={94} className="mt-2" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Brain className="w-5 h-5" />
                  AI Learning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">96.8%</div>
                <div className="text-sm text-muted-foreground">Accuratezza attuale</div>
                <Progress value={97} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black mb-4 text-foreground tracking-tight">Tecnologia Rivoluzionaria</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-medium leading-relaxed">
              Il sistema più avanzato mai creato per il trading automatico con intelligenza artificiale
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">{feature.description}</p>
                  <Badge variant="secondary" className="font-semibold">
                    {feature.stats}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-card/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-foreground">Cosa Dicono i Nostri Clienti</h2>
            <p className="text-muted-foreground">Migliaia di trader professionali si fidano di AI CASH R-EVOLUTION</p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <Card className="text-center">
              <CardContent className="py-12">
                <div className="flex justify-center mb-4">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-warning fill-current" />
                  ))}
                </div>
                
                <blockquote className="text-xl mb-6 italic text-foreground">
                  "{testimonials[currentTestimonial].content}"
                </blockquote>
                
                <div className="font-semibold text-foreground">
                  {testimonials[currentTestimonial].name}
                </div>
                <div className="text-muted-foreground">
                  {testimonials[currentTestimonial].role}
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-center mt-6 gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentTestimonial ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-foreground">Scegli il Tuo Piano</h2>
            <p className="text-muted-foreground mb-6">Inizia con 7 giorni di prova gratuita, poi scegli il piano perfetto per te</p>
            
            {/* Annual/Monthly Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={`text-sm ${!isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                Mensile
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAnnual ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAnnual ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                Annuale
              </span>
              {isAnnual && (
                <Badge className="bg-success/10 text-success border-success/20">
                  Risparmia 20%
                </Badge>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                    Più Popolare
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  
                  <div className="mt-4">
                    {plan.price === "Su misura" ? (
                      <div className="text-2xl font-bold text-primary">
                        Prezzo su misura
                      </div>
                    ) : (
                      <>
                        <div className="text-4xl font-bold text-primary">
                          €{plan.price}
                          <span className="text-lg text-muted-foreground">{plan.period}</span>
                        </div>
                        {plan.originalPrice && (
                          <div className="text-sm text-muted-foreground line-through">
                            €{plan.originalPrice}/mese
                          </div>
                        )}
                      </>
                    )}
                    
                <Badge className="mt-2 bg-primary/10 text-primary border-primary/20" variant="outline">
                  🎯 {plan.trialText} - Richiede metodo di pagamento
                </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                   <PaymentModal 
                     plan={plan} 
                     isAnnual={isAnnual}
                   />
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Disclaimer */}
          <div className="mt-12 max-w-4xl mx-auto text-center">
            <div className="bg-muted/30 rounded-lg p-6 border border-border">
              <h3 className="text-lg font-semibold mb-3 text-foreground">
                ⚠️ Avviso Importante sui Rischi
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>I segnali forniti da AI CASH R-EVOLUTION sono strumenti di analisi tecnica e NON costituiscono consigli di investimento finanziario.</strong> 
                Il trading su forex, CFD e criptovalute comporta un alto livello di rischio e può risultare nella perdita di tutto il capitale investito. 
                Le performance passate non garantiscono risultati futuri. Prima di operare, valuta attentamente la tua situazione finanziaria e consulta un consulente finanziario qualificato. 
                Opera solo con capitale che puoi permetterti di perdere. Questo servizio è destinato esclusivamente a persone maggiorenni e residenti in paesi dove il trading online è legale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* QR Payment Section */}
      <section className="py-16 bg-gradient-to-br from-muted/30 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                <QrCode className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Novità: Pagamento QR</span>
              </div>
              <h2 className="text-3xl font-bold">
                Il Modo Più Veloce per Iniziare
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Scansiona il QR code e attiva il tuo abbonamento in 3 secondi. 
                Supporta sia pagamenti con carta che criptovalute.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold mb-2">Inquadra</h3>
                <p className="text-sm text-muted-foreground">
                  Apri la fotocamera del tuo smartphone e inquadra il QR code
                </p>
              </div>
              
              <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold mb-2">Tocca</h3>
                <p className="text-sm text-muted-foreground">
                  Tocca la notifica che appare per aprire il pagamento
                </p>
              </div>
              
              <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-semibold mb-2">Fatto!</h3>
                <p className="text-sm text-muted-foreground">
                  Il tuo abbonamento è attivo e puoi iniziare a fare trading
                </p>
              </div>
            </div>

            <div className="pt-6">
              <Link to="/qr-payment?plan=Premium&amount=29.99&annual=false">
                <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 px-8 py-4">
                  <QrCode className="w-5 h-5 mr-2" />
                  Prova il Pagamento QR
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <div className="mt-3 text-sm text-muted-foreground">
                ⚡ Attivazione istantanea • 🔒 Sicuro • 📱 Mobile-first
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 via-warning/10 to-success/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Pronto a Rivoluzionare il Tuo Trading?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Unisciti a migliaia di trader che hanno già trasformato i loro investimenti con AI CASH R-EVOLUTION
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" className="bg-primary hover:bg-primary/90 px-8 py-6 text-lg">
                <Sparkles className="w-5 h-5 mr-2" />
                Inizia la Prova Gratuita
              </Button>
            </Link>
            <Link to="/qr-payment?plan=Premium&amount=29.99&annual=false">
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg border-2 border-primary/30 hover:bg-primary/5">
                <QrCode className="w-5 h-5 mr-2" />
                Paga con QR Code
              </Button>
            </Link>
          </div>
          
          <div className="mt-8 text-sm text-muted-foreground">
            ✅ Prova gratuita di 7 giorni • ✅ Nessun impegno • ✅ Supporto 24/7
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
                <span className="font-bold">AI CASH R-EVOLUTION</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Il sistema di trading AI più avanzato al mondo
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Prodotto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Segnali AI</li>
                <li>Risk Management</li>
                <li>Performance Analytics</li>
                <li>API Trading</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Supporto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Centro Assistenza</li>
                <li>Tutorial</li>
                <li>Community</li>
                <li>Contatti</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legale</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/legal">Informazioni Legali</Link></li>
                <li><Link to="/privacy">Privacy Policy</Link></li>
                <li><Link to="/legal">Disclaimer di Rischio</Link></li>
                <li><Link to="/legal">Normativa CONSOB</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p className="mb-2">© 2024 Trading R-evolution - P.IVA 04958630750. Tutti i diritti riservati.</p>
            <p className="text-xs space-x-2">
              <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>
              <span>•</span>
              <Link to="/legal" className="underline hover:text-primary">Disclaimer di Rischio</Link>
              <span>•</span>
              <span><strong>Avvertenza:</strong> Il trading comporta un alto livello di rischio</span>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Landing;