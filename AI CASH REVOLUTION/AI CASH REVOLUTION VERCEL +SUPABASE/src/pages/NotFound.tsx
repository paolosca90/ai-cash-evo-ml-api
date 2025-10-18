import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-bold">404</CardTitle>
          <CardDescription className="text-base sm:text-lg">
            Oops! Pagina non trovata
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            La pagina che stai cercando non esiste o è stata spostata.
          </p>
          
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Torna alla Home
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Vai alla Dashboard
              </Link>
            </Button>
          </div>
          
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Percorso richiesto: <code className="bg-muted px-1 py-0.5 rounded text-xs">{location.pathname}</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
