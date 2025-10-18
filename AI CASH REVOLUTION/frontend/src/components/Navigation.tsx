import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, User, LogOut, Download, Menu, X, Shield } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    setIsAdmin(roles?.some(r => r.role === 'admin') || false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const navItems = [
    { path: "/profile", label: "Profile", icon: User },
    { path: "/trading", label: "Trading Chart", icon: BarChart3 },
    { path: "/mt5-setup", label: "Setup MT5", icon: Download },
    ...(isAdmin ? [{ path: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            <span className="text-lg md:text-xl font-bold truncate">
              {isMobile ? "AI CASH" : "AI CASH R-EVOLUTION"}
            </span>
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <div className="flex items-center gap-2 xl:gap-4">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={location.pathname === item.path ? "default" : "ghost"}
                    className="flex items-center gap-2 text-sm"
                    size="sm"
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Button>
                </Link>
              ))}
              <Button variant="outline" onClick={logout} size="sm">
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline ml-2">Esci</span>
              </Button>
            </div>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          )}
        </div>

        {/* Mobile Navigation Menu */}
        {isMobile && mobileMenuOpen && (
          <div className="mt-4 pb-4 border-t border-border pt-4 space-y-2">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={closeMobileMenu}>
                <Button
                  variant={location.pathname === item.path ? "default" : "ghost"}
                  className="w-full justify-start gap-3"
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Button>
              </Link>
            ))}
            <Button variant="outline" onClick={() => { logout(); closeMobileMenu(); }} className="w-full justify-start gap-3 mt-2">
              <LogOut className="w-5 h-5" />
              Esci
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;