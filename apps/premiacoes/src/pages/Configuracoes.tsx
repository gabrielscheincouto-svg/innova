import { useEffect, useState } from 'react';
import { useAuth, updatePassword } from '@innova/auth';
import { Spinner, useToast } from '@innova/ui';
import { getSupabase, METODOLOGIA_PADRAO, type Company, type MetodologiaPremio } from '@innova/supabase';
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

      <MetodologiaSection currentCompanyId={currentCompanyId} />

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

function MetodologiaSection({ currentCompanyId }: { currentCompanyId: string | null }) {
  const [met, setMet] = useState<MetodologiaPremio>(METODOLOGIA_PADRAO);
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!currentCompanyId) return;
    (async () => {
      setLoading(true);
      const sb = getSupabase();
      const { data } = await sb.from('companies').select('metodologia_premio').eq('id', currentCompanyId).maybeSingle();
      const m = (data as any)?.metodologia_premio as MetodologiaPremio | null;
      if (m && m.scale) {
        setMet(m);
        setIsCustom(true);
      } else {
        setMet(METODOLOGIA_PADRAO);
        setIsCustom(false);
      }
      setLoading(false);
    })();
  }, [currentCompanyId]);

  function setPercent(min_media: number, percent: number) {
    setMet((prev) => ({
      ...prev,
      scale: prev.scale.map((s) => (s.min_media === min_media ? { ...s, percent } : s)),
    }));
  }

  async function salvar() {
    if (!currentCompanyId) return;
    setSaving(true);
    const sb = getSupabase();
    const payload = isCustom ? met : null;
    const { error } = await sb.from('companies').update({ metodologia_premio: payload } as never).eq('id', currentCompanyId);
    setSaving(false);
    if (error) toast(error.message, 'danger');
    else toast(isCustom ? 'Metodologia salva' : 'Voltou para o padrão', 'ok');
  }

  function resetParaPadrao() {
    setMet(METODOLOGIA_PADRAO);
  }

  if (!currentCompanyId) {
    return (
      <div className="card">
        <h3 className="font-extrabold text-base mb-1">Metodologia padrão da empresa</h3>
        <p className="text-xs text-ink-500">Selecione uma empresa acima primeiro.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h3 className="font-extrabold text-base">Metodologia padrão da empresa</h3>
          <p className="text-xs text-ink-500 mt-1 max-w-2xl">
            Define como a média do colaborador vira % do teto. Vale pra todos os colaboradores que <strong>não têm metodologia personalizada</strong> no cadastro. Padrão Innova: 3 → 60% · 4 → 80% · 5 → 100% · &lt;3 → 0.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold whitespace-nowrap">
          <input type="checkbox" checked={isCustom} onChange={(e) => setIsCustom(e.target.checked)} className="w-4 h-4" />
          Personalizar
        </label>
      </div>

      {loading ? (
        <Spinner size={20} className="text-accent-500" />
      ) : (
        <>
          <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3 ${!isCustom ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="label">Média 5 → % do teto</label>
              <input className="input" type="number" min="0" max="200" value={met.scale.find((s) => s.min_media === 5)?.percent ?? 100} onChange={(e) => setPercent(5, Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Média 4 → %</label>
              <input className="input" type="number" min="0" max="200" value={met.scale.find((s) => s.min_media === 4)?.percent ?? 80} onChange={(e) => setPercent(4, Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Média 3 → %</label>
              <input className="input" type="number" min="0" max="200" value={met.scale.find((s) => s.min_media === 3)?.percent ?? 60} onChange={(e) => setPercent(3, Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Mínimo p/ ganhar prêmio</label>
              <input className="input" type="number" step="0.1" min="0" max="5" value={met.min_score} onChange={(e) => setMet({ ...met, min_score: Number(e.target.value) })} />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button onClick={salvar} disabled={saving} className="btn btn-primary disabled:opacity-50">{saving ? <Spinner size={14} /> : 'Salvar metodologia'}</button>
            {isCustom && <button onClick={resetParaPadrao} className="btn btn-ghost text-xs">Restaurar padrão Innova</button>}
          </div>
        </>
      )}
    </div>
  );
}
