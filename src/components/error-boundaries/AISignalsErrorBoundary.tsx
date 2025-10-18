import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AISignalsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('AISignals Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // You can also log to an error reporting service here
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Reload the page or reinitialize component
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Signal Generation Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Bug className="w-12 h-12 text-destructive mx-auto opacity-50" />
                <h3 className="text-lg font-semibold text-foreground">
                  AI Signal Generation Failed
                </h3>
                <p className="text-sm text-muted-foreground">
                  Something went wrong while generating AI trading signals.
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-xs font-mono text-destructive mb-2">
                    Error: {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Technical Details</summary>
                      <pre className="mt-2 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-center">
                <Button onClick={this.handleReset} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Reload Component
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="default"
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </Button>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                <p>If this problem persists, please contact support.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}