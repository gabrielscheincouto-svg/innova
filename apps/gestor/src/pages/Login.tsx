import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { signIn, useAuth } from '@innova/auth';
import { Logo, Spinner, useToast } from '@innova/ui';

export function Login() {
  const profile = useAuth((s) => s.profile);
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (profile) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
    } else {
      toast('Login bem-sucedido', 'ok');
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10 bg-gradient-to-br from-[#E2DFF4] to-[#FAFAFC]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size={48} product="gestor" className="justify-center mb-6" />
          <h1 className="font-display text-3xl">Painel do Gestor</h1>
          <p className="text-sm text-ink-700 mt-1">Acesso master · administração de empresas e usuários</p>
        </div>

        <div className="bg-white rounded-4xl shadow-soft p-8">
          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger rounded-2xl px-4 py-3 mb-5 text-sm flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="gestor@innova.com.br"
              />
            </div>
            <div>
              <label className="label">Senha</label>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full btn btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Spinner size={16} /> : <>Entrar →</>}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-black/5 text-center text-xs text-ink-500">
            <p className="flex items-center justify-center gap-2">
              <ShieldDot /> Conexão segura · TLS 1.3 · 2FA disponível
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-ink-500 mt-6">
          Esqueceu a senha? <a href="mailto:contato@innova.com.br" className="text-accent-600 font-bold">contato@innova.com.br</a>
        </p>
      </div>
    </div>
  );
}

function ShieldDot() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
