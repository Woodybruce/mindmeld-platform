import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  // When true, renders a full-screen fallback with a hard reload (for wrapping
  // the whole app). When false/omitted, renders an inline per-section fallback.
  fullScreen?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { fullScreen, fallbackTitle } = this.props;
      return (
        <div
          className={
            fullScreen
              ? "min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center"
              : "flex flex-col items-center justify-center py-12 px-6 text-center"
          }
          data-testid="error-boundary-fallback"
        >
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="font-display text-base font-semibold text-foreground mb-1">
            {fallbackTitle || "Something went wrong"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {fullScreen
              ? "The app ran into a problem while starting up. Reloading usually fixes it."
              : "This section encountered an error. The rest of the app still works."}
          </p>
          <button
            onClick={fullScreen ? () => window.location.reload() : this.handleRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            data-testid="button-error-retry"
          >
            <RefreshCw className="w-4 h-4" />
            {fullScreen ? "Reload" : "Try again"}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
