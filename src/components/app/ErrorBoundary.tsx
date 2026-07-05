import { Component, type ErrorInfo, type ReactNode } from "react";
import { Logo } from "../ui/Logo";
import { Button } from "../ui/Button";

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Top-level error boundary. Catches render-time crashes and shows a calm,
 * on-brand fallback instead of a blank white screen. Kept intentionally plain:
 * no stack traces to the user, a clear recovery action, and a reload escape hatch.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Wire this to an error reporter (e.g. Sentry) in production if desired.
    console.error("[Wirby] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="font-mono text-sm text-ink-faint">Something broke</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
            That is on us, not on you.
          </h1>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-soft">
            An unexpected error interrupted the page. Your data is safe. Reload to pick up
            where you left off.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Button onClick={() => window.location.reload()}>Reload the page</Button>
            <a href="/app" className="text-sm font-medium text-pine-700 underline hover:no-underline">
              Back to overview
            </a>
          </div>
        </div>
      </div>
    );
  }
}
