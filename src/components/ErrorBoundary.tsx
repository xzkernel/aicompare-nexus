import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="w-full max-w-md mx-auto mt-8 border-red-500/30 bg-[#1a1214]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <CardTitle className="text-red-300">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-zinc-400 text-sm">
              An unexpected error occurred while rendering this component.
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm font-medium text-red-400 hover:text-red-300">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-red-500/10 rounded text-xs font-mono text-red-300 overflow-auto">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
