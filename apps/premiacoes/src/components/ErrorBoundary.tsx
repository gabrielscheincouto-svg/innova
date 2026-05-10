import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[Premiações] ErrorBoundary:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="card max-w-xl w-full text-center">
          <div className="w-14 h-14 rounded-full bg-danger/10 grid place-items-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h1 className="font-display text-2xl mb-2">Algo travou nessa tela</h1>
          <p className="text-sm text-ink-700 mb-4">{this.state.error.message || 'Erro desconhecido'}</p>
          <details className="text-left text-xs text-ink-500 mb-4">
            <summary className="cursor-pointer font-bold mb-2">Detalhes técnicos</summary>
            <pre className="whitespace-pre-wrap bg-surface-muted p-3 rounded-xl overflow-x-auto">{this.state.error.stack}</pre>
          </details>
          <div className="flex gap-2 justify-center">
            <button onClick={this.reset} className="btn btn-primary">Tentar de novo</button>
            <button onClick={() => (window.location.href = '/premios/')} className="btn">Voltar pro Dashboard</button>
          </div>
        </div>
      </div>
    );
  }
}
