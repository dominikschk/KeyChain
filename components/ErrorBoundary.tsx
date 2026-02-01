import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-cream flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-red-50 p-10 rounded-[3rem] border border-red-100 shadow-2xl space-y-6 max-w-md">
            <AlertTriangle size={64} className="text-red-500 mx-auto animate-bounce" />
            <div className="space-y-2">
              <h2 className="font-headline text-2xl font-extrabold uppercase tracking-tight text-navy">
                Etwas ist schiefgelaufen
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
              </p>
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-8 py-3 bg-navy text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-petrol transition-colors"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
