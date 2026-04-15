import React, { Component, ErrorInfo, ReactNode } from 'react';
import { TriangleAlert, RefreshCw } from 'lucide-react';

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
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zen-cream flex items-center justify-center p-6 font-sans">
          <div className="bg-white/80 p-10 rounded-[3rem] shadow-2xl border border-zen-brown/15 max-w-xl w-full text-center">
            <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <TriangleAlert size={40} />
            </div>
            <h1 className="text-3xl font-serif font-bold text-zen-brown mb-4 tracking-tight">App Sanctuary Interrupted</h1>
            <p className="text-zen-brown/60 mb-8 mx-auto leading-relaxed">
              We encountered an unexpected disruption in the interface flow. The system has automatically halted to protect your workflow.
            </p>
            
            <div className="bg-zen-cream/30 p-4 rounded-2xl mb-8 text-left overflow-auto max-h-40 border border-red-100">
               <p className="text-xs font-mono text-red-500 font-bold whitespace-pre-wrap">
                 {this.state.error?.toString()}
               </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-zen-brown text-white font-bold uppercase tracking-widest text-xs rounded-full hover:bg-black transition-colors shadow-xl shadow-zen-brown/20 flex items-center gap-3 mx-auto"
            >
              <RefreshCw size={14} /> Restart Interface
            </button>
          </div>
        </div>
      );
    }

    return <>{(this as any).props.children}</>;
  }
}
