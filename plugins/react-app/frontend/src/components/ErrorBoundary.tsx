import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      const isChunkLoadFailed = this.state.error?.message?.toLowerCase().includes('fetch') ||
        this.state.error?.message?.toLowerCase().includes('dynamically imported');

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="ds-card-elevated max-w-lg w-full p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400 shadow-lg shadow-red-500/10">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">
                {isChunkLoadFailed ? 'Modül Yüklenemedi / Module Load Failed' : 'Bir Hata Oluştu / An Error Occurred'}
              </h3>
              <p className="text-sm text-slate-400">
                {isChunkLoadFailed
                  ? 'Uygulama sürümü güncellenmiş veya ağ bağlantısı kesilmiş olabilir. Sayfayı yenileyerek tekrar deneyebilirsiniz.'
                  : 'Bu görünüm yüklenirken beklenmeyen bir hata ile karşılaşıldı.'}
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-left">
                <p className="text-xs font-mono text-red-400 break-words line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="ds-btn-primary"
              >
                <RefreshCw size={16} />
                <span>Sayfayı Yenile / Reload</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="ds-btn-secondary"
              >
                <Home size={16} />
                <span>Ana Ekrana Dön / Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
