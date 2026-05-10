import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase, logAudit, type IparItem, type Company } from '@innova/supabase';
import { Spinner, useToast, useConfirm } from '@innova/ui';

interface Row extends IparItem { companies?: { trade_name: string | null; legal_name: string } }

export function IPAR() {
  const [list, setList] = useState<Row[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<IparItem | null>(null);
  const [filterCompany, setFilterCompany] = useState('');
  const toast = useToast();
  const confirm = useConfirm();

  async function load() {
    setLoading(true);
    const sb = getSupabase();
    const [iparRes, compRes] = await Promise.all([
      sb.from('ipar_items').select('*, companies(trade_name, legal_name)').order('created_at', { ascending: false }),
      sb.from('companies').select('*').order('legal_name'),
    ]);
    setList((iparRes.data as Row[]) || []);
    setCompanies((compRes.data as Company[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = filterCompany ? list.filter((i) => i.company_id === filterCompany) : list;

  async function handleDelete(item: IparItem) {
    const ok = await confirm({ title: 'Excluir item do IPAR?', description: item.perigo, variant: 'danger', confirmLabel: 'Excluir' });
    if (!ok) return;
    const sb = getSupabase();
    const { error } = await sb.from('ipar_items').delete().eq('id', item.id);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({ action: 'ipar_delete', resource_type: 'ipar_item', resource_id: item.id });
    toast('Item removido', 'ok');
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">IPAR</h1>
          <p className="text-sm text-ink-700 mt-1">Identificação de Perigos e Avaliação de Riscos · {filtered.length} itens</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary">+ Adicionar perigo</button>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-4">
          <select className="input max-w-sm" value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
            <option value="">Todas as empresas</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-500">Nenhum perigo cadastrado. Adicione o primeiro.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Empresa</th><th>Setor</th><th>Perigo</th><th className="text-center">P</th><th className="text-center">S</th><th className="text-center">NR</th><th>Classif.</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const nr = (i.probabilidade || 0) * (i.severidade || 0);
                const cls = nr >= 20 ? { label: 'Crítico', cls: 'pill-danger' }
                  : nr >= 15 ? { label: 'Alto', cls: 'pill-warn' }
                  : nr >= 8 ? { label: 'Médio', cls: 'pill-warn' }
                  : nr >= 4 ? { label: 'Baixo', cls: 'pill-ok' }
                  : { label: 'Trivial', cls: 'pill-gray' };
                return (
                  <tr key={i.id}>
                    <td className="text-xs">{i.companies?.trade_name || i.companies?.legal_name || '—'}</td>
                    <td className="text-xs">{i.setor}</td>
                    <td>
                      <div className="font-bold">{i.perigo}</div>
                      <div className="text-[11px] text-ink-500">{i.dano || '—'}</div>
                    </td>
                    <td className="text-center font-bold">{i.probabilidade ?? '—'}</td>
                    <td className="text-center font-bold">{i.severidade ?? '—'}</td>
                    <td className="text-center font-bold">{nr || '—'}</td>
                    <td><span className={`pill ${cls.cls}`}>{cls.label}</span></td>
                    <td>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditing(i); setShowForm(true); }} className="text-xs font-bold text-accent-600">Editar</button>
                        <button onClick={() => handleDelete(i)} className="text-xs font-bold text-danger">Excluir</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <IparForm initial={editing} companies={companies} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}

function IparForm({ initial, companies, onClose, onSaved }: { initial: IparItem | null; companies: Company[]; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    company_id: initial?.company_id || (companies[0]?.id || ''),
    setor: initial?.setor || '',
    atividade: initial?.atividade || '',
    perigo: initial?.perigo || '',
    dano: initial?.dano || '',
    probabilidade: initial?.probabilidade?.toString() || '3',
    severidade: initial?.severidade?.toString() || '3',
    nr_aplicavel: initial?.nr_aplicavel || '',
    controles_existentes: initial?.controles_existentes || '',
    controles_recomendados: initial?.controles_recomendados || '',
    responsavel: initial?.responsavel || '',
    prazo: initial?.prazo || '',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const sb = getSupabase();
    const payload = {
      ...form,
      probabilidade: Number(form.probabilidade),
      severidade: Number(form.severidade),
    };
    let error;
    if (isEdit) {
      ({ error } = await sb.from('ipar_items').update(payload).eq('id', initial!.id));
    } else {
      ({ error } = await sb.from('ipar_items').insert(payload));
    }
    setSaving(false);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({ action: isEdit ? 'ipar_update' : 'ipar_create', resource_type: 'ipar_item', resource_id: initial?.id, meta: { perigo: form.perigo } });
    toast(isEdit ? 'Atualizado' : 'Criado', 'ok');
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-4xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-2xl">{isEdit ? 'Editar perigo' : 'Adicionar perigo'}</h3>
            <button onClick={onClose} className="text-ink-500">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Empresa *</label>
                <select required className="input" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Setor *</label>
                <input required className="input" value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} placeholder="Atendimento" />
              </div>
            </div>
            <div>
              <label className="label">Atividade *</label>
              <input required className="input" value={form.atividade} onChange={(e) => setForm({ ...form, atividade: e.target.value })} placeholder="Atendimento ao cliente final" />
            </div>
            <div>
              <label className="label">Perigo *</label>
              <input required className="input" value={form.perigo} onChange={(e) => setForm({ ...form, perigo: e.target.value })} placeholder="Pressão por metas" />
            </div>
            <div>
              <label className="label">Dano possível</label>
              <input className="input" value={form.dano} onChange={(e) => setForm({ ...form, dano: e.target.value })} placeholder="Burnout, ansiedade, fadiga" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Probabilidade (1-5)</label>
                <select className="input" value={form.probabilidade} onChange={(e) => setForm({ ...form, probabilidade: e.target.value })}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Severidade (1-5)</label>
                <select className="input" value={form.severidade} onChange={(e) => setForm({ ...form, severidade: e.target.value })}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="label">NR aplicável</label>
                <input className="input" value={form.nr_aplicavel} onChange={(e) => setForm({ ...form, nr_aplicavel: e.target.value })} placeholder="NR-1 / NR-17" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Controles existentes</label>
                <textarea className="input" rows={2} value={form.controles_existentes} onChange={(e) => setForm({ ...form, controles_existentes: e.target.value })} />
              </div>
              <div>
                <label className="label">Controles recomendados</label>
                <textarea className="input" rows={2} value={form.controles_recomendados} onChange={(e) => setForm({ ...form, controles_recomendados: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Responsável</label>
                <input className="input" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="RH / SST" />
              </div>
              <div>
                <label className="label">Prazo</label>
                <input className="input" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} placeholder="30 dias" />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
                {saving ? <Spinner size={16} /> : isEdit ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
