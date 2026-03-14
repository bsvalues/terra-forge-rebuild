import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log to console for debugging — future: send to external service
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const title = this.props.fallbackTitle ?? "Something went wrong";

    return (
      <div
        role="alert"
        className="flex items-center justify-center min-h-[300px] p-6"
      >
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>

          <h2 className="text-lg font-semibold text-foreground">{title}</h2>

          <p className="text-sm text-muted-foreground leading-relaxed">
            An unexpected error occurred. You can retry or return to the
            dashboard. If the problem persists, contact your administrator.
          </p>

          {this.state.error && (
            <details className="text-left rounded-lg border border-border bg-muted/30 p-3">
              <summary className="text-xs text-muted-foreground cursor-pointer select-none">
                Technical details
              </summary>
              <pre className="mt-2 text-[10px] text-destructive/80 whitespace-pre-wrap break-all max-h-32 overflow-auto">
                {this.state.error.message}
                {this.state.errorInfo?.componentStack?.slice(0, 500)}
              </pre>
            </details>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={this.handleGoHome}>
              <Home className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
            <Button size="sm" onClick={this.handleRetry}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
