import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class MLComponentWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ML component ${this.props.componentName || 'Unknown'}:`, error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              ML Component Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {this.props.componentName && `Component: ${this.props.componentName}`}
                {this.state.error && ` - ${this.state.error.message}`}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The ML component encountered an error. This might be due to:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Missing ML model files or dependencies</li>
                <li>Temporary connection issues with ML services</li>
                <li>Incompatible data format</li>
                <li>Service initialization failure</li>
              </ul>

              <Button
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Loading
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export const withMLWrapper = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  const WrappedComponent = (props: P) => (
    <MLComponentWrapper componentName={componentName}>
      <Component {...props} />
    </MLComponentWrapper>
  );

  return WrappedComponent;
};