import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  failed: boolean;
}

/**
 * Last line of defence: if a page throws while rendering, show a way out instead of a blank screen.
 * Deliberately has no app dependencies (router, contexts, UI kit), since any of those may be what broke.
 */
class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Lune crashed while rendering', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main role="alert" className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-card p-7 text-center">
          <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">This page hit an unexpected error. Your account and posts are safe. Reload to try again.</p>
          <div className="mt-6 flex justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-lune-500 px-5 py-2 text-sm font-semibold text-white hover:bg-lune-600">Reload</button>
            <a href="/" className="rounded-full border border-white/15 px-5 py-2 text-sm text-white/80 hover:bg-white/5">Go to feed</a>
          </div>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
