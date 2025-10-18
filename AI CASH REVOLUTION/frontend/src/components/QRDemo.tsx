import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, Smartphone, ArrowRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const QRDemo = () => {
  const navigate = useNavigate();
  
  // Demo QR code placeholder (static image)
  const demoQRCode = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <QrCode className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-xl font-display">Pagamento QR</CardTitle>
        <CardDescription>
          Il modo più veloce per pagare - scansiona e via!
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Demo QR Code */}
        <div className="text-center space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-muted max-w-48 mx-auto">
            <div className="grid grid-cols-10 gap-1">
              {/* Simple QR pattern demo */}
              {Array.from({ length: 100 }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 ${
                    Math.random() > 0.5 ? 'bg-black' : 'bg-white'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="w-4 h-4" />
            QR Code Demo - Non attivo
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-success/5 rounded-lg">
            <Zap className="w-5 h-5 text-success" />
            <div>
              <div className="font-medium text-sm">Istantaneo</div>
              <div className="text-xs text-muted-foreground">Pagamento in 3 secondi</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
            <QrCode className="w-5 h-5 text-primary" />
            <div>
              <div className="font-medium text-sm">Sicuro</div>
              <div className="text-xs text-muted-foreground">Crittografia avanzata</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
            <Smartphone className="w-5 h-5 text-accent" />
            <div>
              <div className="font-medium text-sm">Mobile-First</div>
              <div className="text-xs text-muted-foreground">Progettato per smartphone</div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-muted/30 p-4 rounded-lg">
          <h4 className="font-medium text-sm mb-3">Come funziona:</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
              <span>Inquadra il QR con la fotocamera</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
              <span>Tocca la notifica che appare</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-[10px] font-bold">3</div>
              <span>Completa il pagamento</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/qr-payment?plan=Demo&amount=9.99&annual=false')}
            className="w-full"
            size="lg"
          >
            Prova il Pagamento QR
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <div className="text-center">
            <Badge variant="secondary" className="text-xs">
              Demo gratuita disponibile
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};