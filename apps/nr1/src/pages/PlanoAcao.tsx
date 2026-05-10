import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase, logAudit, type ActionItem, type Company } from '@innova/supabase';
import { Spinner, useToast } from '@innova/ui';

interface Row extends ActionItem { companies?: { trade_name: string | null; legal_name: string } }

export function PlanoAcao() {
  const [list, setList] = useState<Row[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();

  async function load() {
    setLoading(true);
    const sb = getSupabase();
    const [aRes, cRes] = await Promise.all([
      sb.from('action_plan').select('*, companies(trade_name, legal_name)').order('prazo'),
      sb.from('companies').select('*').order('legal_name'),
    ]);
    setList((aRes.data as Row[]) || []);
    setCompanies((cRes.data as Company[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: ActionItem['status']) {
    const sb = getSupabase();
    const { error } = await sb.from('action_plan').update({ status }).eq('id', id);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({ action: 'action_status_change', resource_type: 'action_plan', resource_id: id, meta: { status } });
    toast('Status atualizado', 'ok');
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Plano de Ação</h1>
          <p className="text-sm text-ink-700 mt-1">{list.length} ações · {list.filter(a => a.status === 'concluida').length} concluídas</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Nova ação</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
        ) : list.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-500">Nenhuma ação registrada.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Empresa</th><th>Risco</th><th>Medida</th><th>Prioridade</th><th>Prazo</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="text-xs">{a.companies?.trade_name || a.companies?.legal_name || '—'}</td>
                  <td className="font-bold text-sm">{a.risco}</td>
                  <td className="text-xs">{a.medida}</td>
                  <td>{a.prioridade && <span className={`pill ${a.prioridade === 'alta' ? 'pill-danger' : a.prioridade === 'media' ? 'pill-warn' : 'pill-ok'}`}>{a.prioridade}</span>}</td>
                  <td className="text-xs">{a.prazo ? new Date(a.prazo).toLocaleDateString('pt-BR') : '—'}</td>
                  <td>
                    <select className="text-xs px-2 py-1 rounded-full border-0 bg-surface-muted font-bold cursor-pointer" value={a.status} onChange={(e) => updateStatus(a.id, e.target.value as ActionItem['status'])}>
                      <option value="planejada">Planejada</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="concluida">Concluída</option>
                      <option value="atrasada">Atrasada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && <ActionForm companies={companies} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function ActionForm({ companies, onClose, onSaved }: { companies: Company[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    company_id: companies[0]?.id || '',
    risco: '', medida: '',
    tipo: 'preventiva' as ActionItem['tipo'],
    prioridade: 'media' as ActionItem['prioridade'],
    responsavel: '', prazo: '',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const sb = getSupabase();
    const { error, data } = await sb.from('action_plan').insert(form).select().single();
    setSaving(false);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({ action: 'action_create', resource_type: 'action_plan', resource_id: data?.id, meta: { risco: form.risco } });
    toast('Ação criada', 'ok');
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-4xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-2xl">Nova ação</h3>
            <button onClick={onClose} className="text-ink-500">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Empresa *</label>
              <select required className="input" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Risco *</label>
              <input required className="input" value={form.risco} onChange={(e) => setForm({ ...form, risco: e.target.value })} placeholder="Pressão por metas" />
            </div>
            <div>
              <label className="label">Medida de prevenção *</label>
              <textarea required className="input" rows={3} value={form.medida} onChange={(e) => setForm({ ...form, medida: e.target.value })} placeholder="Revisão de metas + programa de saúde mental" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.tipo || ''} onChange={(e) => setForm({ ...form, tipo: e.target.value as ActionItem['tipo'] })}>
                  <option value="preventiva">Preventiva</option>
                  <option value="corretiva">Corretiva</option>
                  <option value="emergencial">Emergencial</option>
                  <option value="melhoria">Melhoria</option>
                </select>
              </div>
              <div>
                <label className="label">Prioridade</label>
                <select className="input" value={form.prioridade || ''} onChange={(e) => setForm({ ...form, prioridade: e.target.value as ActionItem['prioridade'] })}>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
              <div>
                <label className="label">Prazo</label>
                <input type="date" className="input" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Responsável</label>
              <input className="input" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
                {saving ? <Spinner size={16} /> : 'Criar ação'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
