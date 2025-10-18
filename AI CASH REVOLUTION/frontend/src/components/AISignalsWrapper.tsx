import React, { Suspense } from 'react';
import { AISignals } from './AISignals';
import { AISignalsErrorBoundary } from './error-boundaries/AISignalsErrorBoundary';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, Loader2 } from 'lucide-react';

interface AISignalsWrapperProps {
  symbol: string;
}

// Loading fallback component
const AISignalsLoadingFallback = () => (
  <Card className="bg-card border-border">
    <CardContent className="pt-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Loading AI Signals</h3>
          <p className="text-sm text-muted-foreground">Initializing AI signal generation system...</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Error fallback component
const AISignalsErrorFallback = () => (
  <Card className="bg-card border-border">
    <CardContent className="pt-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Bot className="w-12 h-12 text-muted-foreground opacity-50" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">AI Signals Unavailable</h3>
          <p className="text-sm text-muted-foreground">
            The AI signal generation service is currently unavailable.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Please try again later or contact support if the problem persists.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Wrapper component that provides error boundary and loading states
export const AISignalsWrapper: React.FC<AISignalsWrapperProps> = ({ symbol }) => {
  return (
    <AISignalsErrorBoundary fallback={<AISignalsErrorFallback />}>
      <Suspense fallback={<AISignalsLoadingFallback />}>
        <AISignals symbol={symbol} />
      </Suspense>
    </AISignalsErrorBoundary>
  );
};

export default AISignalsWrapper;