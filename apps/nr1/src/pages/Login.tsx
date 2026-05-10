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
    if (!result.ok) setError(result.error);
    else toast('Login bem-sucedido', 'ok');
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10 bg-gradient-to-br from-[#E2DFF4] to-[#FAFAFC] relative">
      <a
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm font-bold text-ink-700 hover:text-accent-700 bg-white/70 backdrop-blur rounded-full pl-3 pr-4 py-2 border border-black/5 hover:border-accent-300 transition"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Voltar pra Innova
      </a>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size={48} product="nr1" className="justify-center mb-6" />
          <h1 className="font-display text-3xl">Sistema NR1</h1>
          <p className="text-sm text-ink-700 mt-1">Profissional · Proprietário</p>
        </div>

        <div className="bg-white rounded-4xl shadow-soft p-8">
          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger rounded-2xl px-4 py-3 mb-5 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label className="label">Senha</label>
              <input type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <button type="submit" disabled={loading || !email || !password} className="w-full btn btn-primary justify-center disabled:opacity-50">
              {loading ? <Spinner size={16} /> : <>Entrar →</>}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-ink-500 mt-6">
          É colaborador? Acesse pelo link único enviado pela sua empresa.
        </p>
      </div>
    </div>
  );
}
