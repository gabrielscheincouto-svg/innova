import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, signOut } from '@innova/auth';

/**
 * Guard de rota: só deixa entrar se logado E for gestor.
 */
export function ProtectedRoute() {
  const profile = useAuth((s) => s.profile);
  const navigate = useNavigate();

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  async function handleSwitchUser() {
    await signOut();
    navigate('/login', { replace: true });
  }

  if (profile.role !== 'gestor') {
    return (
      <div className="min-h-screen grid place-items-center p-8">
        <div className="bg-white rounded-4xl p-10 max-w-md text-center shadow-soft">
          <div className="w-16 h-16 rounded-3xl bg-danger/10 grid place-items-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl">Acesso restrito</h2>
          <p className="mt-2 text-sm text-ink-700">
            Esta área é apenas para usuários com perfil <strong>Gestor</strong>.
          </p>
          <p className="mt-1 text-xs text-ink-500 mb-6">
            Logado como <strong>{profile.email || profile.id}</strong> · perfil: {profile.role}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSwitchUser}
              className="bg-ink-900 text-white font-bold text-sm rounded-2xl px-5 py-3 hover:bg-accent-700 transition"
            >
              Entrar com outra conta
            </button>
            <a
              href="/premios/"
              className="text-xs text-ink-500 hover:text-ink-900 transition pt-1"
            >
              ou voltar para Premiações →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
