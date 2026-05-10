import { useEffect, useState } from 'react';
import { useAuth, updatePassword } from '@innova/auth';
import { Spinner, useToast } from '@innova/ui';
import { getSupabase, type Company } from '@innova/supabase';
import { usePremios } from '../lib/store';

export function Configuracoes() {
  const profile = useAuth((s) => s.profile);
  const { currentCompanyId, setCompany } = usePremios();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      // só lista empresas que têm 'premiacoes' no system_access
      const { data } = await sb
        .from('companies')
        .select('*')
        .contains('system_access', ['premiacoes'])
        .order('legal_name', { ascending: true });
      setCompanies((data || []) as Company[]);
      setLoadingCompanies(false);
    })();
  }, []);

  async function handleChange() {
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
        <p className="text-sm text-ink-700 mt-1">Empresa atual · conta · senha</p>
      </div>

      <div className="card">
        <h3 className="font-extrabold text-base mb-1">Empresa atual</h3>
        <p className="text-xs text-ink-500 mb-4">Escolha qual empresa você vai operar. Tudo no app (colaboradores, avaliações, folha) é dessa empresa.</p>
        {loadingCompanies ? (
          <Spinner size={20} className="text-accent-500" />
        ) : companies.length === 0 ? (
          <p className="text-sm text-ink-500">Nenhuma empresa tem o sistema Premiações liberado. Peça pro Gestor liberar.</p>
        ) : (
          <select
            className="input max-w-md"
            value={currentCompanyId || ''}
            onChange={(e) => setCompany(e.target.value || null)}
          >
            <option value="">— selecione —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="card">
        <h3 className="font-extrabold text-base mb-4">Sua conta</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Nome" value={profile?.full_name} />
          <Field label="E-mail" value={profile?.email} />
          <Field label="Perfil" value={profile?.role} />
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
          <button onClick={handleChange} disabled={saving} className="btn btn-primary disabled:opacity-50">
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
