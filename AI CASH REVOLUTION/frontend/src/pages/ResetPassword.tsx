import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string()
    .min(8, "La password deve essere lunga almeno 8 caratteri")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "La password deve contenere almeno una lettera minuscola, una maiuscola e un numero"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isTokenVerified, setIsTokenVerified] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenParam = searchParams.get('token_hash') || searchParams.get('token');
  const type = searchParams.get('type') || new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type');

  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash?.replace(/^#/, '') || '';
      const params = new URLSearchParams(hash);
      return {
        access_token: params.get('access_token'),
        refresh_token: params.get('refresh_token'),
        typeInHash: params.get('type'),
      };
    };

    const ensureSessionAndVerify = async () => {
      setError("");

      // 1) Se il redirect include access_token nel fragment, imposta la sessione
      const { access_token, refresh_token, typeInHash } = parseHash();
      if (access_token && refresh_token) {
        try {
          console.log("🔐 Setting session from URL hash...");
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          console.log("✅ Session set from hash");
          if (typeInHash === 'recovery') {
            setIsTokenVerified(true);
          }
          return;
        } catch (e) {
          console.error("❌ setSession from hash failed:", e);
          // Continua con i fallback
        }
      }

      // 2) Se esiste già una sessione, consideriamo valido il flusso di recupero
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        console.log("✅ Existing session found");
        setIsTokenVerified(true);
        return;
      }

      // 3) Fallback: verifica token_hash presente nei query param
      if (tokenParam && (type === 'recovery' || typeInHash === 'recovery')) {
        try {
          console.log("🔍 Verifying reset token...");
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenParam,
            type: 'recovery'
          });
          if (error) throw error;
          console.log("✅ Token verified successfully");
          setIsTokenVerified(true);
          return;
        } catch (error: unknown) {
          console.error("❌ Token verification error:", error);
          let errorMessage = "Link di reset password non valido o scaduto.";
          
          if (error.message?.toLowerCase().includes("expired")) {
            errorMessage = "Il link di reset è scaduto. Richiedi un nuovo link.";
          } else if (error.message?.toLowerCase().includes("invalid")) {
            errorMessage = "Link di reset non valido. Richiedi un nuovo link.";
          }
          
          setError(errorMessage);
          return;
        }
      }

      // 4) Mancano informazioni valide
      setError("Link di reset password non valido o scaduto. Richiedi un nuovo link.");
    };

    ensureSessionAndVerify();
  }, [tokenParam, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validazione input
    try {
      passwordSchema.parse({ password, confirmPassword });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        setError(validationError.errors[0].message);
        return;
      }
    }

    if (!isTokenVerified) {
      setError("Sessione di recupero non valida. Clicca nuovamente il link di reset dalla email.");
      return;
    }

    setIsLoading(true);

    try {
      console.log("🔑 Updating password after token/session verification");
      
      // Verifica se abbiamo una sessione valida
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("📋 Current session:", sessionData);
      
      if (!sessionData.session) {
        throw new Error("No valid session found for password update");
      }
      
      // Aggiorna la password (richiede sessione valida creata dal link di recupero)
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      console.log("🔄 Password update result:", { error: updateError });

      if (updateError) {
        throw updateError;
      }

      console.log("✅ Password updated successfully");
      setIsSuccess(true);
      
      toast({
        title: "Password Aggiornata!",
        description: "La tua password è stata reimpostata con successo.",
      });

      // Reindirizza al login dopo 3 secondi
      setTimeout(() => {
        navigate("/login");
      }, 3000);

    } catch (error: unknown) {
      console.error("❌ Password reset error:", error);
      
      let errorMessage = "Si è verificato un errore durante l'aggiornamento della password.";
      
      if (error.message?.includes("Invalid token")) {
        errorMessage = "Token di reset non valido o scaduto. Richiedi un nuovo link.";
      } else if (error.message?.includes("Token expired")) {
        errorMessage = "Il link di reset è scaduto. Richiedi un nuovo link.";
      } else if (error.message?.includes("Password should be")) {
        errorMessage = "La password non soddisfa i requisiti di sicurezza.";
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

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Password Aggiornata!</CardTitle>
            <CardDescription>
              La tua password è stata reimpostata con successo. Verrai reindirizzato al login a breve.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Button onClick={() => navigate("/login")} className="w-full">
              Vai al Login
            </Button>
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
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Nuova Password</CardTitle>
          <CardDescription>
            Inserisci la tua nuova password per completare il reset
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
              <label htmlFor="password" className="text-sm font-medium">
                Nuova Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Inserisci la nuova password"
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Conferma Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Conferma la nuova password"
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Password requirements */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Requisiti password:</p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li className={password.length >= 8 ? "text-green-600" : ""}>
                  • Almeno 8 caratteri
                </li>
                <li className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
                  • Una lettera maiuscola
                </li>
                <li className={/[a-z]/.test(password) ? "text-green-600" : ""}>
                  • Una lettera minuscola
                </li>
                <li className={/\d/.test(password) ? "text-green-600" : ""}>
                  • Un numero
                </li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !isTokenVerified}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Aggiornamento...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Aggiorna Password
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button onClick={() => navigate("/login")} variant="ghost" size="sm">
              Torna al Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;