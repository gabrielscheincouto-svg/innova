/**
 * Página de redefinição de senha (compartilhada entre os 3 apps).
 *
 * Fluxo:
 *   1. Usuário recebe email com link tipo:
 *      https://inovacapital.netlify.app/reset-password#access_token=...&type=recovery
 *   2. Esse componente lê o hash, valida a sessão temporária do Supabase
 *   3. Mostra form de nova senha
 *   4. Chama updatePassword e redireciona pro /login
 *
 * IMPORTANTE — Configuração no Supabase Dashboard:
 *   Authentication → URL Configuration
 *     • Site URL: https://inovacapital.netlify.app
 *     • Redirect URLs: https://inovacapital.netlify.app/**
 *   Sem isso o link do email aponta pra localhost e dá erro otp_expired.
 */
import { useEffect, useState } from 'react';
import { updatePassword, getSession } from '@innova/auth';
import { Spinner } from './Spinner';
import { useToast } from './Toast';
import { LogoMark } from './Logo';

type Stage = 'checking' | 'ready' | 'success' | 'invalid';

interface Props {
  /** Caminho pra onde redirecionar após trocar a senha (default: /login) */
  loginPath?: string;
  /** Nome do produto (NR1 / Premiações / Gestor) — só pra exibição */
  productLabel?: string;
}

export function ResetPasswordPage({ loginPath = '/login', productLabel = 'Innova' }: Props) {
  const [stage, setStage] = useState<Stage>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      // Se vier com erro no hash (otp_expired, access_denied, etc), captura
      const hash = window.location.hash;
      if (hash.includes('error=')) {
        const params = new URLSearchParams(hash.slice(1));
        const err = params.get('error_description') || params.get('error') || 'Link inválido';
        setErrorMessage(decodeURIComponent(err.replace(/\+/g, ' ')));
        setStage('invalid');
        return;
      }

      // O Supabase já processa o token do hash automaticamente em onAuthStateChange.
      // Esperamos um instante e checamos se há sessão de recovery ativa.
      await new Promise((r) => setTimeout(r, 350));
      const session = await getSession();
      if (session) setStage('ready');
      else {
        setErrorMessage('Sessão de recuperação não encontrada. Solicite novo link.');
        setStage('invalid');
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { toast('Senha precisa de pelo menos 8 caracteres', 'warn'); return; }
    if (pw !== pw2) { toast('As senhas não coincidem', 'warn'); return; }
    setSaving(true);
    const r = await updatePassword(pw);
    setSaving(false);
    if (!r.ok) { toast(r.error, 'danger'); return; }
    setStage('success');
    setTimeout(() => { window.location.href = loginPath; }, 2200);
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10 bg-gradient-to-br from-[#E2DFF4] to-[#FAFAFC]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block mb-5"><LogoMark size={48} /></div>
          <h1 className="font-display text-3xl">Redefinir senha</h1>
          <p className="text-sm text-ink-700 mt-1">{productLabel}</p>
        </div>

        <div className="bg-white rounded-4xl shadow-soft p-8">
          {stage === 'checking' && (
            <div className="py-10 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
          )}

          {stage === 'invalid' && (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-danger/10 grid place-items-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h2 className="font-display text-xl mb-2">Link inválido ou expirado</h2>
              <p className="text-sm text-ink-700 mb-5">{errorMessage}</p>
              <a href={loginPath} className="btn btn-primary inline-flex">Voltar pro login</a>
            </div>
          )}

          {stage === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-ink-700 mb-2">Defina uma nova senha pra sua conta. Mínimo 8 caracteres.</p>
              <div>
                <label className="label">Nova senha</label>
                <input type="password" required minLength={8} className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus />
              </div>
              <div>
                <label className="label">Confirme a nova senha</label>
                <input type="password" required minLength={8} className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
              </div>
              <button type="submit" disabled={saving || !pw || !pw2} className="w-full btn btn-primary justify-center disabled:opacity-50">
                {saving ? <Spinner size={16} /> : 'Redefinir senha'}
              </button>
            </form>
          )}

          {stage === 'success' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-ok/10 grid place-items-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 className="font-display text-xl mb-2">Senha redefinida</h2>
              <p className="text-sm text-ink-700">Redirecionando pra tela de login…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
