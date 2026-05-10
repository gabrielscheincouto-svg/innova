import { useState } from 'react';
import { useAuth, updatePassword } from '@innova/auth';
import { Spinner, useToast } from '@innova/ui';

export function Configuracoes() {
  const profile = useAuth((s) => s.profile);
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleChangePassword() {
    if (pw.length < 8) { toast('Senha mínima 8 caracteres', 'warn'); return; }
    if (pw !== pw2) { toast('Senhas não coincidem', 'warn'); return; }
    setSaving(true);
    const r = await updatePassword(pw);
    setSaving(false);
    if (!r.ok) { toast(r.error, 'danger'); return; }
    toast('Senha alterada', 'ok');
    setPw(''); setPw2('');
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-display text-4xl">Configurações</h1>
        <p className="text-sm text-ink-700 mt-1">Conta · segurança · sessão</p>
      </div>

      <div className="card">
        <h3 className="font-extrabold text-base mb-4">Sua conta</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-500 font-bold">Nome</div>
            <div className="font-bold mt-1">{profile?.full_name}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-500 font-bold">E-mail</div>
            <div className="font-bold mt-1">{profile?.email}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-500 font-bold">Perfil</div>
            <div className="font-bold mt-1"><span className="pill pill-accent">{profile?.role}</span></div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-500 font-bold">Membro desde</div>
            <div className="font-bold mt-1">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : '—'}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-extrabold text-base mb-4">Trocar senha</h3>
        <div className="space-y-3 max-w-md">
          <div>
            <label className="label">Nova senha (mín. 8 caracteres)</label>
            <input type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div>
            <label className="label">Confirme a nova senha</label>
            <input type="password" className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <button onClick={handleChangePassword} disabled={saving || !pw || !pw2} className="btn btn-primary disabled:opacity-50">
            {saving ? <Spinner size={16} /> : 'Trocar senha'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-extrabold text-base mb-4">Segurança</h3>
        <div className="space-y-3">
          <SecurityRow label="TLS 1.3" desc="Criptografia em trânsito" status="ok" />
          <SecurityRow label="AES-256" desc="Banco e backups criptografados" status="ok" />
          <SecurityRow label="Row Level Security" desc="Cada cliente vê só seus dados" status="ok" />
          <SecurityRow label="Audit log" desc="Toda ação sensível é registrada" status="ok" />
          <SecurityRow label="2FA" desc="Configure no Supabase Dashboard" status="optional" />
        </div>
      </div>
    </div>
  );
}

function SecurityRow({ label, desc, status }: { label: string; desc: string; status: 'ok' | 'optional' }) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface-muted rounded-2xl">
      <div>
        <div className="font-bold text-sm">{label}</div>
        <div className="text-xs text-ink-500">{desc}</div>
      </div>
      {status === 'ok' ? <span className="pill pill-ok">Ativo</span> : <span className="pill pill-gray">Configurar</span>}
    </div>
  );
}
