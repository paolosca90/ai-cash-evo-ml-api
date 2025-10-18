import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Smartphone, Monitor } from "lucide-react";

const EconomicCalendar = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [userTimeZone] = useState(57); // Fixed GMT+2 timezone

  useEffect(() => {
    // Detecta se è mobile o desktop
    const checkViewport = () => {
      const width = window.innerWidth;
      setIsMobileView(width < 768);
    };
    
    checkViewport();
    window.addEventListener('resize', checkViewport);
    
    console.log('🕐 Fuso orario impostato: GMT+2 (Codice: 57)');
    
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.innerHTML = '';

    // Parametri ottimizzati per diverse dimensioni schermo
    const mobileHeight = 450;
    const tabletHeight = 550;
    const desktopHeight = 700;
    const largeDesktopHeight = 750;
    
    const getHeight = () => {
      const width = window.innerWidth;
      if (width < 768) return mobileHeight;
      if (width < 1024) return tabletHeight;
      if (width < 1440) return desktopHeight;
      return largeDesktopHeight;
    };
    
    const height = getHeight();
    
    // Colonne ottimizzate per ogni viewport
    const mobileColumns = 'exc_flags,exc_currency,exc_importance,exc_actual';
    const tabletColumns = 'exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast';
    const desktopColumns = 'exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous';
    const largeDesktopColumns = 'exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous,exc_volat';
    
    const getColumns = () => {
      const width = window.innerWidth;
      if (width < 768) return mobileColumns;
      if (width < 1024) return tabletColumns;
      if (width < 1440) return desktopColumns;
      return largeDesktopColumns;
    };
    
    const columns = getColumns();

    // Container per il widget
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'economicCalendarWidget';
    widgetContainer.className = 'w-full flex justify-center';
    
    widgetContainer.innerHTML = `
      <div class="w-full ${isMobileView ? 'max-w-full' : 'max-w-7xl'}">
        <iframe 
          src="https://sslecal2.investing.com?columns=${columns}&features=datepicker,timezone,timezones&calType=week&timeZone=${userTimeZone}&lang=1&importance=3" 
          width="100%" 
          height="${height}" 
          frameborder="0" 
          allowtransparency="true" 
          marginwidth="0" 
          marginheight="0"
          style="border: none; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
          loading="lazy"
          title="Calendario Economico Investing.com"
        ></iframe>
      </div>
    `;

    el.appendChild(widgetContainer);

    return () => {
      el.innerHTML = '';
    };
  }, [isMobileView, userTimeZone]);

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 space-y-4 sm:space-y-6">
      {/* Header centrato e responsive */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
            <Calendar className="w-5 h-5 text-primary" />
            {isMobileView ? (
              <Smartphone className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Monitor className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
        
        <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground">
          🔴 Calendario Economico Premium
        </h2>
        
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mx-auto">
          🔴 Solo eventi ad ALTISSIMA IMPORTANZA (3 tori) • Visualizzazione settimanale • Market movers
        </p>
      </div>

      {/* Widget container centrato e responsive */}
      <div className="w-full">
        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
          {/* Indicator bar */}
          <div className="bg-gradient-to-r from-red-500/20 via-red-400/10 to-red-500/20 p-2 sm:p-3">
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="hidden sm:inline">🔴 PREMIUM</span>
              <span className="sm:hidden">PREMIUM</span>
              <span>•</span>
              <span>Solo massima importanza</span>
              <span className="hidden sm:inline">• Vista settimanale</span>
            </div>
          </div>
          
          {/* Calendar widget con dimensioni ottimizzate */}
          <div className="p-1 sm:p-2 lg:p-4">
            <div 
              ref={containerRef} 
              className="w-full rounded-lg overflow-hidden"
              style={{ 
                minHeight: isMobileView ? 450 : window.innerWidth > 1440 ? 750 : 700,
                maxWidth: '100%' 
              }} 
            />
          </div>
        </div>
      </div>

      {/* Info footer responsive con più dettagli per desktop */}
      <div className="text-center space-y-2 sm:space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
          <span className="flex items-center gap-1 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Tempo reale</span>
          </span>
          <span>•</span>
          <span>🕐 GMT+2 (Ora Europea Centrale)</span>
          <span>•</span>
          <span className="hidden sm:inline">🔴 Solo 3 tori (massima importanza)</span>
          <span className="hidden lg:inline">•</span>
          <span className="hidden lg:inline">📅 Vista settimanale</span>
        </div>
        
        {isMobileView && (
          <div className="text-xs text-primary/70 bg-primary/5 rounded-lg p-2 mx-4">
            💡 Ruota il dispositivo per una visualizzazione ottimale
          </div>
        )}
        
        {!isMobileView && window.innerWidth > 1024 && (
          <div className="text-xs text-muted-foreground bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mx-auto max-w-2xl">
            <div className="flex items-center justify-center gap-4">
              <span className="flex items-center gap-1">
                <span>🔴🔴🔴</span>
                <span className="font-medium text-red-600 dark:text-red-400">MASSIMA IMPORTANZA</span>
              </span>
              <span>•</span>
              <span>Solo market movers della settimana</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EconomicCalendar;