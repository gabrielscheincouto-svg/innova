import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@innova/auth';

/**
 * Guard de rota: só deixa entrar se logado E for gestor.
 */
export function ProtectedRoute() {
  const profile = useAuth((s) => s.profile);

  if (!profile) {
    return <Navigate to="/login" replace />;
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
          <p className="mt-1 text-xs text-ink-500">Seu perfil: {profile.role}</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
