import { Component, type ErrorInfo, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import i18n from "@/lib/i18n";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

/** Last-resort guard: render errors must never blank the window. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message ?? String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
          <TriangleAlert className="size-10 text-destructive" />
          <h1 className="text-lg font-semibold">ERR-v3 {i18n.t("error.title")}</h1>
          <p className="max-w-md text-sm text-muted-foreground">{i18n.t("error.description")}</p>
          {this.state.message && (
            <textarea
              readOnly
              value={this.state.message}
              aria-label="error-detail"
              className="w-72 resize-none rounded border bg-muted px-3 py-2 font-mono text-xs"
              rows={3}
            />
          )}
          <Button onClick={() => window.location.reload()}>{i18n.t("common.retry")}</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
