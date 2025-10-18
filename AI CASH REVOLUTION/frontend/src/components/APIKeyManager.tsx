import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Plus, Eye, EyeOff, Trash2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface APIKey {
  id: string;
  name: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
}

const APIKeyManager = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('user-api-keys', {
        method: 'GET'
      });

      if (error) throw error;

      setApiKeys(data.api_keys || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le API keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAPIKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci un nome per la API key",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('user-api-keys', {
        method: 'POST',
        body: { name: newKeyName }
      });

      if (error) throw error;

      toast({
        title: "Successo",
        description: "API key creata con successo",
      });

      setNewKeyName("");
      setShowNewKeyDialog(false);
      fetchAPIKeys();
    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare la API key",
        variant: "destructive",
      });
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiato",
      description: "API key copiata negli appunti",
    });
  };

  const toggleKeyStatus = async (keyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('user-api-keys', {
        method: 'PUT',
        body: { 
          api_key_id: keyId, 
          is_active: !currentStatus 
        }
      });

      if (error) throw error;

      toast({
        title: "Successo",
        description: `API key ${!currentStatus ? 'attivata' : 'disattivata'}`,
      });

      fetchAPIKeys();
    } catch (error) {
      console.error('Error toggling API key:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la API key",
        variant: "destructive",
      });
    }
  };

  const deleteAPIKey = async (keyId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa API key?")) return;

    try {
      const { error } = await supabase.functions.invoke('user-api-keys', {
        method: 'DELETE',
        body: null,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;

      toast({
        title: "Successo",
        description: "API key eliminata con successo",
      });

      fetchAPIKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la API key",
        variant: "destructive",
      });
    }
  };

  const maskApiKey = (key: string) => {
    return `${key.substring(0, 8)}...${key.substring(key.length - 8)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Caricamento...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>API Keys MT5</span>
          <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nuova API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea Nuova API Key</DialogTitle>
                <DialogDescription>
                  Crea una nuova API key per collegare il tuo Expert Advisor MT5
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="col-span-3"
                    placeholder="Es: MT5 Principal"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewKeyDialog(false)}>
                  Annulla
                </Button>
                <Button onClick={createAPIKey}>Crea API Key</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Gestisci le API keys per collegare i tuoi Expert Advisor MT5 in modo sicuro
        </CardDescription>
      </CardHeader>
      <CardContent>
        {apiKeys.length === 0 ? (
          <Alert>
            <AlertDescription>
              Non hai ancora creato nessuna API key. Crea la prima per iniziare a collegare MT5.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((key) => (
              <div key={key.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{key.name}</h3>
                    <Badge variant={key.is_active ? "default" : "secondary"}>
                      {key.is_active ? "Attiva" : "Disattivata"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleKeyVisibility(key.id)}
                    >
                      {visibleKeys.has(key.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(key.api_key)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleKeyStatus(key.id, key.is_active)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAPIKey(key.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="bg-muted p-2 rounded font-mono text-sm">
                  {visibleKeys.has(key.id) ? key.api_key : maskApiKey(key.api_key)}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Creata: {new Date(key.created_at).toLocaleDateString()}
                  {key.last_used_at && (
                    <span className="ml-4">
                      Ultimo utilizzo: {new Date(key.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default APIKeyManager;