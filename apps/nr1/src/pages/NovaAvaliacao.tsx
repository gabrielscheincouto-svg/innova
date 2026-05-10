import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSupabase, logAudit, type Company } from '@innova/supabase';
import { Spinner, useToast } from '@innova/ui';

export function NovaAvaliacao() {
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_id: (loc.state as { company_id?: string })?.company_id || '',
    cycle: '2026.Q2',
    type: 'padrao' as 'inicial' | 'padrao' | 'pulse',
    expires_in_days: 14,
  });

  useEffect(() => {
    getSupabase().from('companies').select('*').order('legal_name').then(({ data }) => {
      setCompanies((data as Company[]) || []);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const sb = getSupabase();
    const expires_at = new Date(Date.now() + form.expires_in_days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await sb.from('assessments').insert({
      company_id: form.company_id,
      cycle: form.cycle,
      type: form.type,
      expires_at,
      status: 'coleta',
    }).select().single();

    setLoading(false);
    if (error || !data) {
      toast(error?.message || 'Erro ao criar avaliação', 'danger');
      return;
    }
    await logAudit({
      action: 'assessment_create',
      resource_type: 'assessment',
      resource_id: data.id,
      meta: { company_id: form.company_id, cycle: form.cycle },
    });
    const link = `${window.location.origin}/c/${data.token}`;
    navigator.clipboard.writeText(link).catch(() => {});
    toast('Avaliação criada · link copiado', 'ok');
    nav('/avaliacoes');
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <button onClick={() => nav(-1)} className="text-xs text-ink-500 font-semibold mb-1">← Voltar</button>
        <h1 className="font-display text-4xl">Lançar avaliação NR-1</h1>
        <p className="text-sm text-ink-700 mt-1">Cria avaliação e gera link único pra distribuir aos colaboradores</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="label">Cliente *</label>
          <select required className="input" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
            <option value="">— selecione —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Ciclo</label>
            <input className="input" value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value })} placeholder="2026.Q2" />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>
              <option value="inicial">Diagnóstico inicial completo</option>
              <option value="padrao">Diagnóstico padrão (COPSOQ II 41)</option>
              <option value="pulse">Pulse semestral</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Expira em (dias)</label>
          <select className="input max-w-xs" value={form.expires_in_days} onChange={(e) => setForm({ ...form, expires_in_days: Number(e.target.value) })}>
            <option value={7}>7 dias</option>
            <option value={14}>14 dias (padrão)</option>
            <option value={21}>21 dias</option>
            <option value={30}>30 dias</option>
          </select>
        </div>

        <div className="bg-accent-50 rounded-2xl p-4 text-xs text-ink-700 flex gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6364E0" strokeWidth="2" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>Após criar, o sistema gera um <strong>token único</strong> e copia o link <code>nr1.app/c/&lt;token&gt;</code> automaticamente. Distribua por e-mail ou WhatsApp aos colaboradores.</span>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={() => nav(-1)} className="btn btn-ghost">Cancelar</button>
          <button type="submit" disabled={loading || !form.company_id} className="btn btn-primary flex-1 justify-center disabled:opacity-50">
            {loading ? <Spinner size={16} /> : 'Criar e gerar link'}
          </button>
        </div>
      </form>
    </div>
  );
}
