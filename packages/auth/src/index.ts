import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';
import { getSupabase, logAudit, type Profile, type UserRole } from '@innova/supabase';

// ============================================================
// Auth store (Zustand)
// ============================================================
interface AuthState {
  loading: boolean;
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
  setLoading: (l: boolean) => void;
  hasRole: (...roles: UserRole[]) => boolean;
  isGestor: () => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      loading: true,
      profile: null,
      setProfile: (profile) => set({ profile, loading: false }),
      setLoading: (loading) => set({ loading }),
      hasRole: (...roles) => {
        const role = get().profile?.role;
        return role ? roles.includes(role) : false;
      },
      isGestor: () => get().profile?.role === 'gestor',
    }),
    {
      name: 'innova-auth-store',
      partialize: (state) => ({ profile: state.profile }), // não persiste loading
    }
  )
);

// ============================================================
// Hooks
// ============================================================

/**
 * Inicializa listener de auth do Supabase.
 * Chame UMA VEZ no topo da app (App.tsx).
 */
export function useAuthInit() {
  const setProfile = useAuth((s) => s.setProfile);
  const setLoading = useAuth((s) => s.setLoading);

  useEffect(() => {
    const sb = getSupabase();

    async function loadProfile(userId: string) {
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('[auth] Erro ao carregar profile:', error);
        setProfile(null);
        return;
      }

      if (!data.is_active) {
        console.warn('[auth] Usuário inativo. Sessão derrubada.');
        await sb.auth.signOut();
        setProfile(null);
        return;
      }

      setProfile(data as Profile);
    }

    // Sessão atual
    sb.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        loadProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listener de mudanças
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setProfile(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadProfile(session.user.id);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [setLoading, setProfile]);
}

// ============================================================
// Actions
// ============================================================

/**
 * Login com email e senha.
 * Após sucesso, atualiza last_login_at e registra audit log.
 */
export async function signIn(email: string, password: string) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false as const, error: traduzirErro(error.message) };
  }

  if (data.user) {
    // atualiza last_login_at (best-effort)
    await sb
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);

    await logAudit({
      action: 'login',
      resource_type: 'auth',
      resource_id: data.user.id,
    });
  }

  return { ok: true as const };
}

export async function signOut() {
  const sb = getSupabase();
  await logAudit({ action: 'logout', resource_type: 'auth' });
  await sb.auth.signOut();
}

/**
 * Reset de senha — envia email com link mágico
 */
export async function requestPasswordReset(email: string, redirectTo?: string) {
  const sb = getSupabase();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || `${window.location.origin}/reset-password`,
  });
  if (error) return { ok: false as const, error: traduzirErro(error.message) };
  return { ok: true as const };
}

export async function updatePassword(newPassword: string) {
  const sb = getSupabase();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return { ok: false as const, error: traduzirErro(error.message) };
  await logAudit({ action: 'password_changed', resource_type: 'auth' });
  return { ok: true as const };
}

/**
 * Retorna a sessão atual (usada na página de reset de senha pra
 * verificar se o token do email foi processado).
 */
export async function getSession() {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  return data.session;
}

/**
 * Tradução básica de mensagens de erro do Supabase
 */
function traduzirErro(msg: string): string {
  const dict: Record<string, string> = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'Email not confirmed': 'E-mail ainda não confirmado.',
    'User not found': 'Usuário não encontrado.',
    'Password should be at least 6 characters': 'Senha deve ter no mínimo 6 caracteres.',
    'New password should be different from the old password': 'A nova senha deve ser diferente da atual.',
  };
  return dict[msg] || msg;
}
