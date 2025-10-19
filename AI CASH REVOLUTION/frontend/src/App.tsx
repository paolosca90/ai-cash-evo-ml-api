import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTrialExpiry } from "@/hooks/useTrialExpiry";
import TrialExpiryPopup from "@/components/TrialExpiryPopup";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MT5Setup from "./pages/MT5Setup";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import Legal from "./pages/Legal";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PaymentSetup from "./pages/PaymentSetup";
import PaymentSuccess from "./pages/PaymentSuccess";
import MLTest from "./pages/MLTest";
import MLDashboard from "./pages/MLDashboard";

const queryClient = new QueryClient();

const AppContent = () => {
  const [user, setUser] = useState<any>(null);
  const { showPopup, userProfile, handleClosePopup } = useTrialExpiry({ user });

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user);
    };
    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/trading" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/payment-setup" element={<PaymentSetup />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/mt5-setup" element={<MT5Setup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/ml-test" element={<MLTest />} />
        <Route path="/ml-dashboard" element={<MLDashboard />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Trial expiry popup */}
      <TrialExpiryPopup
        isOpen={showPopup}
        onClose={handleClosePopup}
        userProfile={userProfile}
      />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
