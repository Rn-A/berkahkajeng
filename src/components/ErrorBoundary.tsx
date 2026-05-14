import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-xl border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Terjadi Kesalahan Sistem</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
              Aplikasi mengalami kendala saat memuat komponen. Silakan coba segarkan halaman.
            </p>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl mb-8 text-left overflow-hidden">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Detail Error</p>
              <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300 break-all">
                {this.state.error?.message || "Unknown Error"}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <RefreshCw size={20} />
              Segarkan Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children || null;
  }
}

export default ErrorBoundary;
