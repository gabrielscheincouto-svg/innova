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
    const r = await signIn(email, password);
    setLoading(false);
    if (!r.ok) setError(r.error);
    else toast('Login bem-sucedido', 'ok');
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10 bg-gradient-to-br from-[#E2DFF4] to-[#FAFAFC]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size={48} product="premiacoes" className="justify-center mb-6" />
          <h1 className="font-display text-3xl">Sistema Premiações</h1>
          <p className="text-sm text-ink-700 mt-1">Programa Art. 457 §2 CLT · acesso do proprietário</p>
        </div>
        <div className="bg-white rounded-4xl shadow-soft p-8">
          {error && <div className="bg-danger/10 border border-danger/20 text-danger rounded-2xl px-4 py-3 mb-5 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="label">E-mail</label><input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label className="label">Senha</label><input type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <button type="submit" disabled={loading || !email || !password} className="w-full btn btn-primary justify-center disabled:opacity-50">
              {loading ? <Spinner size={16} /> : <>Entrar →</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
