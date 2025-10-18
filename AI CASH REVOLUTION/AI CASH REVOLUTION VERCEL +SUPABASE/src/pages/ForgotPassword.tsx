import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido").min(1, "L'email è richiesta")
});

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validazione input
    try {
      emailSchema.parse({ email });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        setError(validationError.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    try {
      console.log("🔑 Initiating password reset for:", email);
      
      // Invoca la nostra Edge Function che invia l'email di reset via Resend
      const { data, error: fnError } = await supabase.functions.invoke('send-reset-email', {
        body: { email },
      });

      if (fnError) {
        throw fnError;
      }

      console.log("✅ Password reset initiated successfully");
      setIsEmailSent(true);
      
      toast({
        title: "Email di Reset Inviata!",
        description: "Controlla la tua casella email per le istruzioni di reset della password.",
      });

    } catch (error: unknown) {
      console.error("❌ Password reset error:", error);
      
      let errorMessage = "Si è verificato un errore durante l'invio dell'email di reset.";
      
      if (error.message?.includes("Email not confirmed")) {
        errorMessage = "L'email non è stata ancora confermata. Controlla la tua casella email.";
      } else if (error.message?.includes("Invalid email")) {
        errorMessage = "Indirizzo email non valido.";
      } else if (error.message?.includes("User not found")) {
        errorMessage = "Nessun account trovato con questo indirizzo email.";
      }
      
      setError(errorMessage);
      
      toast({
        title: "Errore Reset Password",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Email Inviata!</CardTitle>
            <CardDescription>
              Abbiamo inviato le istruzioni per reimpostare la password a <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <strong>Controlla la tua email:</strong>
                <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                  <li>Verifica anche la cartella spam/posta indesiderata</li>
                  <li>Il link è valido per 1 ora</li>
                  <li>Può essere utilizzato una sola volta</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={() => {
                  setIsEmailSent(false);
                  setEmail("");
                }}
                variant="outline"
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                Invia Nuovamente
              </Button>
              
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Torna al Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Password Dimenticata?</CardTitle>
          <CardDescription>
            Inserisci il tuo indirizzo email e ti invieremo le istruzioni per reimpostare la password
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Indirizzo Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="inserisci@tuaemail.com"
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Invio in corso...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Invia Email di Reset
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna al Login
              </Link>
            </Button>
          </div>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Non hai ancora un account?</strong>
            </p>
            <Button asChild variant="link" size="sm" className="w-full mt-1">
              <Link to="/signup">
                Registrati ora →
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;