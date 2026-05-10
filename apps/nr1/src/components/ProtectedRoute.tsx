import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@innova/auth';
import type { UserRole } from '@innova/supabase';

/**
 * Guard de rota base — exige login + role permitida no app NR1.
 */
export function ProtectedRoute() {
  const profile = useAuth((s) => s.profile);

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (!['profissional', 'proprietario', 'gestor'].includes(profile.role)) {
    return <AccessDenied profile={profile} />;
  }

  return <Outlet />;
}

/**
 * Guard mais restrito — só profissional/gestor (proprietário NÃO pode entrar).
 * Usado em rotas operacionais (criar/editar IPAR, gerar avaliação etc).
 */
export function ProfissionalOnlyRoute() {
  const profile = useAuth((s) => s.profile);
  const location = useLocation();

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (!['profissional', 'gestor'].includes(profile.role)) {
    // Se proprietário tentar acessar rota só-profissional, manda pro dashboard dele
    return <Navigate to="/" replace state={{ blocked: location.pathname }} />;
  }

  return <Outlet />;
}

/**
 * Guard só pra proprietário (suas páginas exclusivas).
 */
export function ProprietarioOnlyRoute() {
  const profile = useAuth((s) => s.profile);

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (!['proprietario', 'gestor'].includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function AccessDenied({ profile }: { profile: { role: UserRole } }) {
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
          Esta área é para usuários com perfil <strong>profissional</strong> ou <strong>proprietário</strong>.
        </p>
        <p className="mt-1 text-xs text-ink-500">Seu perfil: {profile.role}</p>
      </div>
    </div>
  );
}
