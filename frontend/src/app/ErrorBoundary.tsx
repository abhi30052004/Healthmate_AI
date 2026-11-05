import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in HealthMate UI:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-3xl border border-red-200 shadow-raised p-8 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-display font-bold text-[var(--green-900)]">
                Something went wrong
              </h2>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                A temporary error occurred in the user interface. Your patient records remain safe and untouched.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
