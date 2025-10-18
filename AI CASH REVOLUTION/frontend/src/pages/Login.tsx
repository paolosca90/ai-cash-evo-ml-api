import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Shield,
  Sparkles,
  CheckCircle,
  Brain,
  DollarSign,
  Clock,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Email non valida" })
  .max(255, { message: "Email troppo lunga" });

const passwordSchema = z
  .string()
  .min(6, { message: "La password deve avere almeno 6 caratteri" })
  .max(128, { message: "Password troppo lunga" });

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Auth state listener first, then getSession (best practice)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Start 7-day PROFESSIONAL trial immediately upon registration/login
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);
        
        await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            email: session.user.email,
            subscription_plan: 'professional',
            trial_ends_at: trialEndDate.toISOString(),
            subscription_expires_at: trialEndDate.toISOString(),
            subscription_status: 'trial'
          });
        
        navigate("/trading", { replace: true });
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Start 7-day PROFESSIONAL trial immediately upon registration/login
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);
        
        await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            email: session.user.email,
            subscription_plan: 'professional',
            trial_ends_at: trialEndDate.toISOString(),
            subscription_expires_at: trialEndDate.toISOString(),
            subscription_status: 'trial'
          });
        
        navigate("/trading", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const email = emailSchema.parse(loginData.email);
      const password = passwordSchema.parse(loginData.password);
      setIsLoading(true);

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }

      // Start 7-day PROFESSIONAL trial immediately
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);
      
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase
          .from('profiles')
          .upsert({
            id: userData.user.id,
            email: userData.user.email,
            subscription_plan: 'professional',
            trial_ends_at: trialEndDate.toISOString(),
            subscription_expires_at: trialEndDate.toISOString(),
            subscription_status: 'trial'
          });
      }

      toast({ title: "Accesso effettuato!", description: "Benvenuto! La tua prova gratuita di 7 giorni inizia ora." });
      navigate("/trading", { replace: true });
    } catch (err: unknown) {
      toast({ title: "Errore di accesso", description: err.message ?? "Credenziali non valide", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const email = emailSchema.parse(signupData.email);
      const password = passwordSchema.parse(signupData.password);
      if (password !== signupData.confirmPassword) {
        throw new Error("Le password non coincidono");
      }

      setIsLoading(true);

      // Redirect al dominio di produzione per la conferma
      const redirectUrl = "https://cash-revolution.com/login";
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          emailRedirectTo: redirectUrl,
          data: {
            name: signupData.name
          }
        },
      });
      if (error) throw error;

      // Messaggio di conferma email obbligatoria
      toast({
        title: "📧 Controlla la tua email!",
        description: "Ti abbiamo inviato un link di verifica. Clicca sul link nell'email per attivare il tuo account e completare la registrazione.",
      });
    } catch (err: unknown) {
      toast({ title: "Errore di registrazione", description: err.message ?? "Registrazione non riuscita", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const email = emailSchema.parse(signupData.email);
      const redirectUrl = "https://cash-revolution.com/login";
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectUrl }
      });
      if (error) throw error;
      toast({ title: "Email reinviata", description: "Controlla la tua casella (anche Spam)." });
    } catch (err: unknown) {
      toast({ title: "Impossibile reinviare", description: err.message ?? "Riprova tra poco", variant: "destructive" });
    }
  };
  const features = [
    { icon: <Brain className="w-5 h-5 text-primary" />, title: "AI Machine Learning", description: "Sistema che apprende e migliora ogni 15 minuti" },
    { icon: <DollarSign className="w-5 h-5 text-success" />, title: "340% ROI Medio", description: "Performance verificate dai nostri clienti" },
    { icon: <Shield className="w-5 h-5 text-warning" />, title: "96.8% Accuratezza", description: "Segnali testati su milioni di operazioni" },
    { icon: <Clock className="w-5 h-5 text-danger" />, title: "0.05ms Latenza", description: "La velocità più alta del mercato" },
  ];

  return (
    <>
      {/* SEO Meta Tags */}
      <title>Accesso - AI CASH R-EVOLUTION | Trading AI Machine Learning</title>
      <meta name="description" content="Accedi alla piattaforma di trading AI più avanzata. Sistema machine learning con 96.8% accuratezza. Prova gratuita 7 giorni." />

      {/* SEO Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Accesso - AI CASH R-EVOLUTION",
          "description": "Accedi alla piattaforma di trading AI più avanzata con machine learning e accuratezza del 96.8%",
          "url": "https://cash-revolution.com/login",
          "mainEntity": {
            "@type": "SoftwareApplication",
            "name": "AI CASH R-EVOLUTION",
            "applicationCategory": "FinanceApplication"
          }
        })}
      </script>

      <main className="min-h-screen bg-gradient-hero relative overflow-hidden flex">
        <div className="absolute inset-0 bg-gradient-subtle opacity-95"></div>
        
        {/* Left Side - Login Form */}
        <section className="flex-1 flex items-center justify-center p-8 relative z-10">
          <div className="w-full max-w-md space-y-6">
            {/* Header */}
            <header className="text-center space-y-2">
              <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth mb-6 interactive">
                <ArrowLeft className="w-4 h-4" />
                Torna alla Homepage
              </Link>

              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-8 h-8 text-primary animate-float" />
                <h1 className="text-2xl font-display font-bold text-gradient-primary">AI CASH R-EVOLUTION</h1>
              </div>

              <Badge className="glass pulse-glow">
                <Sparkles className="w-4 h-4 mr-1 animate-pulse" />
                Sistema ML Avanzato
              </Badge>
            </header>

            {/* Login/Signup Tabs */}
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Accedi</TabsTrigger>
                <TabsTrigger value="signup">Registrati</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <Card className="glass-hover border-primary/20 shadow-glow">
                  <CardHeader className="text-center">
                    <CardTitle className="font-display text-gradient-primary">Bentornato!</CardTitle>
                    <CardDescription className="text-base">Accedi per continuare con il tuo trading AI</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="email" type="email" placeholder="il-tuo-email@esempio.com" className="pl-10" value={loginData.email} onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="password" type="password" placeholder="La tua password" className="pl-10" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} required />
                        </div>
                      </div>

                      <Button type="submit" className="w-full bg-gradient-primary hover:shadow-glow interactive font-semibold" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Accesso in corso...
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-2" />
                            Accedi al Sistema
                          </>
                        )}
                      </Button>
                    </form>

                    <div className="mt-4 text-center">
                      <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                        Password dimenticata?
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup">
                <Card className="glass-hover border-primary/20 shadow-glow">
                  <CardHeader className="text-center">
                    <CardTitle className="font-display text-gradient-primary">Inizia Ora!</CardTitle>
                    <CardDescription className="text-base">Crea il tuo account e inizia la prova gratuita di 7 giorni</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Nome Completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="signup-name" type="text" placeholder="Il tuo nome" className="pl-10" value={signupData.name} onChange={(e) => setSignupData({ ...signupData, name: e.target.value })} required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="signup-email" type="email" placeholder="il-tuo-email@esempio.com" className="pl-10" value={signupData.email} onChange={(e) => setSignupData({ ...signupData, email: e.target.value })} required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="signup-password" type="password" placeholder="Scegli una password sicura" className="pl-10" value={signupData.password} onChange={(e) => setSignupData({ ...signupData, password: e.target.value })} required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Conferma Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="confirm-password" type="password" placeholder="Ripeti la password" className="pl-10" value={signupData.confirmPassword} onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })} required />
                        </div>
                      </div>

                      <Button type="submit" className="w-full bg-gradient-primary hover:shadow-glow interactive font-semibold" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creazione account...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Inizia Prova Gratuita
                          </>
                        )}
                      </Button>

                      <div className="mt-3 text-center">
                        <button type="button" onClick={handleResendVerification} className="text-sm text-primary hover:underline">
                          Non hai ricevuto l’email? Reinvia
                        </button>
                      </div>
                    </form>

                    <div className="mt-4 text-center text-xs text-muted-foreground">
                      Registrandoti accetti i nostri{" "}
                      <a href="#" className="text-primary hover:underline">Termini di Servizio</a>{" "}e{" "}
                      <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Trust Indicators */}
            <div className="text-center space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-success" />
                <span>✅ 7 giorni gratis</span>
                <span className="hidden sm:inline">•</span>
                <span>✅ Nessun impegno</span>
                <span className="hidden sm:inline">•</span>
                <span>✅ Cancella quando vuoi</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side - Features & Stats */}
        <aside className="hidden lg:flex flex-1 bg-gradient-card p-8 items-center relative">
          <div className="w-full max-w-lg space-y-8 animate-fade-in">
            {/* Live Stats */}
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-display font-bold text-gradient-hero">Performance Live</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card className="glass border-success/30 shadow-success interactive">
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-success animate-pulse-glow">+18.3%</div>
                    <div className="text-sm text-muted-foreground">Oggi</div>
                    <Progress value={92} className="mt-2" />
                  </CardContent>
                </Card>
                <Card className="glass border-primary/30 shadow-glow interactive">
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-primary animate-pulse-glow">163</div>
                    <div className="text-sm text-muted-foreground">Segnali</div>
                    <Progress value={87} className="mt-2" />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-4">
              <h3 className="text-xl font-display font-semibold text-center mb-6">Perché Scegliere AI CASH R-EVOLUTION?</h3>
              {features.map((feature, index) => (
                <Card key={index} className="glass-hover interactive">
                  <CardContent className="flex items-center gap-4 pt-4">
                    <div className="p-2 bg-primary/10 rounded-lg">{feature.icon}</div>
                    <div>
                      <h4 className="font-semibold">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Customer Count */}
            <Card className="bg-gradient-primary border-primary/30 shadow-glow">
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-primary-foreground mb-2">12,847+</div>
                <div className="text-sm text-primary-foreground/80 mb-3">Trader attivi che utilizzano il nostro sistema</div>
                <div className="flex items-center justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-warning text-lg">★</span>
                  ))}
                  <span className="ml-2 text-sm text-primary-foreground/80">4.9/5</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </main>
    </>
  );
};

export default Login;