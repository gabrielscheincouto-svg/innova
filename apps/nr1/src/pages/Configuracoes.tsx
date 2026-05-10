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
        <p className="text-sm text-ink-700 mt-1">Conta · senha · sessão</p>
      </div>

      <div className="card">
        <h3 className="font-extrabold text-base mb-4">Sua conta</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Nome" value={profile?.full_name} />
          <Field label="E-mail" value={profile?.email} />
          <Field label="Perfil" value={profile?.role} />
          <Field label="Membro desde" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : '—'} />
        </div>
      </div>

      <div className="card">
        <h3 className="font-extrabold text-base mb-4">Trocar senha</h3>
        <div className="space-y-3 max-w-md">
          <div>
            <label className="label">Nova senha (mín. 8)</label>
            <input type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div>
            <label className="label">Confirme</label>
            <input type="password" className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <button onClick={handleChangePassword} disabled={saving} className="btn btn-primary disabled:opacity-50">
            {saving ? <Spinner size={16} /> : 'Trocar senha'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-bold">{label}</div>
      <div className="font-bold mt-1">{value || '—'}</div>
    </div>
  );
}
