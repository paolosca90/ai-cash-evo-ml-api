// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Edit, Crown, Calendar, Mail } from "lucide-react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  email: string;
  subscription_plan: 'essenziale' | 'professional' | 'enterprise';
  subscription_status: string;
  subscription_expires_at: string | null;
  created_at: string;
}

interface SubscriptionPlan {
  plan_type: string;
  name: string;
  price_monthly: number;
  price_annual: number;
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkAdminAccess = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    // Verifica se l'utente ha ruolo admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      toast({
        title: "Accesso negato",
        description: "Non hai i permessi per accedere a questa pagina",
        variant: "destructive"
      });
      navigate("/", { replace: true });
    }
  }, [navigate, toast]);

  useEffect(() => {
    checkAdminAccess();
    fetchData();
  }, []); // Empty deps - run once on mount

  const fetchData = useCallback(async () => {
    try {
      // Fetch users con profili
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (userError) throw userError;
      setUsers(userData || []);

      // Fetch piani disponibili
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (planError) throw planError;
      setPlans(planData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateUserPlan = async (userId: string, newPlan: string, expiryDate?: string) => {
    try {
      const updateData: unknown = {
        subscription_plan: newPlan,
        subscription_status: 'active'
      };

      if (expiryDate) {
        updateData.subscription_expires_at = expiryDate;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Piano aggiornato",
        description: "Il piano dell'utente è stato modificato con successo"
      });

      setIsEditDialogOpen(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il piano",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-primary text-primary-foreground';
      case 'professional': return 'bg-warning text-warning-foreground';
      case 'essenziale': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="text-center">Caricamento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Amministratore</h1>
          <p className="text-muted-foreground">Gestisci utenti e piani di abbonamento</p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Ricerca Utenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Email utente</Label>
                <Input
                  id="search"
                  placeholder="Cerca per email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Utenti Registrati ({filteredUsers.length})</CardTitle>
            <CardDescription>
              Gestisci i piani di abbonamento degli utenti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Piano Attuale</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scadenza</TableHead>
                  <TableHead>Registrazione</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPlanBadgeColor(user.subscription_plan)}>
                        <Crown className="w-3 h-3 mr-1" />
                        {user.subscription_plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.subscription_status === 'active' ? 'default' : 'secondary'}>
                        {user.subscription_status || 'trial'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(user.subscription_expires_at)}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>
                      <Dialog open={isEditDialogOpen && selectedUser?.id === user.id} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Modifica
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Modifica Piano Utente</DialogTitle>
                            <DialogDescription>
                              Modifica il piano di abbonamento per {user.email}
                            </DialogDescription>
                          </DialogHeader>
                          <EditUserForm
                            user={user}
                            plans={plans}
                            onSave={updateUserPlan}
                            onCancel={() => setIsEditDialogOpen(false)}
                          />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Componente per il form di modifica
interface EditUserFormProps {
  user: User;
  plans: SubscriptionPlan[];
  onSave: (userId: string, newPlan: string, expiryDate?: string) => void;
  onCancel: () => void;
}

const EditUserForm = ({ user, plans, onSave, onCancel }: EditUserFormProps) => {
  const [selectedPlan, setSelectedPlan] = useState<string>(user.subscription_plan);
  const [expiryDate, setExpiryDate] = useState(
    user.subscription_expires_at ? new Date(user.subscription_expires_at).toISOString().split('T')[0] : ''
  );

  const handleSave = () => {
    onSave(user.id, selectedPlan, expiryDate || undefined);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="plan">Piano di Abbonamento</Label>
        <Select value={selectedPlan} onValueChange={setSelectedPlan}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona un piano" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
              <SelectItem key={plan.plan_type} value={plan.plan_type}>
                {plan.name} - €{plan.price_monthly}/mese
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="expiry">Data di Scadenza</Label>
        <Input
          id="expiry"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Annulla
        </Button>
        <Button onClick={handleSave}>
          Salva Modifiche
        </Button>
      </div>
    </div>
  );
};

export default AdminDashboard;