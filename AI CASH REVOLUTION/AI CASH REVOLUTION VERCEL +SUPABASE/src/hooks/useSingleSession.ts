import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface SingleSessionManager {
  sessionToken: string | null;
  isActive: boolean;
}

export const useSingleSession = () => {
  const [sessionManager, setSessionManager] = useState<SingleSessionManager>({
    sessionToken: null,
    isActive: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setupSingleSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Crea canale realtime per tracciare presenza
      channel = supabase.channel(`user_session_${session.user.id}`, {
        config: {
          presence: {
            key: session.user.id,
          },
        },
      });

      // Gestisci eventi di presenza
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const users = Object.keys(state);
          
          // Se ci sono più utenti collegati, significa che c'è una sessione duplicata
          if (users.length > 1) {
            toast({
              title: "Sessione Duplicata Rilevata",
              description: "Il tuo account è stato aperto su un altro dispositivo. Verrai disconnesso.",
              variant: "destructive",
            });
            
            // Disconnetti dopo 3 secondi
            setTimeout(() => {
              handleForceLogout();
            }, 3000);
          }
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('New user joined:', newPresences);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('User left:', leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Traccia la presenza di questo dispositivo
            const deviceInfo = navigator.userAgent.substring(0, 100);
            const presenceData = {
              user_id: session.user.id,
              device_info: deviceInfo,
              timestamp: new Date().toISOString(),
              session_id: `${session.user.id}_${Date.now()}`
            };

            await channel.track(presenceData);
            
            // Registra sessione nel database
            try {
              const { data: sessionToken } = await supabase.rpc('ensure_single_session', {
                user_id_input: session.user.id,
                device_info_input: deviceInfo,
                ip_address_input: 'browser' // Browser non può accedere all'IP direttamente
              });

              setSessionManager({
                sessionToken,
                isActive: true
              });
            } catch (error) {
              console.error('Error creating session:', error);
            }
          }
        });
    };

    const handleForceLogout = async () => {
      try {
        if (channel) {
          await channel.unsubscribe();
        }
        await supabase.auth.signOut();
        setSessionManager({ sessionToken: null, isActive: false });
        navigate('/login', { replace: true });
      } catch (error) {
        console.error('Error during forced logout:', error);
      }
    };

    // Setup del listener per auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setupSingleSession();
      } else if (event === 'SIGNED_OUT') {
        if (channel) {
          channel.unsubscribe();
          channel = null;
        }
        setSessionManager({ sessionToken: null, isActive: false });
      }
    });

    // Setup iniziale se già loggato
    setupSingleSession();

    return () => {
      subscription.unsubscribe();
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [navigate]);

  return sessionManager;
};

export default useSingleSession;