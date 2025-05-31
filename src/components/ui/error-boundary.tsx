"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Alert, AlertTitle, AlertDescription, AlertActions } from "./alert";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface ErrorInfo {
  componentStack?: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: "page" | "component" | "critical";
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  errorId: string;
  level: "page" | "component" | "critical";
  showDetails: boolean;
}

// Generate unique error ID for tracking
function generateErrorId(): string {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Default error fallback component
function DefaultErrorFallback({
  error,
  errorInfo,
  resetError,
  errorId,
  level,
  showDetails,
}: ErrorFallbackProps) {
  const [detailsVisible, setDetailsVisible] = React.useState(false);

  const getErrorTitle = () => {
    switch (level) {
      case "critical":
        return "Critical Application Error";
      case "page":
        return "Page Error";
      case "component":
        return "Component Error";
      default:
        return "Something went wrong";
    }
  };

  const getErrorDescription = () => {
    switch (level) {
      case "critical":
        return "A critical error has occurred that prevents the application from functioning properly.";
      case "page":
        return "An error occurred while loading this page. You can try refreshing or go back to the home page.";
      case "component":
        return "A component failed to render properly. This may affect some functionality.";
      default:
        return "An unexpected error has occurred.";
    }
  };

  const handleReportError = () => {
    // In a real app, this would send error details to a logging service
    console.error("Error Report:", {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // Could integrate with services like Sentry, LogRocket, etc.
    alert(`Error reported with ID: ${errorId}`);
  };

  if (level === "component") {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{getErrorTitle()}</AlertTitle>
        <AlertDescription>
          {getErrorDescription()}
          {showDetails && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium">
                Error Details
              </summary>
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                {error.message}
              </pre>
            </details>
          )}
        </AlertDescription>
        <AlertActions>
          <Button variant="outline" size="sm" onClick={resetError}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
          {showDetails && (
            <Button variant="ghost" size="sm" onClick={handleReportError}>
              <Bug className="h-3 w-3 mr-1" />
              Report
            </Button>
          )}
        </AlertActions>
      </Alert>
    );
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">{getErrorTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {getErrorDescription()}
          </p>

          {showDetails && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetailsVisible(!detailsVisible)}
                className="w-full"
              >
                {detailsVisible ? "Hide" : "Show"} Error Details
              </Button>

              {detailsVisible && (
                <div className="space-y-2 text-xs">
                  <div>
                    <strong>Error ID:</strong> {errorId}
                  </div>
                  <div>
                    <strong>Message:</strong>
                    <pre className="mt-1 bg-muted p-2 rounded overflow-auto max-h-32">
                      {error.message}
                    </pre>
                  </div>
                  {error.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="mt-1 bg-muted p-2 rounded overflow-auto max-h-32">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 bg-muted p-2 rounded overflow-auto max-h-32">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            {level === "page" && (
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/")}
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            )}
          </div>

          {showDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReportError}
              className="w-full"
            >
              <Bug className="h-4 w-4 mr-2" />
              Report This Error
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Error boundary class component
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorInfoFormatted: ErrorInfo = {
      componentStack: errorInfo.componentStack || undefined,
      // Note: errorBoundary and errorBoundaryStack may not be available in all React versions
      // These are custom properties we can add if needed
    };

    this.setState({
      errorInfo: errorInfoFormatted,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfoFormatted);

    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          errorId={this.state.errorId}
          level={this.props.level || "component"}
          showDetails={
            this.props.showDetails ?? process.env.NODE_ENV === "development"
          }
        />
      );
    }

    return this.props.children;
  }
}

// Hook for handling async errors in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  // Throw error to be caught by error boundary
  if (error) {
    throw error;
  }

  return { handleError, resetError };
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

// Specialized error boundaries for different use cases
export function PageErrorBoundary({
  children,
  onError,
}: {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}) {
  return (
    <ErrorBoundary level="page" showDetails={false} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}

export function ComponentErrorBoundary({
  children,
  onError,
}: {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}) {
  return (
    <ErrorBoundary level="component" showDetails={true} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}

export function CriticalErrorBoundary({
  children,
  onError,
}: {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}) {
  return (
    <ErrorBoundary level="critical" showDetails={true} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}
