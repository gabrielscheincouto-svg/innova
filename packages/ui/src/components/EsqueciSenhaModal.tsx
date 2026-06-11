/**
 * Modal "Esqueci minha senha" — pequeno popup com email + botão.
 * Usado dentro do Login dos 3 apps.
 */
import { useState, type FormEvent } from 'react';
import { requestPasswordReset } from '@innova/auth';
import { Spinner } from './Spinner';
import { useToast } from './Toast';

interface Props {
  onClose: () => void;
}

export function EsqueciSenhaModal({ onClose }: Props) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    // Calcula o subpath atual (/nr1, /gestor, /premios) pra que o link do email
    // volte pro app certo.
    const subpath = window.location.pathname.split('/').filter(Boolean)[0] || '';
    const prefix = subpath ? `/${subpath}` : '';
    const redirectTo = `${window.location.origin}${prefix}/reset-password`;
    const r = await requestPasswordReset(email, redirectTo);
    setSending(false);
    if (!r.ok) { toast(r.error, 'danger'); return; }
    setSent(true);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-4xl shadow-2xl max-w-md w-full p-7" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <div className="text-center py-3">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-ok/10 grid place-items-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h3 className="font-display text-xl mb-2">Email enviado</h3>
            <p className="text-sm text-ink-700 mb-5">
              Se o email <strong>{email}</strong> está cadastrado, você vai receber um link em alguns segundos pra redefinir sua senha.
              Confira a caixa de entrada (e o spam).
            </p>
            <button onClick={onClose} className="btn btn-primary">Fechar</button>
          </div>
        ) : (
          <>
            <h3 className="font-display text-2xl mb-1">Esqueci minha senha</h3>
            <p className="text-sm text-ink-700 mb-5">Informe seu email e enviaremos um link pra você criar uma nova senha.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="btn btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={sending || !email} className="btn btn-primary flex-1 justify-center disabled:opacity-50">
                  {sending ? <Spinner size={14} /> : 'Enviar link'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
